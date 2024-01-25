import type { PropertyDeclarations, PropertyValues } from 'lit';
import {
  type HTMLFormControl,
  BoolAttributeConverter,
  StringAttributeConverter,
} from './commons';
import { IpeElement } from './ipe-element';

export type FormValidity = {
  flags: ValidityStateFlags;
  messages: Partial<Record<keyof ValidityStateFlags, string>>;
  anchor: HTMLElement | undefined;
};

/**
 * Represents a base form component that all other Ipe elements can extend.
 */
export abstract class IpeElementForm
  extends IpeElement
  implements HTMLFormControl
{
  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    disabled: {
      reflect: true,
      attribute: 'disabled',
      converter: new BoolAttributeConverter(),
    },
    readOnly: {
      reflect: true,
      attribute: 'readonly',
      converter: new BoolAttributeConverter(),
    },
    required: {
      reflect: true,
      attribute: 'required',
      converter: new BoolAttributeConverter(),
    },
  };

  public declare disabled: boolean;
  public declare readOnly: boolean;
  public declare required: boolean;

  protected declare _defaultDisabled: boolean;
  protected declare _defaultReadOnly: boolean;
  protected declare _defaultRequired: boolean;
  protected declare _inputTimerID: number | null;
  protected declare _changeTimerID: number | null;
  protected declare _customError: string;
  protected declare _userInteracted: boolean;
  protected declare _internals: ElementInternals;
  protected declare _formState: FormData;

  constructor() {
    super();
    this.disabled = false;
    this.readOnly = false;
    this.required = false;
    this._defaultDisabled = false;
    this._defaultReadOnly = false;
    this._defaultRequired = false;
    this._inputTimerID = null;
    this._changeTimerID = null;
    this._customError = '';
    this._userInteracted = false;
    this._internals = this.attachInternals();
    this._formState = new FormData();
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

  override connectedCallback(): void {
    super.connectedCallback();
    this._defaultDisabled = this.disabled;
    this._defaultReadOnly = this.readOnly;
    this._defaultRequired = this.required;
    this.addEventListener('invalid', this.handleInvalid);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('invalid', this.handleInvalid);
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
    this.disabled = disabled;
  }

  /**
   * Called when the form is reset.
   */
  formResetCallback(): void {
    this._userInteracted = false;
    this._internals.ariaInvalid = 'false';
    this.ariaInvalid = 'false';
    this.resetForm();
    this.saveForm();
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
  formStateRestoreCallback(
    state: File | string | FormData | null,
    mode: 'restore' | 'autocomplete',
  ): void {
    console.info(this, mode, state);
    if (mode !== 'restore') return;
    if (!(state instanceof FormData)) return;
    this.restoreForm(state);
  }

  /**
   * The form value of this element that will be submitted.
   */
  protected abstract get _formValue(): FormData | null;

  /**
   * The properties that triggers the element to save the form.
   */
  protected get _formProps(): Array<keyof this> {
    return ['disabled', 'readOnly', 'required'];
  }

  /**
   * Returns an `FormValidity` of the element.
   */
  protected get _formValidity(): FormValidity {
    return {
      flags: {
        customError: this._customError.length > 0,
      },
      messages: {
        customError: this._customError,
      },
      anchor: undefined,
    };
  }

  /**
   * Resets the element to the default values.
   */
  protected resetForm() {
    this.disabled = this._defaultDisabled;
    this.readOnly = this._defaultReadOnly;
    this.required = this._defaultRequired;
  }

  /**
   * Stores the state of the element from the form.
   */
  protected restoreForm(state: FormData) {
    this._userInteracted = true;
    if (state.has('disabled')) {
      const entry = state.get('disabled')!;
      this.disabled = entry === 'true';
    }
    if (state.has('readOnly')) {
      const entry = state.get('readOnly')!;
      this.readOnly = entry === 'true';
    }
    if (state.has('required')) {
      const entry = state.get('required')!;
      this.required = entry === 'true';
    }
  }

  /**
   * Stores the value and the state of the element into the form. If the element
   * is disabled, no value or state is stored. If the element was not
   * user-interacted, no state is stored.
   */
  protected saveForm(): void {
    if (this._internals.form == null) return;
    if (this.disabled) {
      this._internals.setFormValue(null, null);
      return;
    }
    const state = this._userInteracted ? this._formState : null;
    const value = this._formValue;
    this._internals.setFormValue(value, state);
    this.saveFormValidity();
  }

  /**
   * Stores the validity of the element in the form.
   * @see {getFormValidity}
   */
  protected saveFormValidity(): void {
    const { flags, messages, anchor } = this._formValidity;
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
      this._internals.setValidity({}, '', anchor);
      this._internals.ariaInvalid = 'false';
      this.ariaInvalid = 'false';
      return;
    }
    const message = messages[key] ?? 'Invalid';
    this._internals.setValidity(flags, message, anchor);
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

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('disabled')) this.disabledUpdated();
    if (props.has('readOnly')) this.readOnlyUpdated();
    if (props.has('required')) this.requiredUpdated();
    const formPropNames = this._formProps;
    const changedPropNames = Array.from(props.keys());
    if (formPropNames.some((name) => changedPropNames.includes(name))) {
      this.saveForm();
    }
    return super.updated(props);
  }

  protected disabledUpdated(): void {
    const disabled = this.disabled ? 'true' : 'false';
    this._formState.set('disabled', disabled);
    this._internals.ariaDisabled = disabled;
    this.ariaDisabled = disabled;
  }

  protected readOnlyUpdated(): void {
    const readOnly = this.readOnly ? 'true' : 'false';
    this._formState.set('readOnly', readOnly);
    this._internals.ariaReadOnly = readOnly;
    this.ariaReadOnly = readOnly;
  }

  protected requiredUpdated(): void {
    const required = this.required ? 'true' : 'false';
    this._formState.set('required', required);
    this._internals.ariaRequired = required;
    this.ariaRequired = required;
  }

  protected handleInvalid(): void {
    this._internals.ariaInvalid = 'true';
    this.ariaInvalid = 'true';
  }
}

