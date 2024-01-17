import {
  asChecked,
  asDecimal,
  asInt,
  asPlacement,
  isString,
  type Checked,
  type Placement,
} from '.';

export interface AttributeProp<T> {
  /**
   * The name of the property. The name should be unique within a host.
   */
  readonly name: string;

  /**
   * The current value of the property.
   */
  value: T;

  /**
   * The current value of the property.
   */
  initialValue: T;

  /**
   * The current value of the property.
   */
  defaultValue: T;

  /**
   * A method that initializes the value of the property from an attribute.
   */
  attributeInit(): void;

  /**
   * A method that changes the value of the property from an change in the
   * attribute.
   * @param oldAttribute
   * @param newAttribute
   */
  attributeChanged(
    oldAttribute: string | null,
    newAttribute: string | null,
  ): void;

  /**
   * A method called when the host is disconnected from the tree.
   */
  disconnect(): void;
}

export interface Host extends Element {
  /**
   * Adds a property to the host, which sets up the property's lifecycle
   * methods to be called with the host's lifecycle.
   * @param property
   */
  addProperty(property: AttributeProp<unknown>): void;

  /**
   * Removes a property from the host.
   * @param property
   */
  removeProperty(property: AttributeProp<unknown>): void;

  /**
   * A method called when some host property is about to change.
   *
   * @param name The name of the property
   * @param oldValue the current value of the property
   * @param newValue the next value of the property
   */
  shouldPropertyChange(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): boolean;

  /**
   * A method called when some host property just changed.
   *
   * @param name The name of the property
   * @param oldValue the previous value of the property
   * @param newValue the current value of the property
   */
  propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void;
}

type AttributeParser<T> = {
  from(attribute: string): T;
  to(value: T): string | null;
};

const attrParserStr: AttributeParser<string> = {
  from(attribute) {
    return attribute;
  },
  to(value) {
    return value;
  },
};

const attrParserBool: AttributeParser<boolean> = {
  from() {
    return true;
  },
  to(value) {
    return value ? '' : null;
  },
};

const attrParserInt: AttributeParser<number> = {
  from(attribute) {
    const value = Number.parseFloat(attribute);
    return asInt(value);
  },
  to(value) {
    const int = asInt(value);
    return int.toString(10);
  },
};

const attrParserDecimal: AttributeParser<number> = {
  from(attribute) {
    const value = Number.parseFloat(attribute);
    return asDecimal(value);
  },
  to(value) {
    const decimal = asDecimal(value);
    return decimal.toString(10);
  },
};

const attrParserNumber: AttributeParser<number> = {
  from(attribute) {
    const value = Number.parseFloat(attribute);
    return value;
  },
  to(value) {
    const number = Number(value);
    return number.toString(10);
  },
};

const attrParserRefId: AttributeParser<Element | null> = {
  from(attribute) {
    if (attribute === '') return null;
    return window.document.querySelector(`#${attribute}`);
  },
  to(value) {
    if (value == null) return null;
    return value.id;
  },
};

const attrParserChecked: AttributeParser<Checked> = {
  from: asChecked,
  to: asChecked,
};

const attrParserPlacement: AttributeParser<Placement> = {
  from: asPlacement,
  to: asPlacement,
};

export const attributeParsers = {
  str: attrParserStr,
  bool: attrParserBool,
  int: attrParserInt,
  decimal: attrParserDecimal,
  number: attrParserNumber,
  refId: attrParserRefId,
  checked: attrParserChecked,
  placement: attrParserPlacement,
  arrayOf<T>(parser: AttributeParser<T>): AttributeParser<Array<T>> {
    return {
      from(attribute) {
        const attributes = attribute.split(/\s+/);
        return attributes.map(parser.from);
      },
      to(values) {
        const attributes = [];
        for (const value of values) {
          const attribute = parser.to(value);
          if (attribute != null) {
            attributes.push(attribute);
          }
        }
        return attributes.join(' ');
      },
    };
  },
};

