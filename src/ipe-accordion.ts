import { isEqual } from 'moderndash';
import { css, type PropertyValues } from 'lit';
import {
  getFirstOption,
  getLastOption,
  getSelectedOptions,
  isHTMLButton,
  isHTMLDisclosure,
  nextOptionOf,
  previousOptionOf,
  BoolAttributeConverter,
} from './commons';
import { type HTMLOptlist, type HTMLDisclosure } from './commons';
import { IpeElement } from './ipe-element';

// TODO: Implement min/max length, that allows the number of open items

// TODO: Add "orientation" to allow horizontal accordions

// TODO: Add custom pseudo class state when the accordion is open or not.
//       This requires ElementInternals.states to be available on browsers.

export class IpeAccordionElement
  extends IpeElement
  implements HTMLOptlist<HTMLDisclosure>
{
  static override properties = {
    disabled: {
      reflect: true,
      attribute: 'disabled',
      converter: new BoolAttributeConverter(),
    },
    multiple: {
      reflect: true,
      attribute: 'multiple',
      converter: new BoolAttributeConverter(),
    },
    required: {
      reflect: true,
      attribute: 'required',
      converter: new BoolAttributeConverter(),
    },
  };

  static override styles = css`
    :host {
      display: block;
    }
  `;

  static override content = `
    <slot></slot>
  `;

  public declare disabled: boolean;
  public declare multiple: boolean;
  public declare required: boolean;

  protected declare _internals: ElementInternals;
  protected declare _disclosures: Array<HTMLDisclosure>;
  protected declare _observer: MutationObserver;

  constructor() {
    super();
    this.disabled = false;
    this.multiple = false;
    this.required = false;
    this._internals = this.attachInternals();
    this._disclosures = [];
  }

  get options(): Array<HTMLDisclosure> {
    return Array.from(this._disclosures);
  }

  get selectedOption(): HTMLDisclosure | null {
    const options = getSelectedOptions(this._disclosures);
    return options[0] ?? null;
  }

  get selectedOptions(): Array<HTMLDisclosure> {
    return getSelectedOptions(this._disclosures);
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
    return getFirstOption(this._disclosures);
  }

  last(): HTMLDisclosure | null {
    return getLastOption(this._disclosures);
  }

  next(): HTMLDisclosure | null {
    const focused = this._disclosures.find((o) => o === document.activeElement);
    const activeElement =
      focused ?? this.selectedOption ?? getFirstOption(this._disclosures);
    if (activeElement == null) return null;
    return nextOptionOf(this._disclosures, activeElement);
  }

  previous(): HTMLDisclosure | null {
    const focused = this._disclosures.find((o) => o === document.activeElement);
    const activeElement =
      focused ?? this.selectedOption ?? getFirstOption(this._disclosures);
    if (activeElement == null) return null;
    return previousOptionOf(this._disclosures, activeElement);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('focusin', this.handleFocusIn);
    this.addEventListener('focusout', this.handleFocusOut);
    this.addEventListener('keydown', this.handleKeydown);
    this.updateOptions();
    const content = this.contentSlot;
    if (content == null) return;
    this.subscribe(content, 'slotchange', this.handleSlotChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('focusin', this.handleFocusIn);
    this.removeEventListener('focusout', this.handleFocusOut);
    this.removeEventListener('keydown', this.handleKeydown);
    this.updateOptions();
    const content = this.contentSlot;
    if (content == null) return;
    this.unsubscribe(content, 'slotchange', this.handleSlotChange);
  }

  protected get contentSlot(): HTMLSlotElement | null {
    const element = this.getSlot();
    return element;
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('disabled')) this.disabledUpdated();
    if (props.has('multiple')) this.multipleUpdated();
    return super.updated(props);
  }

  protected disabledUpdated(): void {
    this.inert = this.disabled;
    this.ariaDisabled = this.disabled ? 'true' : 'false';
    this._internals.ariaDisabled = this.disabled ? 'true' : 'false';
  }

  protected multipleUpdated(): void {
    this.ariaMultiSelectable = this.multiple ? 'true' : 'false';
    this._internals.ariaMultiSelectable = this.multiple ? 'true' : 'false';
  }

  protected optionsUpdated(oldValue: ReadonlyArray<HTMLDisclosure>): void {
    for (const elem of oldValue) {
      this.unsubscribe(elem, 'beforetoggle', this.handleOptionBeforeToggle);
      this.unsubscribe(elem, 'toggle', this.handleOptionToggle);
    }

    for (const elem of this._disclosures) {
      this.subscribe(elem, 'beforetoggle', this.handleOptionBeforeToggle);
      this.subscribe(elem, 'toggle', this.handleOptionToggle);
    }
  }

  protected async updateOptions(): Promise<void> {
    const elements = await this.getDefinedAssignedElements();
    const newValue = elements.filter(isHTMLDisclosure);
    const oldValue = this._disclosures;

    if (isEqual(oldValue, newValue)) return;

    this._disclosures = newValue;
    this.optionsUpdated(oldValue);
  }

  protected handleFocusIn(event: FocusEvent): void {
    if (event.target == null) return;
    for (const option of this._disclosures) {
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
    const keys = ['Home', 'End', 'ArrowDown', 'ArrowUp'];
    if (!keys.includes(event.key)) return;

    const target = event.target;
    if (target == null || !isHTMLButton(target)) return;

    const disclosure = this._disclosures.find((d) =>
      d.buttons.includes(target),
    );
    if (disclosure == null) return;

    // Prevent scroll when focusing on accordion item
    event.preventDefault();

    let next: HTMLDisclosure | null = null;

    switch (event.key) {
      case 'ArrowDown':
        next = nextOptionOf(this._disclosures, disclosure);
        break;
      case 'ArrowUp':
        next = previousOptionOf(this._disclosures, disclosure);
        break;
      case 'Home':
        next = getFirstOption(this._disclosures);
        break;
      case 'End':
        next = getLastOption(this._disclosures);
        break;
    }

    if (next == null) return;

    const button = next.buttons[0];
    if (button == null) return;

    // @ts-expect-error Focus visible is currently only implemented in Firefox
    button.focus({ preventScroll: true, focusVisible: true });
  }

  protected handleSlotChange(): void {
    this.updateOptions();
  }

  protected handleOptionBeforeToggle(event: ToggleEvent): void {
    if (event.newState !== 'closed') return;
    if (!this.required) return;
    const selected = getSelectedOptions(this._disclosures);
    if (selected.length > 1) return;
    event.preventDefault();
  }

  protected handleOptionToggle(event: ToggleEvent): void {
    if (event.newState !== 'open') return;
    if (this.multiple) return;
    const selected = getSelectedOptions(this._disclosures);
    for (const item of selected) {
      if (item === event.target) continue;
      item.open = false;
    }
  }
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