/**
 * Represents a base single-valued form component with that all other Ipe
 * elements can extend.
 */
export abstract class IpeElementFormSingleValue extends IpeElementForm {
  static override properties: PropertyDeclarations = {
    ...super.properties,
    name: {
      reflect: true,
      attribute: 'name',
      converter: new StringAttributeConverter(),
    },
    autocomplete: {
      reflect: true,
      attribute: 'autocomplete',
      converter: new StringAttributeConverter(),
    },
  };

  public declare name: string;
  public declare autocomplete: AutoFill;

  protected declare _defaultName: string;
  protected declare _defaultAutocomplete: AutoFill;

  constructor() {
    super();
    this.name = '';
    this.autocomplete = '';
    this._defaultName = '';
    this._defaultAutocomplete = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._defaultName = this.name;
    this._defaultAutocomplete = this.autocomplete;
  }

  protected override get _formProps(): Array<keyof this> {
    return [...super._formProps, 'name', 'autocomplete'];
  }

  protected override resetForm(): void {
    super.resetForm();
    this.name = this._defaultName;
    this.autocomplete = this._defaultAutocomplete;
  }

  protected override restoreForm(state: FormData): void {
    super.restoreForm(state);
    if (state.has('name')) {
      this.name = String(state.get('name'));
    }
    if (state.has('autocomplete')) {
      this.autocomplete = String(state.get('autocomplete')) as AutoFill;
    }
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('name')) this.nameUpdated();
    if (props.has('autocomplete')) this.autocompleteUpdated();
    return super.updated(props);
  }

  protected nameUpdated(): void {
    this._formState.set('name', this.name);
  }

  protected autocompleteUpdated(): void {
    this._formState.set('autocomplete', this.autocomplete);
  }
}
