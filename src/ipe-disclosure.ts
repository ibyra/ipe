import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import {
  type HTMLDisclosure,
  type HTMLButton,
  isHTMLButton,
  html,
} from './commons';
import { BoolConverter, IntConverter, StrConverter } from './attributes';
import { equals as arrayEquals } from './arrays';
import { IpeElement } from './ipe-element';

// TODO: Add "orientation" to allow horizontal accordions

// TODO: Add support for "role=button" to be a summary

export class IpeDisclosureElement extends IpeElement implements HTMLDisclosure {
  static override properties: PropertyDeclarations = {
    id: {
      reflect: true,
      attribute: 'id',
      converter: new StrConverter(''),
    },
    open: {
      reflect: false,
      attribute: 'open',
      converter: new BoolConverter(),
    },
    disabled: {
      reflect: true,
      attribute: 'disabled',
      converter: new BoolConverter(),
    },
    duration: {
      reflect: true,
      attribute: 'duration',
      converter: new IntConverter(150),
    },
    delay: {
      reflect: true,
      attribute: 'delay',
      converter: new IntConverter(0),
    },
    easing: {
      reflect: true,
      attribute: 'easing',
      converter: new StrConverter('ease-in-out'),
    },
  };

  static override styles = css`
    :host {
      display: block;
      overflow: hidden;
    }
    #content {
      display: none;
    }
    :host([open]) #content {
      display: contents;
    }
  `;

  static override template = html`
    <slot id="summary" name="summary" part="summary"></slot>
    <slot id="content" part="content"></slot>
  `;

  public declare open: boolean;
  public declare disabled: boolean;
  public declare duration: number;
  public declare delay: number;
  public declare easing: string;

  protected declare _animation: Animation | null;
  protected declare _internals: ElementInternals;
  protected declare _buttons: ReadonlyArray<HTMLButton>;
  protected declare _observer: MutationObserver;

