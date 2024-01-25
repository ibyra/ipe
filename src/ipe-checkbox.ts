import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import {
  type Checked,
  asChecked,
  CheckedAttributeConverter,
  StringAttributeConverter,
} from './commons';
import {
  type FormValidity,
  IpeElementFormSingleValue,
} from './ipe-element-form';

export class IpeCheckboxElement extends IpeElementFormSingleValue {
  static override properties: PropertyDeclarations = {
    ...super.properties,
    value: {
      reflect: true,
      attribute: 'value',
      converter: new StringAttributeConverter('on'),
    },
    checked: {
      reflect: true,
      attribute: 'checked',
      converter: new CheckedAttributeConverter(),
    },
  };

  static override styles = css`
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
  `;

  static override content = `
    <slot></slot>
  `;

  public declare value: string;
  public declare checked: Checked;

  protected declare _defaultValue: string;
  protected declare _defaultChecked: Checked;

  constructor() {
    super();
    this.value = 'on';
    this.checked = 'false';
    this._defaultValue = 'on';
    this._defaultChecked = 'false';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._defaultValue = this.value;
    this._defaultChecked = this.checked;

    this._internals.role = 'checkbox';

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

  protected override get _formProps(): Array<keyof this> {
    return [...super._formProps, 'value', 'checked'];
  }

  public override get _formValidity(): FormValidity {
    const formValidity = super._formValidity;
    formValidity.flags.valueMissing = this.required && this.checked !== 'true';
    formValidity.messages.valueMissing =
      this.dataset['valueMissing'] ?? 'Required';
    return formValidity;
  }

  public override get _formValue(): FormData | null {
    if (this.checked !== 'true') return null;
    const value = new FormData();
    value.set(this.name, this.value);
    return value;
  }

  protected override resetForm(): void {
    super.resetForm();
    this.value = this._defaultValue;
    this.checked = this._defaultChecked;
  }

  protected override restoreForm(state: FormData): void {
    super.restoreForm(state);
    if (state.has('value')) {
      this.value = String(state.get('value'));
    }
    if (state.has('checked')) {
      this.checked = asChecked(state.get('checked'));
    }
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('value')) this.valueUpdated();
    if (props.has('checked')) this.checkedUpdated();
    return super.updated(props);
  }

  protected valueUpdated(): void {
    this._formState.set('value', this.value);
  }

  protected checkedUpdated(): void {
    this._formState.set('checked', this.checked);
    this._internals.ariaChecked = this.checked;
    this.ariaChecked = this.checked;
  }

  protected handleClick(event: MouseEvent): void {
    // Prevent double handling click when the checkbox is inside a <label>.
    event.preventDefault();
    this._userInteracted = true;
    const checked = this.checked === 'false' ? 'true' : 'false';
    this.checked = checked;
    this.notifyInput();
    this.notifyChange();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    // Spaces should change the checkbox check value
    if (event.key !== ' ') return;
    // Prevent space scroll
    event.preventDefault();
    this._userInteracted = true;
    const checked = this.checked === 'false' ? 'true' : 'false';
    this.checked = checked;
    this.notifyInput();
    this.notifyChange();
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
