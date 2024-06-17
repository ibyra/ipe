import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import {
  type HTMLOptlist,
  type HTMLValueOption,
  asInt,
  getFirstOption,
  getLastOption,
  getOptionsValues,
  getSelectedOptions,
  isHTMLValueOption,
  nextOptionOf,
  previousOptionOf,
  html,
} from './commons';
import { BoolConverter, IntConverter } from './attributes';
import { equals, unique } from './arrays';
import {
  type FormValidity,
  IpeElementFormSingleValue,
} from './ipe-element-form';

// TODO: Add support to option group element

// TODO: Add "shift+click" to support range selection

export class IpeOptlistElement
  extends IpeElementFormSingleValue
  implements HTMLOptlist<HTMLValueOption>
{
  static override properties: PropertyDeclarations = {
    multiple: {
      reflect: true,
      attribute: 'multiple',
      converter: new BoolConverter(),
    },
    minLength: {
      reflect: true,
      attribute: 'minlength',
      converter: new IntConverter(0),
    },
    maxLength: {
      reflect: true,
      attribute: 'maxlength',
      converter: new IntConverter(Number.MAX_SAFE_INTEGER),
    },
    activeElement: {
      attribute: false,
    },
  };

  static override styles = css`
    :host {
      display: block;
    }
    slot::slotted() {
      border: none;
    }
    slot::slotted([active]) {
      background-color: rgba(255, 255, 255, 0.1);
    }
    slot::slotted([selected]) {
      background-color: rgba(255, 255, 255, 0.2);
    }
    slot::slotted([active][selected]) {
      background-color: rgba(255, 255, 255, 0.3);
    }
  `;

  static override template = html`<slot></slot>`;

  public declare multiple: boolean;
  public declare minLength: number;
  public declare maxLength: number;
  public declare activeElement: HTMLValueOption | null;

  protected declare _defaultMultiple: boolean;
  protected declare _defaultMinLength: number;
  protected declare _defaultMaxLength: number;
  protected declare _restoredValues: ReadonlyArray<string>;
  protected declare _options: ReadonlyArray<HTMLValueOption>;

  constructor() {
    super();
    this.multiple = false;
    this.minLength = 0;
    this.maxLength = Number.MAX_SAFE_INTEGER;
    this.activeElement = null;
    this._defaultMultiple = false;
    this._defaultMinLength = 0;
    this._defaultMaxLength = Number.MAX_SAFE_INTEGER;
    this._restoredValues = [];
    this._options = [];
    this._internals.role = 'grid';
  }

  get options(): Array<HTMLValueOption> {
    return Array.from(this._options);
  }

  get selectedOption(): HTMLValueOption | null {
    return getFirstOption(this.selectedOptions);
  }

  get selectedOptions(): Array<HTMLValueOption> {
    return getSelectedOptions(this._options);
  }

  toggle(option: HTMLValueOption): void {
    if (!this._options.includes(option)) {
      throw new TypeError('Option is not owned by this element.');
    }
    if (option.selected) {
      this.deselectOption(option);
      return;
    }
    this.selectOption(option);
  }

  select(option: HTMLValueOption): void {
    if (!this._options.includes(option)) {
      throw new TypeError('Option is not owned by this element.');
    }
    this.selectOption(option);
  }

  deselect(option: HTMLValueOption): void {
    if (!this._options.includes(option)) {
      throw new TypeError('Option is not owned by this element.');
    }
    this.deselectOption(option);
  }

  first(): HTMLValueOption | null {
    return getFirstOption(this._options);
  }

  last(): HTMLValueOption | null {
    return getLastOption(this._options);
  }

  next(): HTMLValueOption | null {
    const activeElement =
      this._options.find((o) => o === document.activeElement) ??
      this.selectedOption ??
      this.first();
    if (activeElement == null) return null;
    return nextOptionOf(this._options, activeElement);
  }

  previous(): HTMLValueOption | null {
    const activeElement =
      this._options.find((o) => o === document.activeElement) ??
      this.selectedOption ??
      this.first();
    if (activeElement == null) return null;
    return previousOptionOf(this._options, activeElement);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this._defaultMultiple = this.multiple;
    this._defaultMinLength = this.minLength;
    this._defaultMaxLength = this.maxLength;

    this.addEventListener('focus', this.handleFocus);
    this.addEventListener('blur', this.handleBlur);
    this.addEventListener('keydown', this.handleKeydown);
    this.updateOptions();

    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0;
    }

    const content = this.contentSlot;
    if (content != null) {
      this.subscribe(content, 'slotchange', this.handleSlotChange);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('focus', this.handleFocus);
    this.removeEventListener('blur', this.handleBlur);
    this.removeEventListener('keydown', this.handleKeydown);
    this.updateOptions();
    const content = this.contentSlot;
    if (content == null) return;
    this.unsubscribe(content, 'slotchange', this.handleSlotChange);
  }

  protected get contentSlot(): HTMLSlotElement | null {
    const slot = this.getSlot();
    return slot;
  }

  protected override get _formProps(): Array<keyof this> {
    return [...super._formProps, 'multiple', 'minLength', 'maxLength'];
  }

  protected override get _formValidity(): FormValidity {
    const formValidity = super._formValidity;

    const values = this.getOptionsValues();

    formValidity.messages.valueMissing =
      this.dataset['valueMissing'] ?? 'Required';
    formValidity.flags.valueMissing = this.required && values.length === 0;

    formValidity.messages.tooShort =
      this.dataset['tooShort'] ?? 'Select more options';
    formValidity.flags.tooShort =
      this.multiple && this.minLength > values.length;

    formValidity.messages.tooLong =
      this.dataset['tooLong'] ?? 'Select less options';
    formValidity.flags.tooLong =
      (this.multiple && this.maxLength < values.length) ||
      (!this.multiple && values.length > 1);

    return formValidity;
  }

  protected override get _formValue(): FormData | null {
    const values = this.getOptionsValues();
    if (values.length === 0) return null;
    const name = this.name;
    const formdata = new FormData();
    for (const value of values) {
      formdata.append(name, value);
    }
    return formdata;
  }

  protected override resetForm(): void {
    super.resetForm();
    this.multiple = this._defaultMultiple;
    this.minLength = this._defaultMinLength;
    this.maxLength = this._defaultMaxLength;
    for (const option of this._options) {
      option.reset();
    }
  }

  protected override restoreForm(state: FormData): void {
    super.restoreForm(state);
    if (state.has('multiple')) {
      const entry = state.get('multiple')!;
      this.multiple = entry === 'true';
    }
    if (state.has('minLength')) {
      const entry = state.get('minLength')!;
      this.minLength = asInt(Number.parseFloat(String(entry)));
    }
    if (state.has('maxLength')) {
      const entry = state.get('maxLength')!;
      this.maxLength = asInt(Number.parseFloat(String(entry)));
    }
    if (state.has('values')) {
      const entries = state.getAll('values')!;
      const values = Array.from(entries, String);
      this._restoredValues = values;
      for (const option of this._options) {
        option.selected = values.includes(option.value);
      }
    }
  }

  protected override saveForm(): void {
    const values = this.getOptionsValues();
    this._formState.delete('values');
    for (const value of values) {
      this._formState.append('values', value);
    }
    super.saveForm();
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('multiple')) this.multipleUpdated();
    if (props.has('minLength')) this.minLengthUpdated();
    if (props.has('maxLength')) this.maxLengthUpdated();
    if (props.has('activeElement')) {
      const oldValue = props.get('activeElement')!;
      this.activeElementUpdated(oldValue);
    }
    return super.updated(props);
  }

  protected multipleUpdated(): void {
    const multiple = this.multiple ? 'true' : 'false';
    this._formState.set('multiple', multiple);
    this._internals.ariaMultiSelectable = multiple;
  }

  protected minLengthUpdated(): void {
    const minLength = this.minLength.toString(10);
    this._formState.set('minLength', minLength);
  }

  protected maxLengthUpdated(): void {
    const minLength = this.minLength.toString(10);
    this._formState.set('minLength', minLength);
  }

  protected activeElementUpdated(oldValue: HTMLValueOption | null): void {
    if (oldValue != null) {
      oldValue.removeAttribute('active');
    }
    if (this.activeElement != null) {
      this.activeElement.toggleAttribute('active', true);
    }
    if (this.activeElement == null || this.activeElement.id === '') {
      this.removeAttribute('aria-activedescendant');
    } else {
      this.setAttribute('aria-activedescendant', this.activeElement.id);
    }
  }

  protected optionsUpdated(oldValue: ReadonlyArray<HTMLValueOption>): void {
    for (const option of oldValue) {
      this.unsubscribe(option, 'mouseenter', this.handleOptionMouseenter);
      this.unsubscribe(option, 'click', this.handleOptionClick);
      this.unsubscribe(option, 'beforetoggle', this.handleOptionBeforeToggle);
      this.unsubscribe(option, 'toggle', this.handleOptionToggle);
      this.unsubscribe(option, 'change', this.handleOptionChange);
    }

    for (const option of this._options) {
      this.subscribe(option, 'mouseenter', this.handleOptionMouseenter);
      this.subscribe(option, 'click', this.handleOptionClick);
      this.subscribe(option, 'beforetoggle', this.handleOptionBeforeToggle);
      this.subscribe(option, 'toggle', this.handleOptionToggle);
      this.subscribe(option, 'change', this.handleOptionChange);
    }

    if (this._restoredValues.length > 0) {
      for (const option of this._options) {
        option.selected = this._restoredValues.includes(option.value);
      }
      this._restoredValues = [];
    }

    this.saveForm();
  }

  protected async updateOptions(): Promise<void> {
    const elements = await this.getDefinedAssignedElements();
    const newValue = elements.filter(isHTMLValueOption);
    const oldValue = this._options;
    if (equals(oldValue, newValue)) return;

    this._options = newValue;
    this.optionsUpdated(oldValue);
  }

  protected getOptionsValues(): Array<string> {
    const values = unique(getOptionsValues(this.selectedOptions));
    return values;
  }

  protected canSelect(): boolean {
    return !this.readOnly;
  }

  protected canDeselect(): boolean {
    if (this.readOnly) return false;
    if (!this.required) return true;
    return this.selectedOptions.length > 1;
  }

  protected selectOption(option: HTMLValueOption): void {
    if (!this.multiple) {
      for (const other of this._options) {
        other.selected = other.value === option.value;
      }
    } else {
      for (const other of this._options) {
        if (other.value !== option.value) continue;
        other.selected = true;
      }
    }
    this.saveForm();
  }

  protected deselectOption(option: HTMLValueOption): void {
    for (const other of this._options) {
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

  protected handleSlotChange(): void {
    this.updateOptions();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleFocus(_event: FocusEvent): void {
    this.activeElement = this.selectedOption ?? this.first();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleBlur(_event: FocusEvent): void {
    this.activeElement = null;
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.target !== this) return;

    this._userInteracted = true;
    const keys = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'Enter', ' '];
    if (!keys.includes(event.key)) return;

    // Prevent scroll when focusing on accordion item
    event.preventDefault();
    if (this.activeElement == null) {
      this.activeElement = this.selectedOption ?? this.first();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const option = this.activeElement;
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
      this.activeElement = nextOptionOf(this._options, this.activeElement);
      return;
    }

    if (event.key === 'ArrowUp') {
      this.activeElement = previousOptionOf(this._options, this.activeElement);
      return;
    }

    if (event.key === 'Home') {
      this.activeElement = this.first();
      return;
    }

    if (event.key === 'End') {
      this.activeElement = this.last();
      return;
    }
  }

  protected handleOptionChange(event: Event): void {
    event.stopPropagation();
    this.saveForm();
  }

  protected handleOptionMouseenter(event: MouseEvent): void {
    if (this.ownerDocument.activeElement !== this) return;
    const option = this._options.find((o) => o === event.target);
    if (option == null) return;
    if (option.disabled) return;
    this.activeElement = option;
  }

  protected handleOptionClick(event: MouseEvent): void {
    this._userInteracted = true;
    const option = this._options.find((option) => option === event.target);
    if (option == null) return;
    if (option.disabled) return;
    event.preventDefault();
    this.activeElement = option;
  }

  protected handleOptionBeforeToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const option = this._options.find((option) => option === event.target);
    if (option == null) return;

    this._userInteracted = true;
    if (newState === 'selected' && this.canSelect()) return;
    if (newState === 'unselected' && this.canDeselect()) return;
    event.preventDefault();
  }

  protected handleOptionToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const option = this._options.find((option) => option === event.target);
    if (option == null) return;

    this._userInteracted = true;
    if (newState === 'selected') {
      this.selectNotifyOption(option);
      return;
    }

    this.deselectNotifyOption(option);
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
