import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import {
  getFirstOption,
  getLastOption,
  getSelectedOptions,
  isHTMLButton,
  isHTMLDisclosure,
  nextOptionOf,
  previousOptionOf,
  html,
  type HTMLOptlist,
  type HTMLDisclosure,
} from './commons';
import { equals as arrayEquals } from './arrays';
import { BoolConverter } from './attributes';
import { IpeElement } from './ipe-element';

// TODO: Implement minimum and maximum length constraints to limit the number
//       of open items.

export class IpeAccordionElement
  extends IpeElement
  implements HTMLOptlist<HTMLDisclosure>
{
  static override properties: PropertyDeclarations = {
    disabled: {
      reflect: true,
      attribute: 'disabled',
      converter: new BoolConverter(),
    },
    multiple: {
      reflect: true,
      attribute: 'multiple',
      converter: new BoolConverter(),
    },
    required: {
      reflect: true,
      attribute: 'required',
      converter: new BoolConverter(),
    },
  };

  static override styles = css`
    :host {
      display: block;
    }
  `;

  static override template = html`<slot></slot>`;

  public declare disabled: boolean;
  public declare multiple: boolean;
  public declare required: boolean;

  protected declare _internals: ElementInternals;
  protected declare _disclosures: ReadonlyArray<HTMLDisclosure>;
  protected declare _observer: MutationObserver;

  constructor() {
    super();
    this.disabled = false;
    this.multiple = false;
    this.required = false;
    this._internals = this.attachInternals();
    this._internals.ariaOrientation = 'vertical';
    this._disclosures = [];
    this._observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        this.handleMutation(mutation);
      }
    });
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
    this._internals.ariaDisabled = this.disabled ? 'true' : 'false';
  }

  protected multipleUpdated(): void {
    this._internals.ariaMultiSelectable = this.multiple ? 'true' : 'false';
  }

  protected optionsUpdated(oldValue: ReadonlyArray<HTMLDisclosure>): void {
    this._observer.disconnect();

    for (const elem of oldValue) {
      this.unsubscribe(elem, 'beforetoggle', this.handleOptionBeforeToggle);
      this.unsubscribe(elem, 'toggle', this.handleOptionToggle);
    }

    for (const elem of this._disclosures) {
      this.subscribe(elem, 'beforetoggle', this.handleOptionBeforeToggle);
      this.subscribe(elem, 'toggle', this.handleOptionToggle);
      this._observer.observe(elem, { attributeFilter: ['open'] });
    }

    this.openUpdated();
  }

  protected openUpdated(): void {
    for (const elem of this._disclosures) {
      if (elem.open) {
        this._internals.states.add('open');
        return;
      }
    }
    this._internals.states.delete('open');
  }

  protected async updateOptions(): Promise<void> {
    const elements = await this.getDefinedAssignedElements();
    const newValue = elements.filter(isHTMLDisclosure);
    const oldValue = this._disclosures;

    if (arrayEquals(oldValue, newValue)) return;

    this._disclosures = newValue;
    this.optionsUpdated(oldValue);
  }

  protected handleMutation(mutation: MutationRecord): void {
    if (mutation.type !== 'attributes') return;

    const { attributeName } = mutation;
    if (attributeName !== 'open') return;

    const { target } = mutation;
    if (!(target instanceof Element)) return;

    const content = this.contentSlot;
    if (target.assignedSlot !== content) return;

    this.openUpdated();
  }

  protected handleSlotChange(): void {
    this.updateOptions();
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

  protected handleOptionBeforeToggle(event: ToggleEvent): void {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
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
