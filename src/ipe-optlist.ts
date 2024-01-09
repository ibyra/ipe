import { isEqual, unique } from 'moderndash';
import { BooleanAttr, IntegerAttr } from './attributes';
import { isBoolean, isHTMLValueOption, isIterable, isString } from './commons';
import { type HTMLOptlist, type HTMLValueOption } from './dom';
import {
  type FormValidity,
  IpeElementFormSingleValue,
} from './ipe-element-form';
import { BooleanFData, IntegerFData, StringFData } from './formdata';

// TODO: Add support to option group element

export class IpeOptlistElement
  extends IpeElementFormSingleValue
  implements HTMLOptlist<HTMLValueOption>
{
  protected _multipleAttr = new BooleanAttr(this, 'multiple', false);
  protected _multipleFData = new BooleanFData('multiple', false);
  protected _multiple: boolean = false;

  protected _minLengthAttr = new IntegerAttr(this, 'minlength', 0);
  protected _minLengthFData = new IntegerFData('minlength', 0);
  protected _minLength: number = 0;

  protected _maxLengthAttr = new IntegerAttr(this, 'maxlength', Infinity);
  protected _maxLengthFData = new IntegerFData('maxlength', Infinity);
  protected _maxLength: number = Infinity;

  protected _valuesFData = new StringFData('values', '');
  protected _values: ReadonlyArray<string> = [];

  protected _activeElement: HTMLValueOption | null = null;

  protected _options: ReadonlyArray<HTMLValueOption> = [];

  protected _selectedOptions: ReadonlyArray<HTMLValueOption> = [];

  protected override get template(): string {
    return `<slot></slot>`;
  }

  get activeElement(): HTMLValueOption | null {
    return this._activeElement;
  }

  get value(): string {
    return this._values[0] ?? '';
  }
  set value(value: string) {
    if (!isString(value)) return;
    if (!this.changeValues([value])) return;
  }

  get values(): Array<string> {
    return Array.from(this._values);
  }
  set values(value: Array<string>) {
    if (!isIterable(value)) return;
    const uniq = unique(value, Object.is);
    if (!this.changeValues(uniq)) return;
    this.saveFormValue();
  }

  get multiple(): boolean {
    return this._multiple;
  }
  set multiple(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeMultiple(value)) return;
    this.saveFormValue();
  }

  get minLength(): number {
    return this._minLength;
  }
  set minLength(value: number) {
    if (!isFinite(value)) return;
    const newValue = Math.trunc(value);
    if (!this.changeMinLength(newValue)) return;
    this.saveFormValue();
  }

  get maxLength(): number {
    return this._maxLength;
  }
  set maxLength(value: number) {
    if (!isFinite(value)) return;
    const newValue = Math.trunc(value);
    if (!this.changeMaxLength(newValue)) return;
    this.saveFormValue();
  }

  get options(): Array<HTMLValueOption> {
    return Array.from(this._options);
  }

  get selectedOption(): HTMLValueOption | null {
    return this._selectedOptions[0] ?? null;
  }

  get selectedOptions(): Array<HTMLValueOption> {
    return Array.from(this._selectedOptions);
  }

  toggle(option: HTMLValueOption): void {
    if (!this._options.includes(option)) {
      throw new TypeError('Option is not owned by this select.');
    }
    if (option.selected) {
      if (!this._selectedOptions.includes(option)) return;
      if (!this.selectValue(option.value, false)) return;
      return;
    }
    if (this._selectedOptions.includes(option)) return;
    if (!this.selectValue(option.value, true)) return;
  }

  select(option: HTMLValueOption): void {
    if (!this._options.includes(option)) {
      throw new TypeError('Option is not owned by this select.');
    }
    if (this._selectedOptions.includes(option)) return;
    if (!this.selectValue(option.value, true)) return;
  }

  deselect(option: HTMLValueOption): void {
    if (!this._options.includes(option)) {
      throw new TypeError('Option is not owned by this select.');
    }
    if (!this._selectedOptions.includes(option)) return;
    if (!this.selectValue(option.value, false)) return;
  }

  first(): HTMLValueOption | null {
    return this.getFirst();
  }

  last(): HTMLValueOption | null {
    return this.getLast();
  }

  next(): HTMLValueOption | null {
    const focused = this._options.find((o) => o === document.activeElement);
    const activeElement = focused ?? this.selectedOption ?? this.getFirst();
    if (activeElement == null) return null;
    return this.nextOf(activeElement);
  }

  previous(): HTMLValueOption | null {
    const focused = this._options.find((o) => o === document.activeElement);
    const activeElement = focused ?? this.selectedOption ?? this.getFirst();
    if (activeElement == null) return null;
    return this.previousOf(activeElement);
  }

  protected override initProperties(): void {
    super.initProperties();
    this.changeMultiple(this._multipleAttr.get());
    this.changeMinLength(this._minLengthAttr.get());
    this.changeMaxLength(this._maxLengthAttr.get());
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0;
    }
  }

  protected override resetProperties(): void {
    super.resetProperties();
    const values = this.getDefaultSelected().map((option) => option.value);
    this.changeValues(values);
  }

  protected override holdListeners(): void {
    super.holdListeners();
    this.addEventListener('focus', this.handleFocus);
    this.addEventListener('blur', this.handleBlur);
    this.addEventListener('keydown', this.handleKeydown);
    this.addEventListener('click', this.handleClick);
  }

  protected override releaseListeners(): void {
    super.releaseListeners();
    this.removeEventListener('focus', this.handleFocus);
    this.removeEventListener('blur', this.handleBlur);
    this.removeEventListener('keydown', this.handleKeydown);
    this.removeEventListener('click', this.handleClick);
  }

  protected override holdSlots(): void {
    super.holdSlots();
    const options = this.assignedOptions();
    const selectedValues = this._options
      .filter((option) => !option.disabled && option.selected)
      .map((option) => option.value)
      .concat(this._values);
    const uniq = unique(selectedValues, Object.is);
    this.changeOptions(options);
    this.changeValues(uniq);
  }

  protected override releaseSlots(): void {
    super.releaseSlots();
    this.changeOptions([]);
  }

  protected override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === this._multipleAttr.name) {
      const multiple = this._multipleAttr.from(newValue);
      if (!this.changeMultiple(multiple)) return;
      this.saveFormValue();
      return;
    }
    if (name === this._multipleAttr.name) {
      const minLength = this._minLengthAttr.from(newValue);
      if (!this.changeMinLength(minLength)) return;
      this.saveFormValue();
      return;
    }
    if (name === this._maxLengthAttr.name) {
      const maxLength = this._maxLengthAttr.from(newValue);
      if (!this.changeMaxLength(maxLength)) return;
      this.saveFormValue();
      return;
    }
  }

  protected override getFormValidity(): FormValidity {
    const { flags, messages } = super.getFormValidity();
    messages.valueMissing = this.dataset['valueMissing'] ?? 'Required';
    flags.valueMissing = this.required && this._values.length === 0;

    messages.tooShort = this.dataset['tooShort'] ?? 'Select more options';
    flags.tooShort = this._multiple && this._minLength > this._values.length;

    messages.tooLong = this.dataset['tooLong'] ?? 'Select less options';
    flags.tooLong =
      (this._multiple && this._maxLength < this._values.length) ||
      (!this._multiple && this._values.length > 1);

    return { flags, messages };
  }

  protected override getFormValue(): FormData | null {
    if (this._values.length === 0) return null;
    const name = this.name;
    const formdata = new FormData();
    for (const value of this._values) {
      formdata.append(name, value);
    }
    return formdata;
  }

  protected override getFormState(): FormData {
    const state = super.getFormState();
    this._multipleFData.set(state, this._multiple);
    this._minLengthFData.set(state, this._minLength);
    this._maxLengthFData.set(state, this._maxLength);
    this._valuesFData.setAll(state, this._values);
    return state;
  }

  protected override setFormState(state: FormData): void {
    super.setFormState(state);
    this.changeMultiple(this._multipleFData.get(state));
    this.changeMinLength(this._minLengthFData.get(state));
    this.changeMinLength(this._maxLengthFData.get(state));
    this.changeValues(this._valuesFData.getAll(state));
  }

  protected override changeDisabled(newValue: boolean): boolean {
    if (!super.changeDisabled(newValue)) return false;
    this.inert = newValue;
    return true;
  }

  protected changeActiveElement(newValue: HTMLValueOption | null): boolean {
    const oldValue = this._activeElement;
    if (oldValue === newValue) return false;
    this._activeElement = newValue;
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
    return true;
  }

  protected changeOptions(newValue: ReadonlyArray<HTMLValueOption>): boolean {
    const oldValue = this._options;
    if (isEqual(oldValue, newValue)) return false;
    this._options = newValue;

    for (const option of oldValue) {
      this.unsubscribe(option, 'beforetoggle', this.handleOptionBeforeToggle);
      this.unsubscribe(option, 'toggle', this.handleOptionToggle);
      this.unsubscribe(option, 'change', this.handleOptionChange);
    }
    for (const option of newValue) {
      this.subscribe(option, 'beforetoggle', this.handleOptionBeforeToggle);
      this.subscribe(option, 'toggle', this.handleOptionToggle);
      this.subscribe(option, 'change', this.handleOptionChange);
    }

    return true;
  }

  protected changeValues(newValue: ReadonlyArray<string>): boolean {
    const oldValue = this._values;
    if (isEqual(oldValue, newValue)) return false;

    this._values = newValue;

    const defaultSelected = this.getDefaultSelected().map((o) => o.value);
    this._dirty = !isEqual(newValue, defaultSelected);

    const selectedOptions = [];
    for (const option of this._options) {
      const selected = newValue.includes(option.value);
      option.selected = selected;
      if (selected) {
        selectedOptions.push(option);
      }
    }
    this._selectedOptions = selectedOptions;

    return true;
  }

  protected changeMinLength(newValue: number): boolean {
    const oldValue = this._minLength;
    if (newValue === oldValue) return false;
    this._minLength = newValue;
    this._minLengthAttr.set(newValue);
    return true;
  }

  protected changeMaxLength(newValue: number): boolean {
    const oldValue = this._maxLength;
    if (newValue === oldValue) return false;
    this._maxLength = newValue;
    this._maxLengthAttr.set(newValue);
    return true;
  }

  protected changeMultiple(newValue: boolean): boolean {
    const oldValue = this._multiple;
    if (oldValue === newValue) return false;
    this._multiple = newValue;
    this._multipleAttr.set(newValue);
    this.ariaMultiSelectable = newValue ? 'true' : 'false';
    this._internals.ariaMultiSelectable = newValue ? 'true' : 'false';
    return true;
  }

  protected canSelect(selected: boolean): boolean {
    return (
      !this.readOnly &&
      (selected || !this._required || this._selectedOptions.length > 1)
    );
  }

  protected selectNotifyValue(value: string, selected: boolean): boolean {
    if (!this.selectValue(value, selected)) return false;
    this.notifyInput();
    this.notifyChange();
    return true;
  }

  protected selectValue(value: string, selected: boolean): boolean {
    let newValue: Array<string>;
    if (selected) {
      newValue = this._multiple ? this._values.concat(value) : [value];
    } else {
      newValue = this._multiple ? this._values.filter((v) => v === value) : [];
    }
    if (!this.changeValues(newValue)) return false;
    this.saveFormValue();
    return true;
  }

  protected getFirst(): HTMLValueOption | null {
    return this._options.find((o) => !o.disabled) ?? null;
  }

  protected getFirstSelected(): HTMLValueOption | null {
    return this._options.find((o) => !o.disabled && o.selected) ?? null;
  }

  protected getLast(): HTMLValueOption | null {
    return this._options.findLast((o) => !o.disabled) ?? null;
  }

  protected getLastSelected(): HTMLValueOption | null {
    return this._options.findLast((o) => !o.disabled && o.selected) ?? null;
  }

  protected getDefaultSelected(): Array<HTMLValueOption> {
    return this._options.filter((o) => !o.disabled && o.defaultSelected);
  }

  protected nextOf(option: HTMLValueOption): HTMLValueOption {
    const index = this._options.indexOf(option);
    for (let i = index + 1; i < this._options.length; i++) {
      const next = this._options[i];
      // @ts-expect-error Array bounds already checked
      if (!next.disabled) return next;
    }
    return option;
  }

  protected previousOf(option: HTMLValueOption): HTMLValueOption {
    const index = this._options.indexOf(option);
    for (let i = index - 1; i >= 0; i--) {
      const option = this._options[i];
      // @ts-expect-error Array bounds already checked
      if (!option.disabled) return option;
    }
    return option;
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
        .then(() => this.holdSlots())
        .catch(console.error);
    }
    const options = slot.assignedElements().filter(isHTMLValueOption);
    return options;
  }

  protected handleClick(event: MouseEvent): void {
    if (event.target !== this) return;
    this._userInteracted = true;
    // @ts-expect-error focusVisible is only implemented in Firefox
    this.focus({ focusVisible: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleFocus(_event: FocusEvent): void {
    const option = this.getFirstSelected() ?? this.getFirst();
    if (!this.changeActiveElement(option)) return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleBlur(_event: FocusEvent): void {
    if (!this.changeActiveElement(null)) return;
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.target !== this) return;
    this._userInteracted = true;
    if (this._activeElement == null) return;
    const keys = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'Enter', ' '];
    if (!keys.includes(event.key)) return;
    // Prevent scroll when focusing on accordion item
    event.preventDefault();

    if (event.key === 'Enter' || event.key === ' ') {
      const selected = !this._activeElement.selected;
      if (!this.canSelect(selected)) return;
      const value = this._activeElement.value;
      this.selectNotifyValue(value, selected);
    }
    if (event.key === 'ArrowDown') {
      const next = this.nextOf(this._activeElement);
      this.changeActiveElement(next);
      return;
    }
    if (event.key === 'ArrowUp') {
      const next = this.previousOf(this._activeElement);
      this.changeActiveElement(next);
      return;
    }
    if (event.key === 'Home') {
      const next = this.getFirst();
      this.changeActiveElement(next);
      return;
    }
    if (event.key === 'End') {
      const next = this.getLast();
      this.changeActiveElement(next);
      return;
    }
  }

  protected handleOptionChange(): void {
    for (const option of this._options) {
      const selected = this._values.includes(option.value);
      option.selected = selected;
    }
  }

  protected handleOptionBeforeToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;
    const option = this._options.find((option) => option === event.target);
    if (option == null) return;
    this._userInteracted = true;
    const selected = newState === 'selected';
    if (this.canSelect(selected)) return;
    event.preventDefault();
  }

  protected handleOptionToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;
    const option = this._options.find((option) => option === event.target);
    if (option == null) return;
    this._userInteracted = true;
    const selected = newState === 'selected';
    this.selectNotifyValue(option.value, selected);
    this.changeActiveElement(option);
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