type AttributePropOptions<T> = {
  name: string;
  value: T;
  equals?: (a: T, b: T) => boolean;
  cast?: (value: unknown) => T;
  attribute?: false | AttributeParser<T>;
};

function identity<T = unknown>(value: unknown): T {
  return value as T;
}

function equals(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

// TODO: Rewrite it as ES decorator as soon it's supported

export class Property<H extends Host, T = unknown> implements AttributeProp<T> {
  public readonly host: H;
  public readonly name: string;
  protected readonly _equals: (a: T, b: T) => boolean;
  protected readonly _cast: (value: unknown) => T;
  protected readonly _attributeParser: AttributeParser<T> | null;
  protected _currentValue: T;
  protected _initialValue: T;
  protected _defaultValue: T;

  constructor(host: H, options: AttributePropOptions<T>) {
    this.host = host;
    this.name = options.name;
    this._equals = options.equals ?? equals;
    this._cast = options.cast ?? identity;
    this._attributeParser = options.attribute ? options.attribute : null;
    this._currentValue = this._cast(options.value);
    this._initialValue = this._cast(options.value);
    this._defaultValue = this._cast(options.value);
    host.addProperty(this);
  }

  public get initialValue(): T {
    return this._initialValue;
  }

  public get defaultValue(): T {
    return this._defaultValue;
  }

  public get value(): T {
    return this._currentValue;
  }
  public set value(value: T) {
    const newValue = this._cast(value);
    const oldValue = this._currentValue;
    if (this._equals(oldValue, newValue)) return;

    const proceed = this.host.shouldPropertyChange(
      this.name,
      oldValue,
      newValue,
    );
    if (!proceed) return;

    this._currentValue = newValue;
    this.onValueSet();
    this.host.propertyChanged(this.name, oldValue, newValue);
  }

  init(value: T) {
    const newValue = this._cast(value);
    const oldValue = this._currentValue;
    if (this._equals(oldValue, newValue)) return;

    this._currentValue = newValue;
    this._initialValue = newValue;

    this.onValueSet();
    this.host.propertyChanged(this.name, oldValue, newValue);
  }

  attributeInit(): void {
    if (this._attributeParser == null) return;
    const attr = this.host.getAttribute(this.name);
    const newValue =
      attr == null ? this._defaultValue : this._attributeParser.from(attr);
    this.init(newValue);
  }

  attributeChanged(
    oldAttribute: string | null,
    newAttribute: string | null,
  ): void {
    if (newAttribute === oldAttribute || this._attributeParser == null) return;

    const newValue =
      newAttribute == null
        ? this._defaultValue
        : this._attributeParser.from(newAttribute);

    this.value = newValue;
  }

  disconnect(): void {
    return;
  }

  protected onValueSet(): void {
    this.setAttribute();
  }

  protected setAttribute(): void {
    if (this._attributeParser == null) return;
    const newAttribute = this._attributeParser.to(this._currentValue);
    if (
      newAttribute == null ||
      this._equals(this._defaultValue, this._currentValue)
    ) {
      this.host.removeAttribute(this.name);
    } else {
      this.host.setAttribute(this.name, newAttribute);
    }
  }
}

export type FormStateValue = Array<string | Blob>;

export class FormState extends Map<string, FormStateValue> {
  constructor(entries?: Iterable<[string, FormStateValue]>) {
    super(entries);
  }

  toFormData(): FormData {
    const formdata = new FormData();
    for (const [key, value] of this) {
      for (const item of value) {
        formdata.append(key, item);
      }
    }
    return formdata;
  }
}

export interface FormHost extends Host {
  readonly formState: FormState;
  addFormProperty(property: FormProp<unknown>): void;
  removeFormProperty(property: FormProp<unknown>): void;
  saveForm(): void;
}

export interface FormProp<T> extends AttributeProp<T> {
  /**
   * A method that resets the value of the property.
   * @param attribute
   */
  formReset(): void;

  /**
   * A method that restores the value of the property from the form.
   * @param attribute
   */
  formRestore(state: FormData): void;
}

type FormDataParser<T> = {
  from(entries: FormStateValue): T;
  to(value: T): FormStateValue;
};

// type MultiFormDataParser<T> = {
//   fromAll(entries: Array<string | Blob>): Array<T>;
//   toAll(value: Array<T>): Array<string | Blob>;
// };

const fdataParserStr: FormDataParser<string> = {
  from(entries) {
    const entry = entries[0];
    if (!isString(entry)) return '';
    return entry;
  },
  to(entry) {
    return [entry];
  },
};

const fdataParserBool: FormDataParser<boolean> = {
  from(entries) {
    const entry = entries[0];
    return entry === 'on';
  },
  to(value) {
    return value ? ['on'] : [];
  },
};

const fdataParserInt: FormDataParser<number> = {
  from(entries) {
    const entry = entries[0];
    if (!isString(entry)) return 0;
    const value = Number.parseFloat(entry);
    return asInt(value);
  },
  to(value) {
    const int = asInt(value);
    return [int.toString(10)];
  },
};

const fdataParserDecimal: FormDataParser<number> = {
  from(entries) {
    const entry = entries[0];
    if (!isString(entry)) return 0;
    const value = Number.parseFloat(entry);
    return asDecimal(value);
  },
  to(value) {
    const decimal = asDecimal(value);
    return [decimal.toString(10)];
  },
};

const fdataParserNumber: FormDataParser<number> = {
  from(entries) {
    const entry = entries[0];
    if (!isString(entry)) return Number.NaN;
    const value = Number.parseFloat(entry);
    return value;
  },
  to(value) {
    const number = Number(value);
    return [number.toString(10)];
  },
};

const fdataParserChecked: FormDataParser<Checked> = {
  from(entries) {
    return asChecked(entries[0]);
  },
  to(value) {
    return [asChecked(value)];
  },
};

const fdataParserPlacement: FormDataParser<Placement> = {
  from(entries) {
    return asPlacement(entries[0]);
  },
  to(value) {
    return [asPlacement(value)];
  },
};

export const formDataParsers = {
  str: fdataParserStr,
  bool: fdataParserBool,
  int: fdataParserInt,
  decimal: fdataParserDecimal,
  number: fdataParserNumber,
  checked: fdataParserChecked,
  placement: fdataParserPlacement,
  arrayOf<T>(parser: FormDataParser<T>): FormDataParser<Array<T>> {
    return {
      from(entries) {
        const values = entries.flatMap((entry) => parser.from([entry]));
        return values;
      },
      to(values) {
        const entries = [];
        for (const value of values) {
          const entry = parser.to(value);
          if (entry != null) {
            entries.push(entry);
          }
        }
        return entries.flat();
      },
    };
  },
};

type FormPropOptions<T> = AttributePropOptions<T> & {
  form?: false | FormDataParser<T>;
};

export class FormProperty<T = unknown>
  extends Property<FormHost, T>
  implements FormProp<T>
{
  protected _formParser: FormDataParser<T> | null;

  constructor(host: FormHost, options: FormPropOptions<T>) {
    super(host, options);
    this._formParser = options.form ? options.form : null;
    host.addFormProperty(this);
  }

  setFormState(): void {
    if (this._formParser == null) return;
    const fdataValue = this._formParser.to(this._currentValue);
    this.host.formState.set(this.name, fdataValue);
  }

  formReset(): void {
    this.value = this._initialValue;
  }

  formRestore(state: FormData): void {
    if (this._formParser == null) return;
    const entry = state.getAll(this.name);
    const newValue =
      entry.length === 0 ? this._initialValue : this._formParser.from(entry);
    this.value = newValue;
  }

  protected override onValueSet(): void {
    this.setFormState();
    this.setAttribute();
    this.host.saveForm();
  }
}
