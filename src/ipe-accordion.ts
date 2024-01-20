import { isEqual } from 'moderndash';
import {
  getFirstOption,
  getLastOption,
  getSelectedOptions,
  isHTMLDisclosure,
  nextOptionOf,
  previousOptionOf,
} from './commons';
import { type HTMLOptlist, type HTMLDisclosure } from './dom';
import { IpeElement } from './ipe-element';
import { Property, attributeParsers } from './property';

// TODO: Implement min/max length, that allows the number of open items

// TODO: Add "orientation" to allow horizontal accordions

export class IpeAccordionElement
  extends IpeElement
  implements HTMLOptlist<HTMLDisclosure>
{
  protected _disabled = new Property(this, {
    name: 'disabled',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
  });

  protected _multiple = new Property(this, {
    name: 'multiple',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
  });

  protected _required = new Property(this, {
    name: 'required',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
  });

  protected _options = new Property(this, {
    name: 'options',
    equals: isEqual,
    value: [] as ReadonlyArray<HTMLDisclosure>,
  });

  protected _internals = this.attachInternals();

  protected override get template(): string {
    return `
      <style>
        :host {
          display: block;
        }
      </style>
      <slot></slot>
    `;
  }

  get disabled(): boolean {
    return this._disabled.value;
  }
  set disabled(value: boolean) {
    this._disabled.value = value;
  }

  get multiple(): boolean {
    return this._multiple.value;
  }
  set multiple(value: boolean) {
    this._multiple.value = value;
  }

  get required(): boolean {
    return this._required.value;
  }
  set required(value: boolean) {
    this._required.value = value;
  }

  get options(): Array<HTMLDisclosure> {
    return Array.from(this._options.value);
  }

  get selectedOption(): HTMLDisclosure | null {
    const options = getSelectedOptions(this._options.value);
    return options[0] ?? null;
  }

  get selectedOptions(): Array<HTMLDisclosure> {
    return getSelectedOptions(this._options.value);
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
    return getFirstOption(this._options.value);
  }

  last(): HTMLDisclosure | null {
    return getLastOption(this._options.value);
  }

  next(): HTMLDisclosure | null {
    const focused = this._options.value.find(
      (option) => option === document.activeElement,
    );
    const activeElement =
      focused ?? this.selectedOption ?? getFirstOption(this._options.value);
    if (activeElement == null) return null;
    return nextOptionOf(this._options.value, activeElement);
  }

  previous(): HTMLDisclosure | null {
    const focused = this._options.value.find(
      (option) => option === document.activeElement,
    );
    const activeElement =
      focused ?? this.selectedOption ?? getFirstOption(this._options.value);
    if (activeElement == null) return null;
    return previousOptionOf(this._options.value, activeElement);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('focusin', this.handleFocusIn);
    this.addEventListener('focusout', this.handleFocusOut);
    this.addEventListener('keydown', this.handleKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._options.value = [];
    this.removeEventListener('focusin', this.handleFocusIn);
    this.removeEventListener('focusout', this.handleFocusOut);
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
    if (name === this._disabled.name) {
      const curr = newValue as boolean;
      return this.disabledChanged(curr);
    }
    if (name === this._multiple.name) {
      const curr = newValue as boolean;
      return this.multipleChanged(curr);
    }
    if (name === this._options.name) {
      const curr = newValue as ReadonlyArray<HTMLDisclosure>;
      const prev = oldValue as ReadonlyArray<HTMLDisclosure>;
      return this.optionsChanged(curr, prev);
    }
    super.propertyChanged(name, oldValue, newValue);
  }

  protected disabledChanged(newValue: boolean): void {
    this.inert = newValue;
    this.ariaDisabled = newValue ? 'true' : 'false';
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
  }

  protected multipleChanged(newValue: boolean): void {
    this.ariaMultiSelectable = newValue ? 'true' : 'false';
    this._internals.ariaMultiSelectable = newValue ? 'true' : 'false';
  }

  protected optionsChanged(
    newValue: ReadonlyArray<HTMLDisclosure>,
    oldValue: ReadonlyArray<HTMLDisclosure>,
  ): void {
    for (const opt of oldValue) {
      this.unsubscribe(opt, 'beforetoggle', this.handleOptionBeforeToggle);
      this.unsubscribe(opt, 'toggle', this.handleOptionToggle);
    }
    for (const opt of newValue) {
      this.subscribe(opt, 'beforetoggle', this.handleOptionBeforeToggle);
      this.subscribe(opt, 'toggle', this.handleOptionToggle);
    }
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
        .then(() => this.assignSlots())
        .catch(console.error);
    }
    const options = elements.filter(isHTMLDisclosure);
    return options;
  }

  protected handleFocusIn(event: FocusEvent): void {
    if (event.target == null) return;
    for (const option of this._options.value) {
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

    const option = this._options.value.find((option) =>
      option.summaries.includes(target),
    );
    if (option == null) return;

    // Prevent scroll when focusing on accordion item
    event.preventDefault();

    let next: HTMLDisclosure | null = null;

    switch (event.key) {
      case 'ArrowDown':
        next = nextOptionOf(this._options.value, option);
        break;
      case 'ArrowUp':
        next = previousOptionOf(this._options.value, option);
        break;
      case 'Home':
        next = getFirstOption(this._options.value);
        break;
      case 'End':
        next = getLastOption(this._options.value);
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
    if (!this._required.value) return;
    const selected = getSelectedOptions(this._options.value);
    if (selected.length > 1) return;
    event.preventDefault();
  }

  protected handleOptionToggle(event: ToggleEvent): void {
    if (event.newState !== 'open') return;
    if (this._multiple.value) return;
    const selected = getSelectedOptions(this._options.value);
    for (const item of selected) {
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
