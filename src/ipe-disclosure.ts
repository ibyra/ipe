import { isEqual } from 'moderndash';
import { asInt, isHTMLButton } from './commons';
import { type HTMLDisclosure, type HTMLButton } from './dom';
import { IpeElement } from './ipe-element';
import { attributeParsers, Property } from './property';

// TODO: Add "orientation" to allow horizontal accordions

// TODO: Add support for "role=button" to be a summary

export class IpeDisclosureElement extends IpeElement implements HTMLDisclosure {
  protected _disabled = new Property(this, {
    name: 'disabled',
    cast: Boolean,
    value: false,
    attribute: attributeParsers.bool,
  });

  protected _open = new Property(this, { name: 'open', value: false });

  protected _duration = new Property(this, {
    name: 'duration',
    cast: asInt,
    value: 150,
    attribute: attributeParsers.int,
  });

  protected _delay = new Property(this, {
    name: 'delay',
    cast: asInt,
    value: 0,
    attribute: attributeParsers.int,
  });

  protected _easing = new Property(this, {
    name: 'easing',
    cast: String,
    value: 'ease-in-out',
    attribute: attributeParsers.str,
  });

  protected _summaries = new Property(this, {
    name: 'summaries',
    equals: isEqual,
    value: [] as ReadonlyArray<HTMLButton>,
  });

  protected _animation: Animation | null = null;

  protected _internals: ElementInternals = this.attachInternals();

  protected override get template(): string {
    return `
      <style>
        :host {
          display: block;
          overflow: hidden;
        }
        :host #content {
          display: none;
        }
        :host([open]) #content {
          display: unset;
        }
      </style>
      <slot id="summary" name="summary" part="summary"></slot>
      <slot id="content" part="content"></slot>
    `;
  }

  override get id(): string {
    return super.id;
  }

  override set id(value: string) {
    super.id = value;
    this.idChanged(super.id);
  }

  get disabled(): boolean {
    return this._disabled.value;
  }
  set disabled(value: boolean) {
    this._disabled.value = value;
  }

  get open(): boolean {
    return this._open.value;
  }
  set open(value: boolean) {
    this._open.value = value;
  }

  get selected(): boolean {
    // console.log(this, this._open.value);
    return this._open.value;
  }
  set selected(value: boolean) {
    this._open.value = value;
  }

  get duration(): number {
    return this._duration.value;
  }
  set duration(value: number) {
    this._duration.value = value;
  }

  get delay(): number {
    return this._delay.value;
  }
  set delay(value: number) {
    this._delay.value = value;
  }

  get easing(): string {
    return this._easing.value;
  }
  set easing(value: string) {
    this._easing.value = value;
  }

  get summaries(): Array<Element> {
    return Array.from(this._summaries.value);
  }

  toggle(): void {
    this._open.value = !this._open.value;
  }

  select(): void {
    this._open.value = true;
  }

