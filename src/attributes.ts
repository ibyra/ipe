import { isChecked, isPlacement, isString } from './commons';
import type { Checked, Placement } from './dom';

export abstract class Attr<E extends Element, D, T> {
  readonly element: E;
  readonly name: string;
  readonly defaultValue: D;

  constructor(element: E, name: string, defaultValue: D) {
    this.element = element;
    this.name = name;
    this.defaultValue = defaultValue;
  }

  /**
   * Returns `true` if the given value is the default value.
   * @param value
   */
  abstract isDefault(value: T): boolean;

  /**
   * Returns the value of an attribute, or the default value, if it's `null`.
   * @param attribute
   */
  abstract from(attribute: string | null): T | D;

  /**
   * Returns the attribute of a value, or the `null`, if it's the default value.
   * @param value
   */
  abstract to(value: T): string | null;

  /**
   * Returns an value of the attribute in the element.
   * @returns
   */
  get(): T | D {
    const attribute = this.element.getAttribute(this.name);
    return this.from(attribute);
  }

  /**
   * Sets the value in an attribute in the element. Returns `true` if the
   * attribute was changed, or `false` otherwise.
   *
   * @param value
   */
  set(value: T): boolean {
    const newValue = this.to(value);
    const oldValue = this.element.getAttribute(this.name);
    if (newValue === oldValue) return false;
    if (newValue == null) {
      this.element.removeAttribute(this.name);
    } else {
      this.element.setAttribute(this.name, newValue);
    }
    return true;
  }
}

export class StringAttr<E extends Element, D> extends Attr<E, D, string> {
  override isDefault(value: string): boolean {
    return value === this.defaultValue;
  }

  override from(attribute: string | null): string | D {
    if (!isString(attribute)) return this.defaultValue;
    return attribute;
  }

  override to(value: string): string | null {
    if (this.isDefault(value)) return null;
    return value;
  }
}

export class BooleanAttr<E extends Element, D> extends Attr<E, D, boolean> {
  override isDefault(value: boolean): boolean {
    return value === this.defaultValue;
  }

  override from(attribute: string | null): boolean | D {
    if (!isString(attribute)) return this.defaultValue;
    return true;
  }

  override to(value: boolean): string | null {
    if (this.isDefault(value)) return null;
    return '';
  }
}

export class IntegerAttr<E extends Element, D> extends Attr<E, D, number> {
  override isDefault(value: number): boolean {
    return value === this.defaultValue;
  }

  override from(attribute: string | null): number | D {
    if (!isString(attribute)) return this.defaultValue;
    const value = Number.parseFloat(attribute);
    if (!Number.isFinite(value)) return this.defaultValue;
    if (!Number.isInteger(value)) return Math.trunc(value);
    return value;
  }

  override to(value: number): string | null {
    if (this.isDefault(value)) return null;
    if (!Number.isFinite(value)) return null;
    return Math.trunc(value).toString(10);
  }
}

export class FloatAttr<E extends Element, D> extends Attr<E, D, number> {
  override isDefault(value: number): boolean {
    return value === this.defaultValue;
  }

  override from(attribute: string | null): number | D {
    if (!isString(attribute)) return this.defaultValue;
    const value = Number.parseFloat(attribute);
    if (!Number.isFinite(value)) return this.defaultValue;
    return value;
  }

  override to(value: number): string | null {
    if (this.isDefault(value)) return null;
    if (!Number.isFinite(value)) return null;
    return value.toString(10);
  }
}

export class NumberAttr<E extends Element, D> extends Attr<E, D, number> {
  override isDefault(value: number): boolean {
    return (
      value === this.defaultValue ||
      (Number.isNaN(value) && Number.isNaN(this.defaultValue))
    );
  }

  override from(attribute: string | null): number | D {
    if (!isString(attribute)) return this.defaultValue;
    const value = Number.parseFloat(attribute);
    return value;
  }

  override to(value: number): string | null {
    if (this.isDefault(value)) return null;
    return value.toString(10);
  }
}

export class IdRefAttr<E extends Element, D> extends Attr<
  E,
  D,
  Element | null
> {
  override isDefault(value: Element | null): boolean {
    return value === this.defaultValue;
  }

  override from(attribute: string | null): Element | D | null {
    if (!isString(attribute)) return this.defaultValue;
    if (attribute === '') return this.defaultValue;
    return this.element.ownerDocument.querySelector(`#${attribute}`);
  }

  override to(value: Element | null): string | null {
    if (value == null) return null;
    if (value.id === '') return null;
    return value.id;
  }
}

export class CheckedAttr<E extends Element, D> extends Attr<E, D, Checked> {
  override isDefault(value: Checked): boolean {
    return this.defaultValue === value;
  }

  override from(attribute: string | null): Checked | D {
    if (!isChecked(attribute)) return this.defaultValue;
    return attribute;
  }

  override to(value: Checked): string | null {
    if (!this.isDefault(value)) return null;
    if (!isChecked(value)) return null;
    return value;
  }
}

export class PlacementAttr<E extends Element, D> extends Attr<E, D, Placement> {
  override from(attribute: string | null): D | Placement {
    if (!isPlacement(attribute)) return this.defaultValue;
    return attribute;
  }
  override to(value: Placement): string | null {
    if (this.isDefault(value)) return null;
    if (!isPlacement(value)) return null;
    return value;
  }

  override isDefault(value: Placement): boolean {
    return value === this.defaultValue;
  }
}
