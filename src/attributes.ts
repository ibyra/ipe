import { isChecked, isPlacement, isString } from './commons';
import type { Checked, Placement } from './dom';

/**
 * Represents a attribute parser of a DOM Element, with a name and a default
 * value. You can get/set the attributes as any value accordingly to the
 * `to` and `from` methods.
 */
export abstract class Attr<D, T> {
  readonly name: string;
  readonly defaultValue: D;

  constructor(name: string, defaultValue: D) {
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
  get(element: Element): T | D {
    const attribute = element.getAttribute(this.name);
    return this.from(attribute);
  }

  /**
   * Sets the value in an attribute in the element. Returns `true` if the
   * attribute was changed, or `false` otherwise.
   *
   * @param value
   */
  set(element: Element, value: T): boolean {
    const newValue = this.to(value);
    const oldValue = element.getAttribute(this.name);
    if (newValue === oldValue) return false;
    if (newValue == null) {
      element.removeAttribute(this.name);
    } else {
      element.setAttribute(this.name, newValue);
    }
    return true;
  }
}

export class StringAttr<D> extends Attr<D, string> {
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

export class BooleanAttr<D> extends Attr<D, boolean> {
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

export class IntegerAttr<D> extends Attr<D, number> {
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

export class FloatAttr<D> extends Attr<D, number> {
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

export class NumberAttr<D> extends Attr<D, number> {
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

export class IdRefAttr<D> extends Attr<D, Element | null> {
  readonly root: ParentNode;

  constructor(name: string, defaultValue: D, root: ParentNode) {
    super(name, defaultValue);
    this.root = root;
  }

  override isDefault(value: Element | null): boolean {
    return value === this.defaultValue;
  }

  override from(attribute: string | null): Element | D | null {
    if (!isString(attribute)) return this.defaultValue;
    if (attribute === '') return this.defaultValue;
    return this.root.querySelector(`#${attribute}`);
  }

  override to(value: Element | null): string | null {
    if (value == null) return null;
    if (value.id === '') return null;
    return value.id;
  }
}

export class CheckedAttr<D> extends Attr<D, Checked> {
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

export class PlacementAttr<D> extends Attr<D, Placement> {
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