  deselect(): void {
    this._open.value = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const open = this.getAttribute('open');
    this._open.value = open != null;

    const id = this.getAttribute('id');
    if (id != null) {
      this.idChanged(id);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._summaries.value = [];
    if (this._animation != null) {
      this._animation.cancel();
    }
  }

  override assignSlots(): void {
    super.assignSlots();
    this._summaries.value = this.assignedSummaries();
  }

  override shouldPropertyChange(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): boolean {
    if (name === 'open') {
      const curr = newValue as boolean;
      const prev = oldValue as boolean;
      return this.shouldOpenChange(curr, prev);
    }
    return super.shouldPropertyChange(name, oldValue, newValue);
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
    if (name === this._open.name) {
      const curr = newValue as boolean;
      const prev = oldValue as boolean;
      return this.openChanged(curr, prev);
    }
    if (name === this._summaries.name) {
      const curr = newValue as ReadonlyArray<HTMLButton>;
      const prev = oldValue as ReadonlyArray<HTMLButton>;
      return this.summariesChanged(curr, prev);
    }
    super.propertyChanged(name, oldValue, newValue);
  }

  protected shouldOpenChange(newValue: boolean, oldValue: boolean): boolean {
    const event = new ToggleEvent('beforetoggle', {
      cancelable: true,
      newState: newValue ? 'open' : 'closed',
      oldState: oldValue ? 'open' : 'closed',
    });
    const proceed = this.dispatchEvent(event);
    return proceed;
  }

  protected disabledChanged(newValue: boolean): void {
    this.inert = newValue;
    this.ariaDisabled = newValue ? 'true' : 'false';
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
    for (const summary of this._summaries.value) {
      summary.disabled = newValue;
    }
  }

  protected openChanged(newValue: boolean, oldValue: boolean): void {
    this._internals.ariaExpanded = newValue ? 'true' : 'false';

    const event = new ToggleEvent('toggle', {
      cancelable: false,
      newState: newValue ? 'open' : 'closed',
      oldState: oldValue ? 'open' : 'closed',
    });
    this.dispatchEvent(event);

    if (this._animation != null) {
      this._animation.cancel();
    }

    const startHeight = `${this.offsetHeight}px`;

    if (newValue) {
      this.toggleAttribute('open', true);
      const endHeight = `${this.offsetHeight}px`;
      for (const element of this._summaries.value) {
        element.ariaExpanded = 'true';
      }
      this._animation = this.animate(
        { height: [startHeight, endHeight] },
        { duration: this.duration, delay: this.delay, easing: this.easing },
      );
      this.subscribe(this._animation, 'cancel', this.handleOpenAnimationEnd);
      this.subscribe(this._animation, 'finish', this.handleOpenAnimationEnd);
    } else {
      let heightSum = 0;
      for (const element of this._summaries.value) {
        element.ariaExpanded = 'false';
        const rect = element.getBoundingClientRect();
        heightSum = heightSum + rect.height;
      }
      const endHeight = `${heightSum}px`;
      this._animation = this.animate(
        { height: [startHeight, endHeight] },
        { duration: this.duration, delay: this.delay, easing: this.easing },
      );
      this.subscribe(this._animation, 'cancel', this.handleCloseAnimationEnd);
      this.subscribe(this._animation, 'finish', this.handleCloseAnimationEnd);
    }
  }

  protected summariesChanged(
    newValue: ReadonlyArray<HTMLButton>,
    oldValue: ReadonlyArray<HTMLButton>,
  ): void {
    for (const summary of oldValue) {
      this.unsubscribe(summary, 'click', this.handleSummaryClick);
      summary.removeAttribute('aria-controls');
    }
    for (const summary of newValue) {
      this.subscribe(summary, 'click', this.handleSummaryClick);
      summary.disabled = this.disabled;
      summary.ariaExpanded = this.open ? 'true' : 'false';
      if (this.id === '') {
        summary.removeAttribute('aria-controls');
      } else {
        summary.setAttribute('aria-controls', this.id);
      }
    }
  }

  protected idChanged(newValue: string): void {
    for (const summary of this.summaries) {
      if (newValue === '') {
        summary.removeAttribute('aria-controls');
      } else {
        summary.setAttribute('aria-controls', newValue);
      }
    }
  }

  protected assignedSummaries(): Array<HTMLButton> {
    const slot = this.getShadowRootSlot('summary');
    if (slot == null) return [];
    return slot.assignedElements().filter(isHTMLButton);
  }

  protected handleSummaryClick(): void {
    this._open.value = !this._open.value;
  }

  protected handleOpenAnimationEnd(): void {
    this._animation = null;
  }

  protected handleCloseAnimationEnd(): void {
    this._animation = null;
    this.toggleAttribute('open', false);
  }

  static override get observedAttributes(): Array<string> {
    return [
      ...super.observedAttributes,
      'open',
      'disabled',
      'id',
      'duration',
      'delay',
      'easing',
    ];
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
