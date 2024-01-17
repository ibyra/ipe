import { isEqual, unique } from 'moderndash';
import {
  asInt,
  getFirstOption,
  getLastOption,
  getOptionsValues,
  getSelectedOptions,
  isHTMLValueOption,
  nextOptionOf,
  previousOptionOf,
} from './commons';
import { type HTMLOptlist, type HTMLValueOption } from './dom';
import {
  type FormValidity,
  IpeElementFormSingleValue,
} from './ipe-element-form';
import {
  FormProperty,
  Property,
  attributeParsers,
  formDataParsers,
} from './property';

// TODO: Add support to option group element

// TODO: Add "shift+click" to support range selection

// TODO: Store/restore values on form state

export class IpeOptlistElement
  extends IpeElementFormSingleValue
  implements HTMLOptlist<HTMLValueOption>
{
  protected _options = new Property(this, {
    name: 'options',
    value: [] as ReadonlyArray<HTMLValueOption>,
    equals: isEqual,
  });

  protected _activeElement = new Property(this, {
    name: 'activeElement',
    value: null as HTMLValueOption | null,
  });

  protected _multiple = new FormProperty(this, {
    name: 'multiple',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
    form: formDataParsers.bool,
  });

  protected _minLength = new FormProperty(this, {
    name: 'minlength',
    value: 0,
    cast: asInt,
    attribute: attributeParsers.int,
    form: formDataParsers.int,
  });

  protected _maxLength = new FormProperty(this, {
    name: 'maxlength',
    value: Number.MAX_SAFE_INTEGER,
    cast: asInt,
    attribute: attributeParsers.int,
    form: formDataParsers.int,
  });

  protected override get template(): string {
    return `
      <style>
        :host {
          display: block;
        }
        ::slotted([active]) {
          background-color: rgba(255, 255, 255, 0.1);
        }
        ::slotted([selected]) {
          background-color: rgba(255, 255, 255, 0.2);
        }
        ::slotted([active][selected]) {
          background-color: rgba(255, 255, 255, 0.3);
        }
      </style>
      <slot></slot>
    `;
  }

  get activeElement(): HTMLValueOption | null {
    return this._activeElement.value;
  }

  get value(): string {
    const selected = getSelectedOptions(this._options.value);
    const values = unique(getOptionsValues(selected));
    return values[0] ?? '';
  }
  set value(value: string) {
    const option = this._options.value.find((o) => o.value === value);
    if (option == null) return;
    this.selectOption(option);
  }

  get values(): Array<string> {
    const selected = getSelectedOptions(this._options.value);
    const values = unique(getOptionsValues(selected));
    return values;
  }
  set values(value: Array<string>) {
    const options = this._options.value.filter((o) => value.includes(o.value));
    for (const option of options) {
      this.selectOption(option);
    }
  }

  get multiple(): boolean {
    return this._multiple.value;
  }
  set multiple(value: boolean) {
    this._multiple.value = value;
  }

  get minLength(): number {
    return this._minLength.value;
  }
  set minLength(value: number) {
    this._minLength.value = value;
  }

  get maxLength(): number {
    return this._maxLength.value;
  }
  set maxLength(value: number) {
    this._maxLength.value = value;
  }

  get options(): Array<HTMLValueOption> {
    return Array.from(this._options.value);
  }

  get selectedOption(): HTMLValueOption | null {
    return getFirstOption(getSelectedOptions(this._options.value));
  }

  get selectedOptions(): Array<HTMLValueOption> {
    return getSelectedOptions(this._options.value);
  }

  override get formValidity(): FormValidity {
    const { flags, messages } = super.formValidity;

    const selected = getSelectedOptions(this._options.value);
    const values = unique(getOptionsValues(selected));

    messages.valueMissing = this.dataset['valueMissing'] ?? 'Required';
    flags.valueMissing = this._required.value && values.length === 0;

    messages.tooShort = this.dataset['tooShort'] ?? 'Select more options';
    flags.tooShort =
      this._multiple.value && this._minLength.value > values.length;

    messages.tooLong = this.dataset['tooLong'] ?? 'Select less options';
    flags.tooLong =
      (this._multiple.value && this._maxLength.value < values.length) ||
      (!this._multiple.value && values.length > 1);

    return { flags, messages };
  }

  override get formValue(): FormData | null {
    const selected = getSelectedOptions(this._options.value);
    const values = unique(getOptionsValues(selected));
    if (values.length === 0) return null;
    const name = this.name;
    const formdata = new FormData();
    for (const value of values) {
      formdata.append(name, value);
    }
    return formdata;
  }

  toggle(option: HTMLValueOption): void {
    if (!this._options.value.includes(option)) {
      throw new TypeError('Option is not owned by this select.');
    }
    if (option.selected) {
      this.deselectOption(option);
      return;
    }
    this.selectOption(option);
  }

  select(option: HTMLValueOption): void {
    if (!this._options.value.includes(option)) {
      throw new TypeError('Option is not owned by this select.');
    }
    this.selectOption(option);
  }

  deselect(option: HTMLValueOption): void {
    if (!this._options.value.includes(option)) {
      throw new TypeError('Option is not owned by this select.');
    }
    this.deselectOption(option);
  }

  first(): HTMLValueOption | null {
    return getFirstOption(this._options.value);
  }

  last(): HTMLValueOption | null {
    return getLastOption(this._options.value);
  }

  next(): HTMLValueOption | null {
    const activeElement =
      this._options.value.find((o) => o === document.activeElement) ??
      getFirstOption(getSelectedOptions(this._options.value)) ??
      getFirstOption(this._options.value);
    if (activeElement == null) return null;
    return nextOptionOf(this._options.value, activeElement);
  }

  previous(): HTMLValueOption | null {
    const activeElement =
      this._options.value.find((o) => o === document.activeElement) ??
      getFirstOption(getSelectedOptions(this._options.value)) ??
      getFirstOption(this._options.value);
    if (activeElement == null) return null;
    return previousOptionOf(this._options.value, activeElement);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('blur', this.handleBlur);
    this.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._options.value = [];
    this.removeEventListener('blur', this.handleBlur);
    this.removeEventListener('keydown', this.handleKeydown);
  }

  override assignSlots(): void {
    super.assignSlots();
    const options = this.assignedOptions();
    this._options.value = options;
  }

  override propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === this._activeElement.name) {
      const curr = newValue as HTMLValueOption | null;
      const prev = oldValue as HTMLValueOption | null;
      return this.activeElementChanged(curr, prev);
    }
    if (name === this._options.name) {
      const curr = newValue as ReadonlyArray<HTMLValueOption>;
      const prev = oldValue as ReadonlyArray<HTMLValueOption>;
      return this.optionsChanged(curr, prev);
    }
    if (name === this._multiple.name) {
      const curr = newValue as boolean;
      return this.multipleChanged(curr);
    }
    return super.propertyChanged(name, oldValue, newValue);
  }

  protected override disabledChanged(newValue: boolean): void {
    super.disabledChanged(newValue);
    this.inert = newValue;
  }

  protected activeElementChanged(
    newValue: HTMLValueOption | null,
    oldValue: HTMLValueOption | null,
  ): void {
    if (oldValue != null) {
      oldValue.removeAttribute('active');
    }
    if (newValue != null) {
      newValue.toggleAttribute('active', true);
    }
    if (newValue == null || newValue.id === '') {
      this.removeAttribute('aria-activedescendant');
    } else {
      this.setAttribute('aria-activedescendant', newValue.id);
    }
  }

  protected optionsChanged(
    newValue: ReadonlyArray<HTMLValueOption>,
    oldValue: ReadonlyArray<HTMLValueOption>,
  ): void {
    for (const option of oldValue) {
      this.unsubscribe(option, 'change', this.handleOptionChange);
      this.unsubscribe(option, 'click', this.handleOptionClick);
      this.unsubscribe(option, 'beforetoggle', this.handleOptionBeforeToggle);
      this.unsubscribe(option, 'toggle', this.handleOptionToggle);
    }

    for (const option of newValue) {
      this.subscribe(option, 'change', this.handleOptionChange);
      this.subscribe(option, 'click', this.handleOptionClick);
      this.subscribe(option, 'beforetoggle', this.handleOptionBeforeToggle);
      this.subscribe(option, 'toggle', this.handleOptionToggle);
    }

    this.saveForm();
  }

  protected valuesChanged(newValue: ReadonlyArray<string>): void {
    for (const option of this._options.value) {
      option.selected = newValue.includes(option.value);
    }
  }

  protected multipleChanged(newValue: boolean): void {
    this.ariaMultiSelectable = newValue ? 'true' : 'false';
    this._internals.ariaMultiSelectable = newValue ? 'true' : 'false';
  }

  protected canSelect(): boolean {
    return !this._readOnly.value;
  }

  protected canDeselect(): boolean {
    if (this.readOnly) return false;
    if (!this._required.value) return true;
    const selected = getSelectedOptions(this._options.value);
    return selected.length > 1;
  }

  protected selectOption(option: HTMLValueOption): void {
    if (!this._multiple.value) {
      for (const other of this._options.value) {
        other.selected = other.value === option.value;
      }
    } else {
      for (const other of this._options.value) {
        if (other.value !== option.value) continue;
        other.selected = true;
      }
    }
    this.saveForm();
  }

  protected deselectOption(option: HTMLValueOption): void {
    for (const other of this._options.value) {
      if (other.value !== option.value) continue;
      other.selected = false;
    }
    this.saveForm();
  }

  protected selectNotifyOption(option: HTMLValueOption): void {
    this.selectOption(option);
    this.notifyInput();
    this.notifyChange();
  }

  protected deselectNotifyOption(option: HTMLValueOption): void {
    this.deselectOption(option);
    this.notifyInput();
    this.notifyChange();
  }

  protected assignedOptions(): Array<HTMLValueOption> {
    const slot = this.getShadowRootSlot();
    if (slot == null) return [];
    const elements = slot.assignedElements();
    const notDefined = elements.filter((e) => e.matches(':not(:defined)'));
    const localNames = new Set(Array.from(notDefined, (e) => e.localName));
    for (const localName of localNames) {
      window.customElements
        .whenDefined(localName)
        .then(() => this.assignSlots())
        .catch(console.error);
    }
    const options = elements.filter(isHTMLValueOption);
    return options;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleBlur(_event: FocusEvent): void {
    this._activeElement.value = null;
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.target !== this) return;

    this._userInteracted = true;
    const keys = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'Enter', ' '];
    if (!keys.includes(event.key)) return;

    // Prevent scroll when focusing on accordion item
    event.preventDefault();
    if (this._activeElement.value == null) {
      this._activeElement.value =
        getFirstOption(getSelectedOptions(this._options.value)) ??
        getFirstOption(this._options.value);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const option = this._activeElement.value;
      const selected = !option.selected;
      if (selected) {
        if (!this.canSelect()) return;
        this.selectNotifyOption(option);
        return;
      }
      if (!this.canDeselect()) return;
      this.deselectNotifyOption(option);
      return;
    }

    if (event.key === 'ArrowDown') {
      this._activeElement.value = nextOptionOf(
        this._options.value,
        this._activeElement.value,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      this._activeElement.value = previousOptionOf(
        this._options.value,
        this._activeElement.value,
      );
      return;
    }

    if (event.key === 'Home') {
      this._activeElement.value = getFirstOption(this._options.value);
      return;
    }

    if (event.key === 'End') {
      this._activeElement.value = getLastOption(this._options.value);
      return;
    }
  }

  protected handleOptionChange(): void {
    this.saveForm();
  }

  protected handleOptionClick(event: MouseEvent): void {
    this._userInteracted = true;
    const option = this._options.value.find((o) => o === event.target);
    if (option == null) return;

    event.preventDefault();
    this._activeElement.value = option;
  }

  protected handleOptionBeforeToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const option = this._options.value.find((o) => o === event.target);
    if (option == null) return;

    this._userInteracted = true;
    if (newState === 'selected' && this.canSelect()) return;
    if (newState === 'unselected' && this.canDeselect()) return;
    event.preventDefault();
  }

  protected handleOptionToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const option = this._options.value.find((o) => o === event.target);
    if (option == null) return;

    this._userInteracted = true;
    if (newState === 'selected') {
      this.selectNotifyOption(option);
      return;
    }

    this.deselectNotifyOption(option);
    return;
  }

  public static override get observedAttributes(): Array<string> {
    return [...super.observedAttributes, 'minlength', 'maxlength'];
  }
}

window.IpeOptlistElement = IpeOptlistElement;

window.customElements.define('ipe-optlist', IpeOptlistElement);

declare global {
  interface Window {
    IpeOptlistElement: typeof IpeOptlistElement;
  }

  interface HTMLElementTagNameMap {
    'ipe-optlist': IpeOptlistElement;
  }
}
