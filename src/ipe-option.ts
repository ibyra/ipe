import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import { type HTMLValueOption, html } from './commons';
import { BoolConverter, StrConverter } from './attributes';
import { IpeElement } from './ipe-element';

export class IpeOptionElement extends IpeElement implements HTMLValueOption {
  static override properties: PropertyDeclarations = {
    value: {
      reflect: true,
      attribute: 'value',
      converter: new StrConverter(),
    },
    disabled: {
      reflect: true,
      attribute: 'disabled',
      converter: new BoolConverter(),
    },
    selected: {
      reflect: true,
      attribute: 'selected',
      converter: new BoolConverter(),
    },
  };

  static override styles = css`
    :host {
      display: inline-block;
      padding: 0.25em;
      border: solid 2px black;
      border-radius: 0.125em;
      vertical-align: middle;
      line-height: 1;
      cursor: pointer;
    }
    :host([selected]) {
      border-color: gray;
    }
  `;

  static override template = html`<slot></slot>`;

  public declare value: string;
  public declare disabled: boolean;
  public declare selected: boolean;

  protected declare _defaultValue: string;
  protected declare _defaultDisabled: boolean;
  protected declare _defaultSelected: boolean;
  protected declare _userInteracted: boolean;
  protected declare _internals: ElementInternals;

  constructor() {
    super();
    this.value = '';
    this.disabled = false;
    this.selected = false;
    this._defaultValue = '';
    this._defaultDisabled = false;
    this._defaultSelected = false;
    this._userInteracted = false;
    this._internals = this.attachInternals();
    this._internals.role = 'option';
  }

  get defaultValue(): string {
    return this._defaultValue;
  }

  get defaultDisabled(): boolean {
    return this._defaultDisabled;
  }

  get defaultSelected(): boolean {
    return this._defaultSelected;
  }

  toggle(): void {
    this.selected = !this.selected;
  }

  select(): void {
    this.selected = true;
  }

  deselect(): void {
    this.selected = false;
  }

  reset(): void {
    this.value = this._defaultValue;
    this.disabled = this._defaultDisabled;
    this.selected = this._defaultSelected;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this._defaultValue = this.value;
    this._defaultDisabled = this.disabled;
    this._defaultSelected = this.selected;

    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeydown);
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('value')) this.valueUpdated();
    if (props.has('disabled')) this.disabledUpdated();
    if (props.has('selected')) this.selectedUpdated();
    return super.updated(props);
  }

  protected valueUpdated(): void {
    const event = new Event('change', { bubbles: true });
    this.dispatchEvent(event);
  }

  protected disabledUpdated(): void {
    this._internals.ariaDisabled = this.disabled ? 'true' : 'false';
  }

  protected selectedUpdated(): void {
    const selected = this.selected ? 'true' : 'false';
    this._internals.ariaSelected = selected;
  }

  protected toggleSelected(): void {
    const oldValue = this.selected;
    const newValue = !this.selected;

    const beforeToggle = new ToggleEvent('beforetoggle', {
      cancelable: true,
      newState: newValue ? 'selected' : 'unselected',
      oldState: oldValue ? 'selected' : 'unselected',
    });
    const proceed = this.dispatchEvent(beforeToggle);
    if (!proceed) return;

    this.selected = newValue;

    const afterToggle = new ToggleEvent('toggle', {
      cancelable: false,
      newState: newValue ? 'selected' : 'unselected',
      oldState: oldValue ? 'selected' : 'unselected',
    });
    this.dispatchEvent(afterToggle);
  }

  protected handleClick(): void {
    this._userInteracted = true;
    this.toggleSelected();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    // Prevent space scroll
    event.preventDefault();
    this._userInteracted = true;
    this.toggleSelected();
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
