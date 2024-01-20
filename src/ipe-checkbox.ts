import { asChecked } from './commons';
import { type Checked } from './dom';
import {
  type FormValidity,
  IpeElementFormSingleValue,
} from './ipe-element-form';
import { FormProperty, attributeParsers, formDataParsers } from './property';

export class IpeCheckboxElement extends IpeElementFormSingleValue {
  protected _value = new FormProperty(this, {
    name: 'value',
    value: 'on',
    cast: String,
    form: formDataParsers.str,
  });

  protected _checked = new FormProperty(this, {
    name: 'checked',
    value: 'false' as Checked,
    cast: asChecked,
    attribute: attributeParsers.checked,
    form: formDataParsers.checked,
  });

  protected override get template(): string | null {
    return `
      <style>
        :host {
          display: inline-block;
          height: 1.125em;
          width: 1.125em;
          background-color: white;
          border: solid 0.125em dimgray;
          border-radius: 0.125em;
          overflow: hidden;
          vertical-align: middle;
          line-height: 1;
          cursor: pointer;
        }
        :host([checked='true']) {
          background-color: black;
          box-shadow:
            inset 0.25em 0.25em 0 white,
            inset -0.25em -0.25em 0 white;
        }
        :host([checked='mixed']) {
          background-color: gray;
          box-shadow:
            inset 0.25em 0.25em 0 white,
            inset -0.25em -0.25em 0 white;
        }
        :host([aria-invalid='true']) {
          border-color: red;
        }
      </style>
      <slot></slot>
    `;
  }

  get value(): string {
    return this._value.value;
  }
  set value(value: string) {
    this._value.value = value;
  }

  get checked(): Checked {
    return this._checked.value;
  }
  set checked(value: Checked) {
    this._checked.value = value;
  }

  public override get formValidity(): FormValidity {
    const { flags, messages } = super.formValidity;
    flags.valueMissing = this.required && this._checked.value !== 'true';
    messages.valueMissing = this.dataset['valueMissing'] ?? 'Required';
    return { flags, messages };
  }

  public override get formValue(): FormData | null {
    if (this._checked.value !== 'true') return null;
    const value = new FormData();
    value.set(this._name.value, this._value.value);
    return value;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._internals.role = 'checkbox';

    if (this.hasAttribute('value')) {
      this._value.init(this.getAttribute('value') ?? this._value.value);
    }
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0;
    }
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeydown);
    this.removeEventListener('click', this.handleClick);
  }

  override propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === this._checked.name) {
      const curr = newValue as Checked;
      return this.checkedChanged(curr);
    }
    return super.propertyChanged(name, oldValue, newValue);
  }

  protected checkedChanged(newValue: Checked): void {
    this._internals.ariaChecked = newValue;
    this.ariaChecked = newValue;
  }

  protected handleClick(event: MouseEvent): void {
    // Prevent double handling click when the checkbox is inside a <label>.
    event.preventDefault();
    this._userInteracted = true;
    const checked = this._checked.value === 'false' ? 'true' : 'false';
    this._checked.value = checked;
    this.notifyInput();
    this.notifyChange();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    // Spaces should change the checkbox check value
    if (event.key !== ' ') return;
    // Prevent space scroll
    event.preventDefault();
    this._userInteracted = true;
    const checked = this._checked.value === 'false' ? 'true' : 'false';
    this._checked.value = checked;
    this.notifyInput();
    this.notifyChange();
  }

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'checked', 'value'];
  }
}

window.IpeCheckboxElement = IpeCheckboxElement;
window.customElements.define('ipe-checkbox', IpeCheckboxElement);

declare global {
  interface Window {
    IpeCheckboxElement: typeof IpeCheckboxElement;
  }

  interface HTMLElementTagNameMap {
    'ipe-checkbox': IpeCheckboxElement;
  }
}
