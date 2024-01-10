import { CheckedAttr, StringAttr } from './attributes';
import { isChecked, isString } from './commons';
import { type Checked } from './dom';
import { CheckedFData, StringFData } from './formdata';
import {
  type FormValidity,
  IpeElementFormSingleValue,
} from './ipe-element-form';

export class IpeCheckboxElement extends IpeElementFormSingleValue {
  protected _value: string = 'on';
  protected _valueAttr = new StringAttr('value', this._value);
  protected _valueFData = new StringFData('value', this._value);

  protected _checked: Checked = 'false';
  protected _checkedAttr = new CheckedAttr('checked', this._checked);
  protected _checkedFData = new CheckedFData('checked', this._checked);

  get value(): string {
    return this._value;
  }
  set value(value: string) {
    if (!isString(value)) return;
    if (!this.changeValue(value)) return;
    this.saveFormValue();
  }

  get checked(): Checked {
    return this._checked;
  }
  set checked(value: Checked) {
    if (!isChecked(value)) return;
    if (!this.changeChecked(value)) return;
    this.saveFormValue();
  }

  get defaultValue(): string {
    return this._valueAttr.get(this);
  }
  set defaultValue(value: string) {
    if (!this._valueAttr.set(this, value)) return;
  }

  get defaultChecked(): Checked {
    return this._checkedAttr.get(this);
  }
  set defaultChecked(value: Checked) {
    if (!this._checkedAttr.set(this, value)) return;
  }

  protected get dirtyChecked(): boolean {
    return this._value !== this._checkedAttr.get(this);
  }

  protected override initProperties(): void {
    super.initProperties();
    this._internals.role = 'checkbox';
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0;
    }
    this.changeValue(this._valueAttr.get(this));
    this.changeChecked(this._checkedAttr.get(this));
  }

  protected override resetProperties(): void {
    this.changeValue(this.defaultValue);
    this.changeChecked(this.defaultChecked);
  }

  protected override holdListeners(): void {
    super.holdListeners();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);
  }

  protected override releaseListeners(): void {
    super.releaseListeners();
    this.removeEventListener('keydown', this.handleKeydown);
    this.removeEventListener('click', this.handleClick);
  }

  protected override getFormValidity(): FormValidity {
    const { flags, messages } = super.getFormValidity();
    flags.valueMissing = this.required && this._checked !== 'true';
    messages.valueMissing = this.dataset['valueMissing'] ?? 'Required';
    return { flags, messages };
  }

  protected override getFormState(): FormData {
    const state = super.getFormState();
    this._valueFData.set(state, this._value);
    this._checkedFData.set(state, this._checked);
    return state;
  }

  protected override setFormState(state: FormData): void {
    super.setFormState(state);
    this.changeValue(this._valueFData.get(state));
    this.changeChecked(this._checkedFData.get(state));
  }

  protected override getFormValue(): FormData | null {
    if (this._checked !== 'true') return null;
    const value = new FormData();
    value.set(this._name, this._value);
    return value;
  }

  protected changeValue(newValue: string): boolean {
    const oldValue = this._value;
    if (newValue === oldValue) return false;
    this._value = newValue;
    this._dirty = newValue !== this.defaultValue;
    return true;
  }

  protected changeChecked(newValue: Checked): boolean {
    const oldValue = this._checked;
    if (newValue === oldValue) return false;
    this._checked = newValue;
    this._internals.ariaChecked = newValue;
    this.ariaChecked = newValue;
    return true;
  }

  protected handleClick(event: MouseEvent): void {
    // Prevent double handling click when the checkbox is inside a <label>.
    event.preventDefault();
    this._userInteracted = true;
    const checked = this._checked === 'false' ? 'true' : 'false';
    if (!this.changeChecked(checked)) return;
    this.notifyInput();
    this.notifyChange();
    this.saveFormValue();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    // Spaces should change the checkbox check value
    if (event.key !== ' ') return;
    // Prevent space scroll
    event.preventDefault();
    this._userInteracted = true;
    const checked = this._checked === 'false' ? 'true' : 'false';
    if (!this.changeChecked(checked)) return;
    this.notifyInput();
    this.notifyChange();
    this.saveFormValue();
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