  constructor() {
    super();
    this.open = false;
    this.disabled = false;
    this.duration = 150;
    this.delay = 0;
    this.easing = 'ease-in-out';
    this._animation = null;
    this._internals = this.attachInternals();
    this._internals.ariaOrientation = 'vertical';
    this._buttons = [];
    this._observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        this.handleMutation(mutation);
      }
    });
  }

  get selected(): boolean {
    return this.open;
  }
  set selected(value: boolean) {
    this.open = value;
  }

  get buttons(): Array<HTMLButton> {
    return Array.from(this._buttons);
  }

  toggle(): void {
    this.open = !this.open;
  }

  select(): void {
    this.open = true;
  }

  deselect(): void {
    this.open = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.updateButtons();
    this._observer.observe(this, { subtree: true, attributeFilter: ['type'] });
    const summary = this.summarySlot;
    if (summary == null) return;
    this.subscribe(summary, 'slotchange', this.handleSummarySlotChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.updateButtons();
    this._observer.disconnect();
    const summary = this.summarySlot;
    if (summary == null) return;
    this.unsubscribe(summary, 'slotchange', this.handleSummarySlotChange);
  }

  protected get summarySlot(): HTMLSlotElement | null {
    const element = this.getSlot('summary');
    return element;
  }

  protected get contentSlot(): HTMLSlotElement | null {
    const element = this.getSlot();
    return element;
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('id')) this.idUpdated();
    if (props.has('disabled')) this.disabledUpdated();
    if (props.has('open')) this.openUpdated();
    return super.updated(props);
  }

  protected idUpdated(): void {
    for (const element of this._buttons) {
      if (this.id === '') {
        element.removeAttribute('aria-controls');
      } else {
        element.setAttribute('aria-controls', this.id);
      }
    }
  }

  protected disabledUpdated(): void {
    this._internals.ariaDisabled = this.disabled ? 'true' : 'false';
    for (const button of this.buttons) {
      button.disabled = this.disabled;
    }
  }

  protected openUpdated(): void {
    this._internals.ariaExpanded = this.open ? 'true' : 'false';

    if (this._animation != null) this._animation.cancel();

    const startHeight = `${this.offsetHeight}px`;

    if (this.open) {
      this.toggleAttribute('open', true);
      const endHeight = `${this.offsetHeight}px`;
      for (const element of this.buttons) {
        element.ariaExpanded = 'true';
      }
      this._internals.states.add('opening');
      this._animation = this.animate(
        { height: [startHeight, endHeight] },
        { duration: this.duration, delay: this.delay, easing: this.easing },
      );
      this.subscribe(this._animation, 'cancel', this.handleOpenAnimationEnd);
      this.subscribe(this._animation, 'finish', this.handleOpenAnimationEnd);
    } else {
      for (const element of this.buttons) {
        element.ariaExpanded = 'false';
      }
      const summary = this.summarySlot!;
      summary.style.setProperty('display', 'block');
      const rect = summary.getBoundingClientRect();
      summary.style.removeProperty('display');
      const height = rect.height;
      const endHeight = `${height}px`;
      this._internals.states.add('closing');
      this._animation = this.animate(
        { height: [startHeight, endHeight] },
        { duration: this.duration, delay: this.delay, easing: this.easing },
      );
      this.subscribe(this._animation, 'cancel', this.handleCloseAnimationEnd);
      this.subscribe(this._animation, 'finish', this.handleCloseAnimationEnd);
    }
  }

  protected buttonsUpdated(oldValue: ReadonlyArray<HTMLButton>): void {
    for (const element of oldValue) {
      this.unsubscribe(element, 'click', this.handleButtonClick);
      element.ariaExpanded = null;
      element.removeAttribute('aria-controls');
    }

    for (const element of this._buttons) {
      this.subscribe(element, 'click', this.handleButtonClick);
      element.disabled = this.disabled;
      element.ariaExpanded = this.open ? 'true' : 'false';
      if (this.id === '') {
        element.removeAttribute('aria-controls');
      } else {
        element.setAttribute('aria-controls', this.id);
      }
    }
  }

  protected async updateButtons(): Promise<void> {
    const elements = await this.getDefinedAssignedElements('summary');
    const newValue = elements.filter(isHTMLButton);
    const oldValue = this._buttons;
    if (arrayEquals(oldValue, newValue)) return;

    this._buttons = newValue;
    this.buttonsUpdated(oldValue);
  }

  protected toggleOpen(): void {
    const newValue = !this.open;
    const oldValue = this.open;

    const beforeToggle = new ToggleEvent('beforetoggle', {
      cancelable: true,
      newState: newValue ? 'open' : 'closed',
      oldState: oldValue ? 'open' : 'closed',
    });
    const proceed = this.dispatchEvent(beforeToggle);
    if (!proceed) return;

    this.open = newValue;

    const afterToggle = new ToggleEvent('toggle', {
      cancelable: false,
      newState: this.open ? 'open' : 'closed',
      oldState: oldValue ? 'open' : 'closed',
    });
    this.dispatchEvent(afterToggle);
  }

  protected handleMutation(mutation: MutationRecord) {
    if (mutation.type !== 'attributes') return;

    const { target } = mutation;
    if (!(target instanceof Element)) return;

    const summary = this.summarySlot;
    if (target.assignedSlot !== summary) return;

    this.updateButtons();
  }

  protected handleSummarySlotChange(): void {
    this.updateButtons();
  }

  protected handleButtonClick(): void {
    this.toggleOpen();
  }

  protected handleOpenAnimationEnd(): void {
    this._animation = null;
    this._internals.states.delete('opening');
  }

  protected handleCloseAnimationEnd(): void {
    this._animation = null;
    this.toggleAttribute('open', false);
    this._internals.states.delete('closing');
  }
}

window.IpeDisclosureElement = IpeDisclosureElement;
window.customElements.define('ipe-disclosure', IpeDisclosureElement);

declare global {
  interface Window {
    IpeDisclosureElement: typeof IpeDisclosureElement;
  }
  interface HTMLElementTagNameMap {
    'ipe-disclosure': IpeDisclosureElement;
  }
}
