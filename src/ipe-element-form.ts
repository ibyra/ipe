import type { HTMLFormControl } from './dom';
import { IpeElement } from './ipe-element';
import {
  FormProperty,
  type FormHost,
  attributeParsers,
  formDataParsers,
  type FormProp,
  FormState,
} from './property';

export type FormValidity = {
  flags: ValidityStateFlags;
  messages: Partial<Record<keyof ValidityStateFlags, string>>;
};

/**
 * Represents a base form component that all other Ipe elements can extend.
 */
export abstract class IpeElementForm
  extends IpeElement
  implements HTMLFormControl, FormHost
{
  #formPropByName = new Map<string, FormProp<unknown>>();

  /**
   * The form state of this element that will be submitted.
   */
  public readonly formState = new FormState();

  /**
   * The form value of this element that will be submitted.
   */
  public abstract get formValue(): FormData | null;

  /**
   * Returns an `FormValidity` of the element.
   */
  public get formValidity(): FormValidity {
    const flags = {
      customError: this._customError.length > 0,
    };
    const messages = {
      customError: this._customError,
    };
    return { flags, messages };
  }

  protected _disabled = new FormProperty(this, {
    name: 'disabled',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
    form: formDataParsers.bool,
  });

  protected _readOnly = new FormProperty(this, {
    name: 'readonly',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
    form: formDataParsers.bool,
  });

  protected _required = new FormProperty(this, {
    name: 'required',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
    form: formDataParsers.bool,
  });

  protected _userInteracted = false;

  protected _inputTimerID: number | null = null;

  protected _changeTimerID: number | null = null;

  protected _customError = '';

  protected _internals = this.attachInternals();

  addFormProperty(property: FormProp<unknown>): void {
    this.#formPropByName.set(property.name, property);
  }

  removeFormProperty(property: FormProp<unknown>): void {
    this.#formPropByName.delete(property.name);
  }

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
    return this._disabled.value;
  }
  set disabled(value: boolean) {
    this._disabled.value = value;
  }

  get readOnly(): boolean {
    return this._readOnly.value;
  }
  set readOnly(value: boolean) {
    this._readOnly.value = value;
  }

  get required(): boolean {
    return this._required.value;
  }
  set required(value: boolean) {
    this._readOnly.value = value;
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

  /**
   * Stores the value and the state of the element into the form. If the element
   * is disabled, no value or state is stored. If the element was not
   * user-interacted, no state is stored.
   */
  saveForm(): void {
    if (this._internals.form == null) return;
    if (this._disabled.value) {
      this._internals.setFormValue(null, null);
      return;
    }
    if (this._userInteracted) {
      const state = this.formState.toFormData();
      const value = this.formValue;
      this._internals.setFormValue(value, state);
      this.saveFormValidity();
      return;
    }
    const value = this.formValue;
    this._internals.setFormValue(value, null);
    this.saveFormValidity();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('invalid', this.handleInvalid);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('invalid', this.handleInvalid);
  }

  override propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === this._disabled.name) {
      const curr = newValue as boolean;
      return this.disabledChanged(curr);
    }
    if (name === this._readOnly.name) {
      const curr = newValue as boolean;
      return this.readOnlyChanged(curr);
    }
    if (name === this._required.name) {
      const curr = newValue as boolean;
      return this.requiredChanged(curr);
    }
    super.propertyChanged(name, oldValue, newValue);
  }

  /**
   * Called when both the user agent associates the element with and
   * disassociates the element from a form element.
   * @param form
   */
  formAssociatedCallback(form: HTMLFormElement | null): void {
    if (form == null) return;
    this.saveForm();
  }

  /**
   * Called whenever the disabled state on the element changes by itself or by
   * an ancestor field/associated form.
   * @param disabled
   * @returns
   */
  formDisabledCallback(disabled: boolean): void {
    this._disabled.value = disabled;
    this.saveForm();
  }

  /**
   * Called when the form is reset.
   */
  formResetCallback(): void {
    this._internals.ariaInvalid = 'false';
    this.ariaInvalid = 'false';
    this._userInteracted = false;
    for (const formProperty of this.#formPropByName.values()) {
      formProperty.formReset();
    }
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
    this._userInteracted = true;
    for (const formProperty of this.#formPropByName.values()) {
      formProperty.formRestore(state);
    }
  }

  /**
   * Stores the validity of the element in the form.
   * @see {getFormValidity}
   */
  protected saveFormValidity(): void {
    const { flags, messages } = this.formValidity;
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

  protected disabledChanged(newValue: boolean): void {
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
    this.ariaDisabled = newValue ? 'true' : 'false';
  }

  protected readOnlyChanged(newValue: boolean): void {
    this._internals.ariaReadOnly = newValue ? 'true' : 'false';
    this.ariaReadOnly = newValue ? 'true' : 'false';
  }

  protected requiredChanged(newValue: boolean): void {
    this._internals.ariaRequired = newValue ? 'true' : 'false';
    this.ariaRequired = newValue ? 'true' : 'false';
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
  protected _name = new FormProperty(this, {
    name: 'name',
    value: '',
    cast: String,
    attribute: attributeParsers.str,
    form: formDataParsers.str,
  });

  protected _autocomplete = new FormProperty(this, {
    name: 'autocomplete',
    value: '',
    cast: String,
    attribute: attributeParsers.str,
    form: formDataParsers.str,
  });

  get name(): string {
    return this._name.value;
  }
  set name(value: string) {
    this._name.value = value;
  }

  get autocomplete(): AutoFill {
    return this._autocomplete.value as AutoFill;
  }
  set autocomplete(value: AutoFill) {
    this._autocomplete.value = value;
  }

  static override get observedAttributes(): Array<string> {
    return [...super.observedAttributes, 'name', 'autocomplete'];
  }
}
