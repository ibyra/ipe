/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />

declare global {
  interface HTMLElementEventMap {
    toggle: ToggleEvent;
    beforetoggle: ToggleEvent;
  }
}

export type HTMLButton = HTMLButtonElement | HTMLInputElement;

/**
 * Represents an HTML element that can be selected as an option.
 */
export interface HTMLOption extends HTMLElement {
  /**
   * The selected state of the option.
   */
  selected: boolean;

  /**
   * The disabled state of the option.
   */
  disabled: boolean;

  /**
   * Toggles the selected state of the option.
   */
  toggle(): void;

  /**
   * Selects the option, if the option is not selected.
   **/
  select(): void;

  /**
   * Deselects the option, if the option is selected.
   */
  deselect(): void;
}

/**
 * Represents an HTML option that can have an value assigned to it.
 */
export interface HTMLValueOption extends HTMLOption {
  /**
   * The value of the option.
   */
  value: string;

  /**
   * The default value of the option.
   */
  defaultValue: string;

  /**
   * The default selection state of the option;
   */
  defaultSelected: boolean;
}

/**
 * Represents an HTML element that contains a list of options that can be
 * selected.
 */
export interface HTMLOptlist<T extends HTMLOption = HTMLOption>
  extends HTMLElement {
  /**
   * The disabled state of the option list.
   */
  disabled: boolean;

  /**
   * The multiple state of the option list. If `true`, multiple options can
   * be in the selected state at the same time. If `false`, only one option
   * can be in the selected state at the same time.
   */
  multiple: boolean;

  /**
   * The required state of the option list. If `true`, once a disclose happens,
   * the user will not be able to close all the elements.
   */
  required: boolean;

  /**
   * An array of references of the options of this list.
   */
  readonly options: Array<T>;

  /**
   * An array of references of the selected options of this list.
   */
  readonly selectedOptions: Array<T>;

  /**
   * A references to the selected option if there are one; or `null` if there
   * are no selected option.
   */
  readonly selectedOption: T | null;

  /**
   * Toggles the selection of the option.
   */
  toggle(option: T): void;

  /**
   * Selects the option if the option is in this list and not selected.
   **/
  select(option: T): void;

  /**
   * Deselects the option if the option is in this list and selected.
   */
  deselect(option: T): void;

  /**
   * Returns a reference to the first non-disabled option of this list; or
   * `null` otherwise.
   */
  first(): T | null;

  /**
   * Returns a reference to the last non-disabled option of this list; or
   * `null` otherwise.
   */
  last(): T | null;

  /**
   * Returns a reference to the next non-disabled option of:
   * - the active option, or;
   * - the first selected option, or;
   * - the first option of this list.
   */
  next(): T | null;

  /**
   * Returns a reference to the previous non-disabled option of:
   * - the active option, or;
   * - the last selected option, or;
   * - the last option of this list.
   */
  previous(): T | null;
}

/**
 * Represents an HTML element that can be opened.
 */
export interface HTMLOpenable extends HTMLElement {
  /**
   * The opened state of the element.
   */
  open: boolean;
}

/**
 * Represents an HTML element that can be selected as an option as it is open
 * or closed when interacting with one of the its summaries.
 */
export interface HTMLDisclosure extends HTMLOption, HTMLOpenable {
  /**
   * An array of references of all the summaries of this disclosure.
   */
  summaries: Array<Element>;
}

/**
 * Represents a HTML element that can be used as a control with a HTML form.
 */
export interface HTMLFormControl extends HTMLElement {
  /**
   * A reference for the form element, or `null` if no form is associated.
   */
  readonly form: HTMLFormElement | null;

  /**
   * Returns a NodeList of the <label> elements associated with the control.
   */
  readonly labels: NodeList;

  /**
   * Returns whether an element will successfully validate based on forms
   * validation rules and constraints.
   */
  readonly willValidate: boolean;

  /**
   * Returns the error message that would be displayed if the user submits the
   * form, or an empty string if no error message. It also triggers the standard
   * error message, such as "this is a required field". The result is that the
   * user sees validation messages without actually submitting.
   */
  readonly validationMessage: string;

  /**
   * Returns a `ValidityState` object that represents the validity states of an
   * element.
   */
  readonly validity: ValidityState;

  /**
   * Returns `true` if the control meets any constraint validation rules applied
   * to it. Upon returning `false`, this method will also dispatch an `invalid`
   * event. This method behaves in a similar way to `reportValidity`, however
   * it does not sends the value of `validationMessage` to the user agent for
   * display.
   *
   * @see {validationMessage}
   * @see {reportValidity}
   */
  checkValidity(): boolean;

  /**
   * Returns `true` if the control meets any constraint validation rules applied
   * to it. Upon returning `false`, this method will also dispatch an `invalid`
   * event. This method behaves in a similar way to `checkValidity`, however
   * it additionally sends the value of `validationMessage` to the user agent
   * for display.
   *
   * @see {validationMessage}
   * @see {checkValidity}
   */
  reportValidity(): boolean;

  /**
   * Sets a validity of the `customError` constraint. If an empty string is
   * given, `customError` is valid. Otherwise, the constraint is invalid and
   * the string is also set as `validationMessage`.
   *
   * @see {validationMessage}
   * @see {ValidityState.customError}
   *
   * @param errormessage the error message.
   */
  setCustomValidity(errormessage: string): void;
}

export type Checked = 'true' | 'false' | 'mixed';
