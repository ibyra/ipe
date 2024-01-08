import { BooleanAttr, StringAttr } from './attributes';
import { isBoolean, isString } from './commons';
import type { HTMLFormControl } from './dom';
import { BooleanFData, StringFData } from './formdata';
import { IpeElement } from './ipe-element';

export type FormValidity = {
  flags: ValidityStateFlags;
  messages: Partial<Record<keyof ValidityStateFlags, string>>;
};

/**
 * Represents a base form component that all other Ipe elements can extend.
 */
export abstract class IpeElementForm
  extends IpeElement
  implements HTMLFormControl
{
  protected _disabledAttr = new BooleanAttr(this, 'disabled', false);
  protected _disabled = false;

  protected _readOnlyAttr = new BooleanAttr(this, 'readonly', false);
  protected _readOnlyFData = new BooleanFData('readonly', false);
  protected _readOnly = false;

  protected _requiredAttr = new BooleanAttr(this, 'required', false);
  protected _requiredFData = new BooleanFData('required', false);
  protected _required = false;

  protected _dirty = false;

  protected _userInteracted = false;

  protected _inputTimerID: number | null = null;

  protected _changeTimerID: number | null = null;

  protected _customError = '';

  protected _internals = this.attachInternals();

  get form(): HTMLFormElement | null {
    return this._internals.form;
  }

  get labels(): NodeList {
    return this._internals.labels;
  }

  get validity(): ValidityState {
    return this._internals.validity;
  }

  get validationMessage(): string {
    return this._internals.validationMessage;
  }

  get willValidate(): boolean {
    return this._internals.willValidate;
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeDisabled(value)) return;
    this.saveFormValue();
  }

  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeReadOnly(value)) return;
    this.saveFormValue();
  }

  get required(): boolean {
    return this._required;
  }
  set required(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeRequired(value)) return;
    this.saveFormValue();
  }

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  setCustomValidity(message = ''): void {
    this._customError = message;
    this.saveFormValidity();
  }

  protected override initProperties(): void {
    super.initProperties();
    this.changeDisabled(this._disabledAttr.get());
    this.changeReadOnly(this._readOnlyAttr.get());
    this.changeRequired(this._requiredAttr.get());
  }

  /**
   * This callback is called during `formResetCallback`. It should be extended
   * to set the values of the properties when an form reset happens.
   */
  protected resetProperties(): void {
    return;
  }

  protected override holdListeners(): void {
    super.holdListeners();
    this.addEventListener('invalid', this.handleInvalid);
  }

  protected override releaseListeners(): void {
    super.releaseListeners();
    this.removeEventListener('invalid', this.handleInvalid);
  }

  protected override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === this._disabledAttr.name) {
      if (!this.changeDisabled(this._disabledAttr.from(newValue))) return;
      this.saveFormValue();
      return;
    }
    if (name === this._readOnlyAttr.name) {
      if (!this.changeReadOnly(this._readOnlyAttr.from(newValue))) return;
      this.saveFormValue();
      return;
    }
    if (name === this._requiredAttr.name) {
      if (!this.changeRequired(this._requiredAttr.from(newValue))) return;
      this.saveFormValue();
      return;
    }
  }

  /**
   * Called when both the user agent associates the element with and
   * disassociates the element from a form element.
   * @param form
   */
  protected formAssociatedCallback(form: HTMLFormElement | null): void {
    if (form == null) return;
    this.saveFormValue();
  }

  /**
   * Called whenever the disabled state on the element changes by itself or by
   * an ancestor field/associated form.
   * @param disabled
   * @returns
   */
  protected formDisabledCallback(disabled: boolean): void {
    if (!this.changeDisabled(disabled)) return;
    this.saveFormValue();
  }

  /**
   * Called when the form is reset.
   */
  protected formResetCallback(): void {
    this._internals.ariaInvalid = 'false';
    this.ariaInvalid = 'false';
    this._userInteracted = false;
    this.resetProperties();
    this.saveFormValue();
    return;
  }

  /**
   * Called when the user agent automatically fills out your form element in two
   * scenarios: the first is that the user agent can restore the state of an
   * element after navigating or restarting, and the second is that an input was
   * made using a form auto-filling feature.
   *
   * To restore the state of the element, implement the `setFormState`.
   *
   * @param state the internal state of the element
   * @param mode the mode of the restoration
   */
  protected formStateRestoreCallback(
    state: File | string | FormData | null,
    mode: 'restore' | 'autocomplete',
  ): void {
    console.info(this, mode, state);
    if (mode !== 'restore') return;
    if (!(state instanceof FormData)) return;
    this.setFormState(state);
    this.saveFormValue();
  }

  /**
   * Stores the value and the state of the element into the form. If the element
   * is disabled, no value or state is stored. If the element was not
   * user-interacted, no state is stored.
   *
   * @see {getFormValue}
   * @see {getFormState}
   */
  protected saveFormValue(): void {
    if (this._internals.form == null) return;
    if (this._disabled) {
      this._internals.setFormValue(null, null);
      return;
    }
    if (this._userInteracted) {
      const state = this.getFormState();
      const value = this.getFormValue();
      this._internals.setFormValue(value, state);
      this.saveFormValidity();
      return;
    }
    const value = this.getFormValue();
    this._internals.setFormValue(value, null);
    this.saveFormValidity();
  }

  /**
   * Stores the validity of the element in the form.
   * @see {getFormValidity}
   */
  protected saveFormValidity(): void {
    const { flags, messages } = this.getFormValidity();
    const keys: Array<keyof ValidityStateFlags> = [
      'customError',
      'valueMissing',
      'typeMismatch',
      'patternMismatch',
      'rangeOverflow',
      'rangeUnderflow',
      'stepMismatch',
      'tooLong',
      'tooShort',
      'badInput',
    ];
    const key = keys.find((key) => key in flags && flags[key] === true);
    if (key == null) {
      this._internals.setValidity({}, '');
      this._internals.ariaInvalid = 'false';
      this.ariaInvalid = 'false';
      return;
    }
    const message = messages[key] ?? 'Invalid';
    this._internals.setValidity(flags, message);
    this._internals.ariaInvalid = this._userInteracted ? 'true' : 'false';
    this.ariaInvalid = this._userInteracted ? 'true' : 'false';
  }

  /**
   * Returns an `FormValidity` of the element.
   */
  protected getFormValidity(): FormValidity {
    const flags = {
      customError: this._customError.length > 0,
    };
    const messages = {
      customError: this._customError,
    };
    return { flags, messages };
  }

  /**
   * Returns the form value of this element.
   */
  protected getFormValue(): FormData | null {
    return null;
  }

  /**
   * Returns the form state of this element.
   */
  protected getFormState(): FormData {
    const state = new FormData();
    this._readOnlyFData.set(state, this._readOnly);
    this._requiredFData.set(state, this._required);
    return state;
  }

  /**
   * Sets the properties of this element with the given state.
   */
  protected setFormState(state: FormData): void {
    this.changeReadOnly(this._readOnlyFData.get(state));
    this.changeRequired(this._requiredFData.get(state));
    return;
  }

  /**
   * Dispatches an `input` event in a new event loop task.
   */
  protected notifyInput(): void {
    if (this._inputTimerID != null) window.clearTimeout(this._inputTimerID);
    this._inputTimerID = window.setTimeout(() => {
      this._inputTimerID = null;
      const event = new Event('input', { bubbles: true, composed: true });
      this.dispatchEvent(event);
    }, 0);
  }

  /**
   * Dispatches an `change` event in a new event loop task.
   */
  protected notifyChange(): void {
    if (this._changeTimerID != null) window.clearTimeout(this._changeTimerID);
    this._changeTimerID = window.setTimeout(() => {
      this._changeTimerID = null;
      const event = new Event('change', { bubbles: true });
      this.dispatchEvent(event);
    }, 0);
  }

  protected changeDisabled(newValue: boolean): boolean {
    const oldValue = this._disabled;
    if (newValue === oldValue) return false;
    this._disabled = newValue;
    this._disabledAttr.set(newValue);
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
    this.ariaDisabled = newValue ? 'true' : 'false';
    return true;
  }

  protected changeReadOnly(newValue: boolean): boolean {
    const oldValue = this._readOnly;
    if (newValue === oldValue) return false;
    this._readOnly = newValue;
    this._readOnlyAttr.set(newValue);
    this._internals.ariaReadOnly = newValue ? 'true' : 'false';
    this.ariaReadOnly = newValue ? 'true' : 'false';
    return true;
  }

  protected changeRequired(newValue: boolean): boolean {
    const oldValue = this._required;
    if (newValue === oldValue) return false;
    this._required = newValue;
    this._requiredAttr.set(newValue);
    this._internals.ariaRequired = newValue ? 'true' : 'false';
    this.ariaRequired = newValue ? 'true' : 'false';
    return true;
  }

  protected handleInvalid(): void {
    this._internals.ariaInvalid = 'true';
    this.ariaInvalid = 'true';
  }

  static get formAssociated(): boolean {
    return true;
  }

  static override get observedAttributes(): Array<string> {
    return [...super.observedAttributes, 'disabled', 'readonly', 'required'];
  }
}

