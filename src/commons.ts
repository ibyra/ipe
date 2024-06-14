/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />

declare global {
  interface HTMLElementEventMap {
    toggle: ToggleEvent;
    beforetoggle: ToggleEvent;
  }
  interface ElementInternals {
    states: Pick<
      Set<string>,
      | 'size'
      | 'add'
      | 'clear'
      | 'delete'
      | 'entries'
      | 'forEach'
      | 'has'
      | 'keys'
      | 'values'
    >;
  }
}

export interface EqualityComparison<T = unknown> {
  (value: T, old: T): boolean;
}

/**
 * Creates a HTMLTemplateElement instance with contents equal to the string.
 *
 * @param strings The string parts of the template string
 * @param values The substitution values
 */
export function html(
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<unknown>
): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = String.raw(strings, values);
  return template;
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

  /**
   * Resets the state of the option.
   */
  reset(): void;
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
  buttons: Array<HTMLButton>;
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

export type Alignment = 'start' | 'end';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export type AlignedPlacement = `${Side}-${Alignment}`;

export type Placement = Side | AlignedPlacement | 'auto';

/**
 * Returns `true` if the value is a boolean, `false` otherwise.
 * @param value
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Returns `true` if the value is a string, `false` otherwise.
 * @param value
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Returns `true` if the value is a number, `false` otherwise.
 * @param value
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Returns `true` if the value is a finite number, `false` otherwise.
 * @param value
 */
export function isFinite(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

/**
 * Tries to parse the value as a decimal. Otherwise, returns the default value.
 * @param value
 * @param defaultValue
 */
export function asDecimal(value: unknown, defaultValue = 0): number {
  const decimal = Number(value);
  if (Number.isNaN(decimal)) return defaultValue;
  if (!Number.isFinite(decimal)) return defaultValue;
  return decimal;
}

/**
 * Returns `true` if the value is a integer number, `false` otherwise.
 * @param value
 */
export function isInteger(value: unknown): value is number {
  return isFinite(value) && Number.isInteger(value);
}

/**
 * Tries to parse the value as a integer. Otherwise, returns the default value.
 * @param value
 * @param defaultValue
 */
export function asInt(value: unknown, defaultValue = 0): number {
  const int = Number(value);
  if (Number.isNaN(int)) return defaultValue;
  if (!Number.isFinite(int)) return defaultValue;
  if (!Number.isInteger(int)) return Math.trunc(int);
  return int;
}

/**
 * Returns `true` if the value is a non-null object, `false` otherwise.
 * @param value
 */
export function isObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value != null;
}

/**
 * Returns `true` if the value is a iterable, `false` otherwise.
 * @param value
 */
export function isIterableObject(
  value: unknown,
): value is Record<PropertyKey, unknown> & Iterable<unknown> {
  return (
    isObject(value) &&
    Symbol.iterator in value &&
    typeof value[Symbol.iterator] === 'function'
  );
}

export function asArrayOf<T>(
  cast: (value: unknown) => T,
): (value: unknown) => Array<T> {
  return (value) => {
    if (!isIterableObject(value)) return [];
    return Array.from(value, cast);
  };
}

/**
 * Returns `true` if the value is an Element, `false` otherwise.
 * @param value
 */
export function isElement(value: unknown): value is Element {
  return isObject(value) && value instanceof Element;
}

/**
 * Returns `true` if the value is an Element, `false` otherwise.
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return isObject(value) && value instanceof HTMLElement;
}

/**
 * Returns `true` if the value is an HTML button element, `false` otherwise.
 * @param value
 */
export function isHTMLButton(value: unknown): value is HTMLButton {
  return (
    isObject(value) &&
    (value instanceof HTMLButtonElement ||
      (value instanceof HTMLInputElement &&
        (value.type === 'button' ||
          value.type === 'submit' ||
          value.type === 'reset')))
  );
}

/**
 * Returns `true` if the value is an HTML option, `false` otherwise.
 * @param value
 */
export function isHTMLOption(value: unknown): value is HTMLOption {
  return (
    isHTMLElement(value) &&
    'selected' in value &&
    'disabled' in value &&
    'toggle' in value &&
    'select' in value &&
    'deselect' in value &&
    typeof value.toggle === 'function' &&
    typeof value.select === 'function' &&
    typeof value.deselect === 'function'
  );
}

/**
 * Returns `true` if the value is an HTML valued option, `false` otherwise.
 * @param value
 */
export function isHTMLValueOption(value: unknown): value is HTMLValueOption {
  return (
    isHTMLOption(value) &&
    'value' in value &&
    'defaultValue' in value &&
    'defaultSelected' in value &&
    'reset' in value &&
    typeof value.reset === 'function'
  );
}

/**
 * Returns `true` if the value is an HTML option list, `false` otherwise.
 * @param value
 */
export function isHTMLOptlist(value: unknown): value is HTMLOptlist {
  return (
    isHTMLElement(value) &&
    'disabled' in value &&
    'multiple' in value &&
    'required' in value &&
    'options' in value &&
    'selectedOption' in value &&
    'selectedOptions' in value &&
    'toggle' in value &&
    'select' in value &&
    'deselect' in value &&
    'first' in value &&
    'last' in value &&
    'next' in value &&
    'previous' in value &&
    typeof value.toggle === 'function' &&
    typeof value.select === 'function' &&
    typeof value.deselect === 'function' &&
    typeof value.first === 'function' &&
    typeof value.last === 'function' &&
    typeof value.next === 'function' &&
    typeof value.previous === 'function'
  );
}

