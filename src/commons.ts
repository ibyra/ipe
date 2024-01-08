import type {
  HTMLButton,
  HTMLDisclosure,
  HTMLOpenable,
  HTMLOption,
  HTMLOptlist,
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

/**
 * Returns `true` if the value is a integer number, `false` otherwise.
 * @param value
 */
export function isInteger(value: unknown): value is number {
  return isFinite(value) && Number.isInteger(value);
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
