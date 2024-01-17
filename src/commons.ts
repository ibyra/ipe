import type {
  Alignment,
  AlignedPlacement,
  Checked,
  HTMLButton,
  HTMLDisclosure,
  HTMLFormControl,
  HTMLOpenable,
  HTMLOption,
  HTMLOptlist,
  HTMLValueOption,
  Side,
  Placement,
} from './dom';

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

export function asDecimal(value: unknown): number {
  const decimal = Number(value);
  if (Number.isNaN(decimal)) return 0;
  if (!Number.isFinite(decimal)) return 0;
  return decimal;
}

/**
 * Returns `true` if the value is a integer number, `false` otherwise.
 * @param value
 */
export function isInteger(value: unknown): value is number {
  return isFinite(value) && Number.isInteger(value);
}

export function asInt(value: unknown): number {
  const int = Number(value);
  if (Number.isNaN(int)) return 0;
  if (!Number.isFinite(int)) return 0;
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
    'defaultSelected' in value
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
  return isHTMLOption(value) && isHTMLOpenable(value) && 'summaries' in value;
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

export function asChecked(value: unknown): Checked {
  if (isChecked(value)) return value;
  return value ? 'true' : 'false';
}

export function isAlignment(value: unknown): value is Alignment {
  return value === 'start' || value === 'end';
}

export function asAlignment(value: unknown): Alignment {
  return isAlignment(value) ? value : 'start';
}

export function isSide(value: unknown): value is Side {
  return (
    value === 'top' ||
    value === 'right' ||
    value === 'bottom' ||
    value === 'left'
  );
}

export function asSide(value: unknown): Side {
  return isSide(value) ? value : 'top';
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

export function asAlignedPlacement(value: unknown): AlignedPlacement {
  return isAlignedPlacement(value) ? value : 'top-start';
}

export function isPlacement(value: unknown): value is Placement {
  return value === 'auto' || isSide(value) || isAlignedPlacement(value);
}

export function asPlacement(value: unknown): Placement {
  return isPlacement(value) ? value : 'auto';
}
