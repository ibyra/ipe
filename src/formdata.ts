import { isChecked, isPlacement, isString } from './commons';
import type { Checked, Placement } from './dom';

export abstract class FData<D, T> {
  readonly name: string;
  readonly defaultValue: D;

  constructor(name: string, defaultValue: D) {
    this.name = name;
    this.defaultValue = defaultValue;
  }

  /**
   * Returns `true` if the given value is the default value.
   *
   * @param value
   */
  abstract isDefault(value: T): boolean;

  /**
   * Returns the value of an form data entry value, or the default value, if
   * it's `null`.
   *
   * @param fdataValue
   */
  abstract from(fdataValue: FormDataEntryValue | null): T | D;

  /**
   * Returns the form data entry value of a value, or the `null`, if it's the
   * default value.
   *
   * @param value
   */
  abstract to(value: T): FormDataEntryValue | null;

  /**
   * Returns the first value in the form data associated with the name.
   *
   * @param formdata
   */
  get(formdata: FormData): T | D {
    const entry = formdata.get(this.name);
    return this.from(entry);
  }

  /**
   * Sets the value in the form data, or remove it if the value is the default.
   * Returns `true` if some form data entry value was changed, or `false`
   * otherwise.
   *
   * @param formdata
   * @param value
   */
  set(formdata: FormData, value: T): boolean {
    const newValue = this.to(value);
    const oldValue = formdata.get(this.name);
    if (newValue === oldValue) return false;
    if (newValue == null) {
      formdata.delete(this.name);
    } else {
      formdata.set(this.name, newValue);
    }
    return true;
  }

  /**
   * Returns all the values in the form data associated with the name.
   *
   * @param formdata
   */
  getAll(formdata: FormData): Array<T | D> {
    return formdata.getAll(this.name).map((entry) => this.from(entry));
  }

  /**
   * Sets the non-default values in the form data. Returns `true` if some form
   * data entry value was changed, or `false` otherwise.
   *
   * @param formdata
   * @param values
   */
  setAll(formdata: FormData, values: Iterable<T>): boolean {
    let changed = formdata.has(this.name);
    formdata.delete(this.name);
    for (const value of values) {
      const newValue = this.to(value);
      if (newValue != null) {
        formdata.append(this.name, newValue);
        changed = true;
      }
    }
    return changed;
  }
}

export class StringFData<D> extends FData<D, string> {
  override isDefault(value: string): boolean {
    return value === this.defaultValue;
  }

  override from(fdataValue: FormDataEntryValue | null): string | D {
    if (!isString(fdataValue)) return this.defaultValue;
    return fdataValue;
  }

  override to(value: string): FormDataEntryValue | null {
    if (this.isDefault(value)) return null;
    return value;
  }
}

export class BooleanFData<D> extends FData<D, boolean> {
  override isDefault(value: boolean): boolean {
    return value === this.defaultValue;
  }

  override from(fdataValue: FormDataEntryValue | null): boolean | D {
    if (!isString(fdataValue)) return this.defaultValue;
    return fdataValue === 'on';
  }
  override to(value: boolean): FormDataEntryValue | null {
    if (this.isDefault(value)) return null;
    return 'on';
  }
}

export class IntegerFData<D> extends FData<D, number> {
  override isDefault(value: number): boolean {
    return value === this.defaultValue;
  }

  override from(fdataValue: FormDataEntryValue | null): number | D {
    if (!isString(fdataValue)) return this.defaultValue;
    const value = Number.parseFloat(fdataValue);
    if (!Number.isFinite(value)) return this.defaultValue;
    if (!Number.isInteger(value)) return Math.trunc(value);
    return value;
  }

  override to(value: number): FormDataEntryValue | null {
    if (this.isDefault(value)) return null;
    if (!Number.isFinite(value)) return null;
    return Math.trunc(value).toString(10);
  }
}

export class FloatFData<D> extends FData<D, number> {
  override isDefault(value: number): boolean {
    return value === this.defaultValue;
  }

  override from(fdataValue: FormDataEntryValue | null): number | D {
    if (!isString(fdataValue)) return this.defaultValue;
    const value = Number.parseFloat(fdataValue);
    if (!Number.isFinite(value)) return this.defaultValue;
    return value;
  }

  override to(value: number): FormDataEntryValue | null {
    if (this.isDefault(value)) return null;
    if (!Number.isFinite(value)) return null;
    return value.toString(10);
  }
}

export class NumberFData<D> extends FData<D, number> {
  override isDefault(value: number): boolean {
    return (
      value === this.defaultValue ||
      (Number.isNaN(value) && Number.isNaN(this.defaultValue))
    );
  }

  override from(fdataValue: FormDataEntryValue | null): number | D {
    if (!isString(fdataValue)) return this.defaultValue;
    const value = Number.parseFloat(fdataValue);
    return value;
  }

  override to(value: number): FormDataEntryValue | null {
    if (this.isDefault(value)) return null;
    return value.toString(10);
  }
}

export class CheckedFData<D> extends FData<D, Checked> {
  override isDefault(value: Checked): boolean {
    return value === this.defaultValue;
  }

  override from(fdataValue: FormDataEntryValue | null): D | Checked {
    if (!isChecked(fdataValue)) return this.defaultValue;
    return fdataValue;
  }

  override to(value: Checked): FormDataEntryValue | null {
    if (this.isDefault(value)) return null;
    if (!isChecked(value)) return null;
    return value;
  }
}

export class PlacementFData<D> extends FData<D, Placement> {
  override isDefault(value: Placement): boolean {
    return value === this.defaultValue;
  }

  override from(fdataValue: FormDataEntryValue | null): D | Placement {
    if (!isPlacement(fdataValue)) return this.defaultValue;
    return fdataValue;
  }

  override to(value: Placement): FormDataEntryValue | null {
    if (this.isDefault(value)) return null;
    if (!isPlacement(value)) return null;
    return value;
  }
}