export function getSelectedOptions<T extends HTMLOption>(
  options: ReadonlyArray<T>,
): Array<T> {
  const selected = options.filter((o) => !o.disabled && o.selected);
  return selected;
}

export function getFirstOption<T extends HTMLOption>(
  options: ReadonlyArray<T>,
): T | null {
  return options.find((option) => !option.disabled) ?? null;
}

export function getLastOption<T extends HTMLOption>(
  options: ReadonlyArray<T>,
): T | null {
  return options.findLast((o) => !o.disabled) ?? null;
}

export function nextOptionOf<T extends HTMLOption>(
  options: ReadonlyArray<T>,
  option: T,
): T {
  const index = options.indexOf(option);
  if (index === -1) return option;
  for (let i = index + 1; i < options.length; i++) {
    const next = options[i];
    if (next != null && !next.disabled) return next;
  }
  return option;
}

export function previousOptionOf<T extends HTMLOption>(
  options: ReadonlyArray<T>,
  option: T,
): T {
  const index = options.indexOf(option);
  if (index === -1) return option;
  for (let i = index - 1; i >= 0; i--) {
    const previous = options[i];
    if (previous != null && !previous.disabled) return previous;
  }
  return option;
}

export function getOptionsValues<T extends HTMLValueOption>(
  options: ReadonlyArray<T>,
): Array<string> {
  const selected = options.map((o) => o.value);
  return selected;
}

/**
 * Returns `true` if the value is an HTML openable, `false` otherwise.
 * @param value
 */
export function isHTMLOpenable(value: unknown): value is HTMLOpenable {
  return isHTMLElement(value) && 'open' in value;
}

/**
 * Returns `true` if the value is an HTML disclosure, `false` otherwise.
 * @param value
 */
export function isHTMLDisclosure(value: unknown): value is HTMLDisclosure {
  return isHTMLOption(value) && isHTMLOpenable(value) && 'buttons' in value;
}

/**
 * Returns `true` if the value is an HTML control, `false` otherwise.
 * @param value
 */
export function isHTMLFormControl(value: unknown): value is HTMLFormControl {
  return (
    (isObject(value) &&
      (value instanceof HTMLInputElement ||
        value instanceof HTMLSelectElement ||
        value instanceof HTMLTextAreaElement ||
        value instanceof HTMLButtonElement)) ||
    (isHTMLElement(value) &&
      'form' in value &&
      'labels' in value &&
      'willValidate' in value &&
      'validationMessage' in value &&
      'validity' in value &&
      'checkValidity' in value &&
      'reportValidity' in value &&
      'setCustomValidity' in value &&
      typeof value.checkValidity === 'function' &&
      typeof value.reportValidity === 'function' &&
      typeof value.setCustomValidity === 'function')
  );
}

export function getErrorMessageElement(
  element: Element | null,
): HTMLElement | null {
  if (element == null) return null;
  const id = element.getAttribute('aria-errormessage');
  if (id == null || id === '') return null;
  const errormessage = element.ownerDocument.querySelector(`#${id}`);
  if (errormessage == null) return null;
  if (!(errormessage instanceof HTMLElement)) return null;
  return errormessage;
}

export function isChecked(value: unknown): value is Checked {
  return value === 'true' || value === 'false' || value === 'mixed';
}

export function asChecked(
  value: unknown,
  defaultValue: Checked = 'false',
): Checked {
  if (isChecked(value)) return value;
  if (isBoolean(value)) return `${value}`;
  return defaultValue;
}

export function isAlignment(value: unknown): value is Alignment {
  return value === 'start' || value === 'end';
}

export function asAlignment(
  value: unknown,
  defaultValue: Alignment = 'start',
): Alignment {
  return isAlignment(value) ? value : defaultValue;
}

export function isSide(value: unknown): value is Side {
  return (
    value === 'top' ||
    value === 'right' ||
    value === 'bottom' ||
    value === 'left'
  );
}

export function asSide(value: unknown, defaultValue: Side = 'top'): Side {
  return isSide(value) ? value : defaultValue;
}

export function isAlignedPlacement(value: unknown): value is AlignedPlacement {
  return (
    value === 'top-start' ||
    value === 'top-end' ||
    value === 'right-start' ||
    value === 'right-end' ||
    value === 'bottom-start' ||
    value === 'bottom-end' ||
    value === 'left-start' ||
    value === 'left-end'
  );
}

export function asAlignedPlacement(
  value: unknown,
  defaultValue: AlignedPlacement = 'top-start',
): AlignedPlacement {
  return isAlignedPlacement(value) ? value : defaultValue;
}

export function isPlacement(value: unknown): value is Placement {
  return value === 'auto' || isSide(value) || isAlignedPlacement(value);
}

export function asPlacement(
  value: unknown,
  defaultValue: Placement = 'auto',
): Placement {
  return isPlacement(value) ? value : defaultValue;
}
