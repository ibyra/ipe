import {
  type Middleware,
  autoPlacement as autoPlacementMiddleware,
  autoUpdate,
  computePosition,
  flip as flipMiddleware,
  inline as inlineMiddleware,
  offset as offsetMiddleware,
  shift as shiftMiddleware,
} from '@floating-ui/dom';
import { asInt, asPlacement } from './commons';
import { type HTMLOpenable, type Placement } from './dom';
import { IpeElement } from './ipe-element';
import { Property, attributeParsers } from './property';

// TODO: Observe changes on anchor ID to update the float element;

export class IpeFloatElement extends IpeElement implements HTMLOpenable {
  protected _open = new Property(this, {
    name: 'open',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
  });

  protected _inline = new Property(this, {
    name: 'inline',
    value: false,
    cast: Boolean,
    attribute: attributeParsers.bool,
  });

  protected _offset = new Property(this, {
    name: 'offset',
    value: 0,
    cast: asInt,
    attribute: attributeParsers.int,
  });

  protected _shift = new Property(this, {
    name: 'shift',
    value: 0,
    cast: asInt,
    attribute: attributeParsers.int,
  });

  protected _placement = new Property(this, {
    name: 'placement',
    value: 'auto' as Placement,
    cast: asPlacement,
    attribute: attributeParsers.placement,
  });

  protected _anchor = new Property(this, {
    name: 'anchor',
    value: null as Element | null,
    attribute: attributeParsers.refId,
  });

  protected _updateTimerID: number | null = null;

  protected _updateCleanup: (() => void) | null = null;

  protected override get template(): string | null {
    return `
      <style>
        :host {
          display: none;
          margin: 0;
          max-width: 256px;
          overflow: hidden;
        }
        :host(:popover-open) {
          display: unset;
        }
      </style>
      <slot></slot>
    `;
  }

  get open(): boolean {
    return this._open.value;
  }
  set open(value: boolean) {
    this._open.value = value;
    this.updatePosition();
  }

  get anchor(): Element | null {
    return this._anchor.value;
  }
  set anchor(value: Element | null) {
    if (value != null && !(value instanceof Element)) return;
    this._anchor.value = value;
    this.updatePosition();
  }

  get inline(): boolean {
    return this._inline.value;
  }
  set inline(value: boolean) {
    this._inline.value = value;
    this.updatePosition();
  }

  get offset(): number {
    return this._offset.value;
  }
  set offset(value: number) {
    this._offset.value = value;
    this.updatePosition();
  }

  get shift(): number {
    return this._shift.value;
  }
  set shift(value: number) {
    this._shift.value = value;
    this.updatePosition();
  }

  get placement(): Placement {
    return this._placement.value;
  }
  set placement(value: Placement) {
    this._placement.value = value;
    this.updatePosition();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('popover')) {
      this.popover = 'auto';
    }
    this.addEventListener('beforetoggle', this.handleBeforetoggle);
    this.updatePosition();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('beforetoggle', this.handleBeforetoggle);
    this.updatePosition();
  }

  override propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === this._open.name) {
      const curr = newValue as boolean;
      return this.openChanged(curr);
    }
    if (name === this._anchor.name) {
      const curr = newValue as Element | null;
      const prev = oldValue as Element | null;
      return this.anchorChanged(curr, prev);
    }
    if (
      name === this._inline.name ||
      name === this._offset.name ||
      name === this._shift.name ||
      name === this._placement.name
    ) {
      return this.updatePosition();
    }
    super.propertyChanged(name, oldValue, newValue);
  }

  protected openChanged(newValue: boolean): void {
    if (this._anchor.value == null) return;
    this._anchor.value.ariaExpanded = newValue ? 'true' : 'false';
    this.updatePosition();
  }

  protected anchorChanged(
    newValue: Element | null,
    oldValue: Element | null,
  ): void {
    if (oldValue != null) {
      oldValue.ariaHasPopup = null;
      oldValue.ariaExpanded = null;
    }
    if (newValue != null) {
      newValue.ariaHasPopup = 'true';
      newValue.ariaExpanded = this._open.value ? 'true' : 'false';
    }
    this.updatePosition();
  }

  protected updatePosition(): void {
    if (this._updateCleanup != null) {
      this._updateCleanup();
      this._updateCleanup = null;
    }
    if (!this._open.value || !this.isConnected) return;

    const anchor =
      this._anchor.value ?? this.ownerDocument.body.firstElementChild;
    if (anchor == null) return;

    const middleware: Array<Middleware> = [];

    middleware.push(offsetMiddleware(this._offset.value));

    if (this._inline.value) {
      middleware.push(inlineMiddleware());
    }

    let placement: Exclude<Placement, 'auto'> | undefined;
    if (this._placement.value === 'auto') {
      middleware.push(autoPlacementMiddleware());
    } else {
      placement = this._placement.value;
      middleware.push(flipMiddleware());
    }

    middleware.push(shiftMiddleware({ padding: this._shift.value }));

    const style = window.getComputedStyle(this);

    const strategy = style.position === 'fixed' ? 'fixed' : 'absolute';

    const update = () => {
      computePosition(anchor, this, { placement, middleware, strategy })
        .then((result) => {
          this.style.left = `${result.x}px`;
          this.style.top = `${result.y}px`;
          return result;
        })
        .catch((error) => console.error(error));
    };
    this._updateCleanup = autoUpdate(anchor, this, update);
  }

  protected handleBeforetoggle(event: ToggleEvent): void {
    this._open.value = event.newState === 'open';
    this.updatePosition();
  }

  static override get observedAttributes(): Array<string> {
    return [
      ...super.observedAttributes,
      'open',
      'anchor',
      'inline',
      'offset',
      'shift',
      'placement',
    ];
  }
}

window.IpeFloatElement = IpeFloatElement;
window.customElements.define('ipe-float', IpeFloatElement);

declare global {
  interface Window {
    IpeFloatElement: typeof IpeFloatElement;
  }

  interface HTMLElementTagNameMap {
    'ipe-float': IpeFloatElement;
  }

  interface HTMLElementEventMap {
    toggle: ToggleEvent;
    beforetoggle: ToggleEvent;
  }
}
