import { isEqual } from 'moderndash';
import { BooleanAttr, IntegerAttr, StringAttr } from './attributes';
import { isBoolean, isHTMLButton, isInteger, isString } from './commons';
import { type HTMLDisclosure, type HTMLButton } from './dom';
import { IpeElement } from './ipe-element';

// TODO: Add "orientation" to allow horizontal accordions

// TODO: Add support for "role=button" to be a summary

export class IpeDisclosureElement extends IpeElement implements HTMLDisclosure {
  protected _idAttr = new StringAttr(this, 'id', '');

  protected _open: boolean = false;
  protected _openAttr = new BooleanAttr(this, 'open', false);

  protected _disabled: boolean = false;
  protected _disabledAttr = new BooleanAttr(this, 'disabled', false);

  protected _duration = 150;
  protected _durationAttr = new IntegerAttr(this, 'duration', 150);

  protected _delay = 0;
  protected _delayAttr = new IntegerAttr(this, 'delay', 0);

  protected _easing = 'ease-in-out';
  protected _easingAttr = new StringAttr(this, 'easing', 'ease-in-out');

  protected _summaries: ReadonlyArray<HTMLButton> = [];

  protected _animation: Animation | null = null;

  protected _internals: ElementInternals = this.attachInternals();

  protected override get template(): string {
    return `
      <slot name="summary" part="summary"></slot>
      <slot part="content"></slot>
    `;
  }

