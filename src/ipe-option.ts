import { type HTMLValueOption } from './dom';
import { IpeElement } from './ipe-element';
import { Property, attributeParsers } from './property';

export class IpeOptionElement extends IpeElement implements HTMLValueOption {
  protected _value = new Property(this, {
    name: 'value',
    value: '',
    cast: String,
    attribute: attributeParsers.str,
  });

  protected _disabled = new Property(this, {
    name: 'disabled',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
  });

  protected _selected = new Property(this, {
    name: 'selected',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
  });

  protected _userInteracted: boolean = false;

  protected _changeTimerID: number | null = null;

  protected _internals: ElementInternals = this.attachInternals();

  get value(): string {
    return this._value.value;
  }
  set value(value: string) {
    this._value.value = value;
  }

  get disabled(): boolean {
    return this._disabled.value;
  }
  set disabled(value: boolean) {
    this._disabled.value = value;
  }

  get selected(): boolean {
    return this._selected.value;
  }
  set selected(value: boolean) {
    this._selected.value = value;
  }

  get defaultValue(): string {
    return this._value.initialValue;
  }

  get defaultSelected(): boolean {
    return this._selected.initialValue;
  }

  toggle(): void {
    this._selected.value = !this._selected.value;
  }

  select(): void {
    this._selected.value = true;
  }

  deselect(): void {
    this._selected.value = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeydown);
  }

  override shouldPropertyChange(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): boolean {
    if (name === 'selected') {
      const curr = newValue as boolean;
      const prev = oldValue as boolean;
      return this.shouldSelectedChange(curr, prev);
    }
    return super.shouldPropertyChange(name, oldValue, newValue);
  }

  override propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === 'disabled') {
      const curr = newValue as boolean;
      return this.disabledChanged(curr);
    }
    if (name === 'selected') {
      const curr = newValue as boolean;
      const prev = oldValue as boolean;
      return this.selectedChanged(curr, prev);
    }
    super.propertyChanged(name, oldValue, newValue);
  }

  protected shouldSelectedChange(
    newValue: boolean,
    oldValue: boolean,
  ): boolean {
    const event = new ToggleEvent('beforetoggle', {
      cancelable: true,
      newState: newValue ? 'selected' : 'unselected',
      oldState: oldValue ? 'selected' : 'unselected',
    });
    const proceed = this.dispatchEvent(event);
    return proceed;
  }

  protected disabledChanged(newValue: boolean): void {
    this.inert = newValue;
    this.ariaDisabled = newValue ? 'true' : 'false';
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
  }

  protected selectedChanged(newValue: boolean, oldValue: boolean): void {
    this.ariaSelected = newValue ? 'true' : 'false';
    this._internals.ariaSelected = newValue ? 'true' : 'false';
    const event = new ToggleEvent('toggle', {
      cancelable: false,
      newState: newValue ? 'selected' : 'unselected',
      oldState: oldValue ? 'selected' : 'unselected',
    });
    this.dispatchEvent(event);
  }

  protected handleClick(): void {
    this._userInteracted = true;
    this._selected.value = !this._selected.value;
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    // Prevent space scroll
    event.preventDefault();
    this._userInteracted = true;
    this._selected.value = !this._selected.value;
  }

  static override get observedAttributes(): Array<string> {
    return [...super.observedAttributes, 'disabled', 'selected', 'value'];
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
