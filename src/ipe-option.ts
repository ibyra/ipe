import { BooleanAttr, StringAttr } from './attributes';
import { isBoolean, isString } from './commons';
import { type HTMLValueOption } from './dom';
import { IpeElement } from './ipe-element';

export class IpeOptionElement extends IpeElement implements HTMLValueOption {
  protected _valueAttr = new StringAttr(this, 'value', '');
  protected _value: string = '';

  protected _disabledAttr = new BooleanAttr(this, 'disabled', false);
  protected _disabled: boolean = false;

  protected _selectedAttr = new BooleanAttr(this, 'selected', false);
  protected _selected: boolean = false;

  protected _userInteracted: boolean = false;

  protected _changeTimerID: number | null = null;

  protected _internals: ElementInternals = this.attachInternals();

  get value(): string {
    return this._value;
  }
  set value(value: string) {
    if (typeof value !== 'string') return;
    if (!this.changeValue(value)) return;
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    if (typeof value !== 'boolean') return;
    if (!this.changeDisabled(value)) return;
  }

  get selected(): boolean {
    return this._selected;
  }
  set selected(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeSelected(value)) return;
  }

  get defaultValue(): string {
    return this._valueAttr.get();
  }
  set defaultValue(value: string) {
    if (!isString(value)) return;
    if (!this._valueAttr.set(value)) return;
  }

  get defaultSelected(): boolean {
    return this._selectedAttr.get();
  }
  set defaultSelected(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this._selectedAttr.set(value)) return;
  }

  toggle(): void {
    this.changeSelected(!this._selected);
  }

  select(): void {
    this.changeSelected(true);
  }

  deselect(): void {
    this.changeSelected(false);
  }

  protected override initProperties(): void {
    super.initProperties();
    this.changeValue(this._valueAttr.get());
    this.changeDisabled(this._disabledAttr.get());
    this.changeSelected(this._selectedAttr.get());
  }

  protected override holdListeners(): void {
    super.holdListeners();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);
  }

  protected override releaseListeners(): void {
    super.releaseListeners();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeydown);
  }

  protected override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === this._disabledAttr.name) {
      const disabled = this._disabledAttr.from(newValue);
      if (!this.changeDisabled(disabled)) return;
    }
  }

  protected changeValue(newValue: string): boolean {
    const oldValue = this._value;
    if (newValue === oldValue) return false;
    this._value = newValue;
    return true;
  }

  protected changeSelected(newValue: boolean): boolean {
    const oldValue = this._selected;
    if (newValue === oldValue) return false;
    this._selected = newValue;
    this.ariaSelected = newValue ? 'true' : 'false';
    this._internals.ariaSelected = newValue ? 'true' : 'false';
    return true;
  }

  protected changeDisabled(newValue: boolean): boolean {
    const oldValue = this._disabled;
    if (newValue === oldValue) return false;
    this._disabled = newValue;
    this._disabledAttr.set(newValue);
    this.inert = newValue;
    this.ariaDisabled = newValue ? 'true' : 'false';
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
    return true;
  }

  protected changeNotifySelected(newValue: boolean): boolean {
    const oldValue = this._selected;

    const beforeToggle = new ToggleEvent('beforetoggle', {
      cancelable: true,
      newState: newValue ? 'selected' : 'unselected',
      oldState: oldValue ? 'selected' : 'unselected',
    });
    const proceed = this.dispatchEvent(beforeToggle);
    if (!proceed) return false;

    this.changeSelected(newValue);

    const toggle = new ToggleEvent('toggle', {
      cancelable: false,
      newState: newValue ? 'selected' : 'unselected',
      oldState: oldValue ? 'selected' : 'unselected',
    });
    this.dispatchEvent(toggle);

    return true;
  }

  protected handleClick(): void {
    this._userInteracted = true;
    this.changeNotifySelected(!this._selected);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    // Prevent space scroll
    event.preventDefault();
    this._userInteracted = true;
    this.changeNotifySelected(!this._selected);
  }

  static override get observedAttributes(): Array<string> {
    return ['disabled'];
  }
}

window.IpeValueOptionElement = IpeOptionElement;

window.customElements.define('ipe-option', IpeOptionElement);

declare global {
  interface Window {
    IpeValueOptionElement: typeof IpeOptionElement;
  }

  interface HTMLElementTagNameMap {
    'ipe-option': IpeOptionElement;
  }
}