/**
 * Represents a base single-valued form component with that all other Ipe
 * elements can extend.
 */
export abstract class IpeElementFormSingleValue extends IpeElementForm {
  protected _nameFData = new StringFData('name', '');
  protected _nameAttr = new StringAttr(this, 'name', '');
  protected _name: string = '';

  protected _autocompleteFData = new StringFData('autocomplete', '');
  protected _autocompleteAttr = new StringAttr(this, 'autocomplete', '');
  protected _autocomplete: AutoFill = '';

  get name(): string {
    return this._name;
  }
  set name(value: string) {
    if (!isString(value)) return;
    if (!this.changeName(value)) return;
    this.saveFormValue();
  }

  get autocomplete(): AutoFill {
    return this._autocomplete;
  }
  set autocomplete(value: AutoFill) {
    // TODO: Add Autofill validation here.
    if (!isString(value)) return;
    if (!this.changeAutocomplete(value)) return;
    this.saveFormValue();
  }

  protected override initProperties(): void {
    super.initProperties();
    this.changeName(this._nameAttr.get());
    this.changeAutocomplete(this._autocompleteAttr.get());
  }

  protected override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === this._nameAttr.name) {
      const name = this._nameAttr.from(newValue);
      if (!this.changeName(name)) return;
      this.saveFormValue();
      return;
    }
    if (name === this._autocompleteAttr.name) {
      const autocomplete = this._autocompleteAttr.from(newValue);
      if (!this.changeAutocomplete(autocomplete)) return;
      this.saveFormValue();
      return;
    }
  }

  protected override getFormState(): FormData {
    const state = super.getFormState();
    this._nameFData.set(state, this._name);
    this._autocompleteFData.set(state, this._autocomplete);
    return state;
  }

  protected override setFormState(state: FormData): void {
    super.setFormState(state);
    this.changeName(this._nameFData.get(state));
    this.changeAutocomplete(this._autocompleteFData.get(state));
  }

  protected changeName(newValue: string): boolean {
    const oldValue = this._name;
    if (newValue === oldValue) return false;
    this._name = newValue;
    this._nameAttr.set(newValue);
    return true;
  }

  protected changeAutocomplete(newValue: string): boolean {
    const oldValue = this._autocomplete;
    if (newValue === oldValue) return false;
    this._autocomplete = newValue as AutoFill;
    this._autocompleteAttr.set(newValue);
    return true;
  }

  static override get observedAttributes(): Array<string> {
    return [...super.observedAttributes, 'name', 'autocomplete'];
  }
}
