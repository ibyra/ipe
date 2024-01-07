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
 */
export function isHTMLButton(
  value: unknown,
): value is HTMLButtonElement | HTMLInputElement {
  return (
    isObject(value) &&
    (value instanceof HTMLButtonElement ||
      (value instanceof HTMLInputElement &&
        (value.type === 'button' ||
          value.type === 'submit' ||
          value.type === 'reset')))
  );
}
