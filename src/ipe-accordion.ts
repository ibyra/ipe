import { isEqual } from 'moderndash';
import { BooleanAttr } from './attributes';
import { isBoolean, isHTMLDisclosure } from './commons';
import { type HTMLOptlist, type HTMLDisclosure } from './dom';
import { IpeElement } from './ipe-element';

// TODO: Implement min/max length, that allows the number of open items

// TODO: Add "orientation" to allow horizontal accordions

export class IpeAccordionElement
  extends IpeElement
  implements HTMLOptlist<HTMLDisclosure>
{
  protected _disabled = false;
  protected _disabledAttr = new BooleanAttr('disabled', this._disabled);

  protected _multiple = false;
  protected _multipleAttr = new BooleanAttr('multiple', this._multiple);

  protected _required = false;
  protected _requiredAttr = new BooleanAttr('required', this._required);

  protected _options = [] as ReadonlyArray<HTMLDisclosure>;

  protected _internals = this.attachInternals();

  protected override get template(): string {
    return `<slot></slot>`;
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeDisabled(value)) return;
  }

  get multiple(): boolean {
    return this._multiple;
  }
  set multiple(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeMultiple(value)) return;
  }

  get required(): boolean {
    return this._required;
  }
  set required(value: boolean) {
    if (!isBoolean(Boolean)) return;
    if (!this.changeRequired(value)) return;
  }

  get options(): Array<HTMLDisclosure> {
    return Array.from(this._options);
  }

  get selectedOption(): HTMLDisclosure | null {
    const options = this.getSelected();
    return options[0] ?? null;
  }

  get selectedOptions(): Array<HTMLDisclosure> {
    return this.getSelected();
  }

  toggle(option: HTMLDisclosure): void {
    option.toggle();
  }

  select(option: HTMLDisclosure): void {
    option.select();
  }

  deselect(option: HTMLDisclosure): void {
    option.deselect();
  }

  first(): HTMLDisclosure | null {
    return this.getFirst();
  }

  last(): HTMLDisclosure | null {
    return this.getLast();
  }

  next(): HTMLDisclosure | null {
    const focused = this._options.find((o) => o === document.activeElement);
    const activeElement = focused ?? this.selectedOption ?? this.getFirst();
    if (activeElement == null) return null;
    return this.nextOf(activeElement);
  }

  previous(): HTMLDisclosure | null {
    const focused = this._options.find((o) => o === document.activeElement);
    const activeElement = focused ?? this.selectedOption ?? this.getFirst();
    if (activeElement == null) return null;
    return this.previousOf(activeElement);
  }

  protected override initProperties(): void {
    super.initProperties();
    this.changeDisabled(this._disabledAttr.get(this));
    this.changeMultiple(this._multipleAttr.get(this));
    this.changeRequired(this._requiredAttr.get(this));
  }

  protected override holdSlots(): void {
    super.holdSlots();
    const options = this.assignedOptions();
    this.changeOptions(options);
  }

  protected override releaseSlots(): void {
    super.releaseSlots();
    this.changeOptions([]);
  }

  protected override holdListeners(): void {
    super.holdListeners();
    this.addEventListener('focusin', this.handleFocusIn);
    this.addEventListener('focusout', this.handleFocusOut);
    this.addEventListener('keydown', this.handleKeydown);
  }

  protected override releaseListeners(): void {
    super.releaseListeners();
    this.removeEventListener('focusin', this.handleFocusIn);
    this.removeEventListener('focusout', this.handleFocusOut);
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
    if (name === this._multipleAttr.name) {
      const multiple = this._multipleAttr.from(newValue);
      if (!this.changeMultiple(multiple)) return;
    }
    if (name === this._requiredAttr.name) {
      const required = this._requiredAttr.from(newValue);
      if (!this.changeRequired(required)) return;
    }
  }

  protected changeOptions(newValue: ReadonlyArray<HTMLDisclosure>): boolean {
    const oldValue = this._options;
    if (isEqual(oldValue, newValue)) return false;

    this._options = newValue;

    for (const opt of oldValue) {
      this.unsubscribe(opt, 'beforetoggle', this.handleOptionBeforeToggle);
      this.unsubscribe(opt, 'toggle', this.handleOptionToggle);
    }
    for (const opt of newValue) {
      this.subscribe(opt, 'beforetoggle', this.handleOptionBeforeToggle);
      this.subscribe(opt, 'toggle', this.handleOptionToggle);
    }
    return true;
  }

  protected changeDisabled(newValue: boolean): boolean {
    const oldValue = this._disabled;
    if (newValue === oldValue) return false;
    this._disabled = newValue;
    this._disabledAttr.set(this, newValue);
    this.inert = newValue;
    this.ariaDisabled = newValue ? 'true' : 'false';
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
    return true;
  }

  protected changeMultiple(newValue: boolean): boolean {
    const oldValue = this._multiple;
    if (newValue === oldValue) return false;
    this._multiple = newValue;
    this._multipleAttr.set(this, newValue);
    this.ariaMultiSelectable = newValue ? 'true' : 'false';
    this._internals.ariaMultiSelectable = newValue ? 'true' : 'false';
    return true;
  }

  protected changeRequired(newValue: boolean): boolean {
    const oldValue = this._required;
    if (newValue === oldValue) return false;
    this._required = newValue;
    this._requiredAttr.set(this, newValue);
    return true;
  }

  protected getSelected(): Array<HTMLDisclosure> {
    return this._options.filter((o) => !o.disabled && o.selected);
  }

  protected getFirst(): HTMLDisclosure | null {
    return this._options.find((o) => !o.disabled) ?? null;
  }

  protected getLast(): HTMLDisclosure | null {
    return this._options.findLast((o) => !o.disabled) ?? null;
  }

  protected nextOf(option: HTMLDisclosure): HTMLDisclosure {
    const index = this._options.indexOf(option);
    for (let i = index + 1; i < this._options.length; i++) {
      const next = this._options[i];
      // @ts-expect-error array boundaries checked
      if (!next.disabled) return next;
    }
    return option;
  }

  protected previousOf(option: HTMLDisclosure): HTMLDisclosure {
    const index = this._options.indexOf(option);
    for (let i = index - 1; i >= 0; i--) {
      const option = this._options[i];
      // @ts-expect-error array boundaries checked
      if (!option.disabled) return option;
    }
    return option;
  }

  protected assignedOptions(): Array<HTMLDisclosure> {
    if (!this.isConnected) return [];
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
    const options = elements.filter(isHTMLDisclosure);
    return options;
  }

  protected handleFocusIn(event: FocusEvent): void {
    if (event.target == null) return;
    for (const option of this._options) {
      if (option === event.target) {
        if (option.id === '') {
          this.removeAttribute('aria-activedescendant');
        } else {
          this.setAttribute('aria-activedescendant', option.id);
        }
        return;
      }
    }
    this.removeAttribute('aria-activedescendant');
  }

  protected handleFocusOut(): void {
    this.removeAttribute('aria-activedescendant');
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (!IpeAccordionElement.keys.includes(event.key)) return;

    const target = event.target;
    if (target == null || !(target instanceof Element)) return;

    const option = this._options.find((o) => o.summaries.includes(target));
    if (option == null) return;

    // Prevent scroll when focusing on accordion item
    event.preventDefault();

    let next: HTMLDisclosure | null = null;

    switch (event.key) {
      case 'ArrowDown':
        next = this.nextOf(option);
        break;
      case 'ArrowUp':
        next = this.previousOf(option);
        break;
      case 'Home':
        next = this.getFirst();
        break;
      case 'End':
        next = this.getLast();
        break;
    }

    if (next == null) return;

    for (const summary of next.summaries) {
      if (summary instanceof HTMLElement || summary instanceof SVGElement) {
        // @ts-expect-error Focus visible is currently only implemented in Firefox
        summary.focus({ preventScroll: true, focusVisible: true });
        return;
      }
    }
  }

  protected handleOptionBeforeToggle(event: ToggleEvent): void {
    if (event.newState !== 'closed') return;
    if (!this._required) return;
    if (this.selectedOptions.length > 1) return;
    event.preventDefault();
  }

  protected handleOptionToggle(event: ToggleEvent): void {
    if (event.newState !== 'open') return;
    if (this._multiple) return;
    for (const item of this.selectedOptions) {
      if (item === event.target) continue;
      item.open = false;
    }
  }

  static override get observedAttributes(): Array<string> {
    return ['disabled', 'multiple', 'required'];
  }

  protected static keys = ['Home', 'End', 'ArrowDown', 'ArrowUp'];
}

window.IpeAccordionElement = IpeAccordionElement;
window.customElements.define('ipe-accordion', IpeAccordionElement);

declare global {
  interface Window {
    IpeAccordionElement: typeof IpeAccordionElement;
  }
  interface HTMLElementTagNameMap {
    'ipe-accordion': IpeAccordionElement;
  }
}