  override get id(): string {
    return super.id;
  }
  override set id(value: string) {
    if (!isString(value)) return;
    if (!this.changeId(value)) return;
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeDisabled(value)) return;
  }

  get open(): boolean {
    return this._open;
  }
  set open(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeOpen(value)) return;
  }

  get selected(): boolean {
    return this._open;
  }
  set selected(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeOpen(value)) return;
  }

  get duration(): number {
    return this._duration;
  }
  set duration(value: number) {
    if (!isInteger(value)) return;
    if (!this.changeDuration(value)) return;
  }

  get delay(): number {
    return this._delay;
  }
  set delay(value: number) {
    if (!isInteger(value)) return;
    if (!this.changeDelay(value)) return;
  }

  get easing(): string {
    return this._easing;
  }
  set easing(value: string) {
    if (!isString(value)) return;
    if (!this.changeEasing(value)) return;
  }

  get summaries(): Array<Element> {
    return Array.from(this._summaries);
  }

  toggle(): void {
    this.changeOpen(!this._open);
  }

  select(): void {
    this.changeOpen(true);
  }

  deselect(): void {
    this.changeOpen(false);
  }

  protected override initProperties(): void {
    super.initProperties();
    this.changeDisabled(this._disabledAttr.get());
    this.changeOpen(this._openAttr.get());
    this.changeDuration(this._durationAttr.get());
    this.changeDelay(this._delayAttr.get());
    this.changeEasing(this._easingAttr.get());
  }

  protected override holdSlots(): void {
    super.holdSlots();
    const summaries = this.assignedSummaries();
    this.changeSummaries(summaries);
  }

  protected override releaseSlots(): void {
    super.releaseSlots();
    this.changeSummaries([]);
  }

  protected override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._animation != null) {
      this._animation.cancel();
    }
  }

  protected override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === this._idAttr.name) {
      const id = this._idAttr.from(newValue);
      if (!this.changeId(id)) return;
    }
    if (name === this._disabledAttr.name) {
      const disabled = this._disabledAttr.from(newValue);
      if (!this.changeDisabled(disabled)) return;
    }
    if (name === this._openAttr.name) {
      const open = this._openAttr.from(newValue);
      if (!this.changeOpen(open)) return;
    }
    if (name === this._durationAttr.name) {
      const duration = this._durationAttr.from(newValue);
      if (!this.changeDuration(duration)) return;
    }
    if (name === this._delayAttr.name) {
      const delay = this._delayAttr.from(newValue);
      if (!this.changeDelay(delay)) return;
    }
    if (name === this._easingAttr.name) {
      const easing = this._easingAttr.from(newValue);
      if (!this.changeEasing(easing)) return;
    }
  }

  protected changeId(newValue: string): boolean {
    const oldValue = super.id;
    if (newValue === oldValue) return false;
    super.id = newValue;
    for (const summary of this.summaries) {
      if (newValue === '') {
        summary.removeAttribute('aria-controls');
      } else {
        summary.setAttribute('aria-controls', newValue);
      }
    }
    return true;
  }

  protected changeDisabled(newValue: boolean): boolean {
    const oldValue = this._disabled;
    if (newValue === oldValue) return false;
    this._disabled = newValue;
    this._disabledAttr.set(newValue);
    this.inert = newValue;
    this.ariaDisabled = newValue ? 'true' : 'false';
    this._internals.ariaDisabled = newValue ? 'true' : 'false';
    for (const summary of this._summaries) {
      summary.disabled = newValue;
    }
    return true;
  }

  protected changeOpen(newValue: boolean): boolean {
    const oldValue = this._open;
    if (newValue === oldValue) return false;

    const beforeToggle = new ToggleEvent('beforetoggle', {
      cancelable: true,
      newState: newValue ? 'open' : 'closed',
      oldState: oldValue ? 'open' : 'closed',
    });
    const proceed = this.dispatchEvent(beforeToggle);
    if (!proceed) return false;

    this._open = newValue;
    this._internals.ariaExpanded = newValue ? 'true' : 'false';

    const toggle = new ToggleEvent('toggle', {
      cancelable: false,
      newState: newValue ? 'open' : 'closed',
      oldState: oldValue ? 'open' : 'closed',
    });
    this.dispatchEvent(toggle);

    if (this._animation != null) {
      this._animation.cancel();
    }

    const startHeight = `${this.offsetHeight}px`;

    if (newValue) {
      this._openAttr.set(true);
      const endHeight = `${this.offsetHeight}px`;
      for (const element of this._summaries) {
        element.ariaExpanded = 'true';
      }
      this._animation = this.animate(
        { height: [startHeight, endHeight] },
        { duration: this._duration, delay: this._delay, easing: this._easing },
      );
      this.subscribe(this._animation, 'cancel', this.handleOpenAnimationEnd);
      this.subscribe(this._animation, 'finish', this.handleOpenAnimationEnd);
    } else {
      let heightSum = 0;
      for (const element of this._summaries) {
        element.ariaExpanded = 'false';
        const rect = element.getBoundingClientRect();
        heightSum = heightSum + rect.height;
      }
      const endHeight = `${heightSum}px`;
      this._animation = this.animate(
        { height: [startHeight, endHeight] },
        { duration: this._duration, delay: this._delay, easing: this._easing },
      );
      this.subscribe(this._animation, 'cancel', this.handleCloseAnimationEnd);
      this.subscribe(this._animation, 'finish', this.handleCloseAnimationEnd);
    }

    return true;
  }

  protected changeSummaries(newValue: ReadonlyArray<HTMLButton>): boolean {
    const oldValue = this._summaries;
    if (isEqual(newValue, oldValue)) return false;
    this._summaries = newValue;
    for (const summary of oldValue) {
      this.unsubscribe(summary, 'click', this.handleSummaryClick);
      summary.removeAttribute('aria-controls');
    }
    for (const summary of newValue) {
      this.subscribe(summary, 'click', this.handleSummaryClick);
      summary.disabled = this._disabled;
      summary.ariaExpanded = this._open ? 'true' : 'false';
      if (this.id === '') {
        summary.removeAttribute('aria-controls');
      } else {
        summary.setAttribute('aria-controls', this.id);
      }
    }
    return true;
  }

  protected changeDuration(newValue: number): boolean {
    const oldValue = this._duration;
    if (newValue === oldValue) return false;
    this._duration = newValue;
    this._durationAttr.set(newValue);
    return true;
  }

  protected changeDelay(newValue: number): boolean {
    const oldValue = this._delay;
    if (newValue === oldValue) return false;
    this._delay = newValue;
    this._delayAttr.set(newValue);
    return true;
  }

  protected changeEasing(newValue: string): boolean {
    const oldValue = this._easing;
    if (newValue === oldValue) return false;
    this._easing = newValue;
    this._easingAttr.set(newValue);
    return true;
  }

  protected assignedSummaries(): Array<HTMLButton> {
    const slot = this.getShadowRootSlot('summary');
    if (slot == null) return [];
    return slot.assignedElements().filter(isHTMLButton);
  }

  protected handleSummaryClick(): void {
    this.changeOpen(!this._open);
  }

  protected handleOpenAnimationEnd(): void {
    this._animation = null;
  }

  protected handleCloseAnimationEnd(): void {
    this._animation = null;
    this._openAttr.set(false);
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
