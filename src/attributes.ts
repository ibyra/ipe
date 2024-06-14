import type { ComplexAttributeConverter } from 'lit';
import {
  asChecked,
  asDecimal,
  asInt,
  asPlacement,
  type Checked,
  type EqualityComparison,
  type Placement,
} from './commons';

abstract class AttributeConverter<T> implements ComplexAttributeConverter<T> {
  public readonly defaultValue: T;
  public readonly equals: EqualityComparison<T>;

  constructor(defaultValue: T, equals: EqualityComparison<T> = Object.is) {
    this.defaultValue = defaultValue;
    this.equals = equals;
  }

  abstract fromAttribute(value: string | null): T;

  abstract toAttribute(value: T): string | null;
}

export class BoolConverter extends AttributeConverter<boolean> {
  constructor() {
    super(false);
  }

  override fromAttribute(value: string | null): boolean {
    return value != null;
  }

  override toAttribute(value: boolean): string | null {
    return value ? '' : null;
  }
}

export class StrConverter extends AttributeConverter<string> {
  constructor(defaultValue: string = '') {
    super(String(defaultValue));
  }

  override fromAttribute(value: string | null): string {
    return value == null ? this.defaultValue : value;
  }

  override toAttribute(value: string): string | null {
    return this.equals(value, this.defaultValue) ? null : value;
  }
}

export class IntConverter extends AttributeConverter<number> {
  constructor(defaultValue: number = 0) {
    super(asInt(defaultValue));
  }

  override fromAttribute(value: string | null): number {
    if (value == null) return this.defaultValue;
    const numeric = Number.parseFloat(value);
    return asInt(numeric, this.defaultValue);
  }

  override toAttribute(value: number): string | null {
    const integer = asInt(value, this.defaultValue);
    if (this.equals(this.defaultValue, integer)) return null;
    return integer.toString(10);
  }
}

export class DecimalConverter extends AttributeConverter<number> {
  constructor(defaultValue: number = 0.0) {
    super(asDecimal(defaultValue));
  }

  override fromAttribute(value: string | null): number {
    if (value == null) return this.defaultValue;
    const numeric = Number.parseFloat(value);
    return asDecimal(numeric, this.defaultValue);
  }

  override toAttribute(value: number): string | null {
    const decimal = asDecimal(value, this.defaultValue);
    if (this.equals(this.defaultValue, decimal)) return null;
    return decimal.toString(10);
  }
}

export class NumberConverter extends AttributeConverter<number> {
  constructor(defaultValue: number = 0.0) {
    super(Number(defaultValue));
  }

  override fromAttribute(value: string | null): number {
    if (value == null) return this.defaultValue;
    const numeric = Number.parseFloat(value);
    return numeric;
  }

  override toAttribute(value: number): string | null {
    const number = Number(value);
    if (this.equals(this.defaultValue, number)) return null;
    return number.toString(10);
  }
}

export class CheckedConverter extends AttributeConverter<Checked> {
  constructor(defaultValue: Checked = 'false') {
    super(asChecked(defaultValue));
  }

  override fromAttribute(value: string | null): Checked {
    if (value == null) return this.defaultValue;
    return asChecked(value, this.defaultValue);
  }

  override toAttribute(value: Checked): string | null {
    const checked = asChecked(value, this.defaultValue);
    if (this.equals(this.defaultValue, checked)) return null;
    return checked;
  }
}

export class PlacementConverter extends AttributeConverter<Placement> {
  constructor(defaultValue: Placement = 'auto') {
    super(asPlacement(defaultValue));
  }

  override fromAttribute(value: string | null): Placement {
    if (value == null) return this.defaultValue;
    return asPlacement(value, this.defaultValue);
  }

  override toAttribute(value: Placement): string | null {
    const checked = asPlacement(value, this.defaultValue);
    if (this.equals(this.defaultValue, checked)) return null;
    return checked;
  }
}

export class IdRefConverter<
  E extends Element = Element,
> extends AttributeConverter<E | null> {
  public document: Document;

  constructor(document: Document) {
    super(null);
    this.document = document;
  }

  override fromAttribute(value: string | null): E | null {
    if (value == null) return this.defaultValue;
    if (value === '') return this.defaultValue;
    const element = this.document.querySelector<E>(`#${value}`);
    return element;
  }

  override toAttribute(value: E | null): string | null {
    if (value == null) return null;
    if (value.id === '') return null;
    return value.id;
  }
}
