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
import { isBoolean, isPlacement } from './commons';
import { type HTMLOpenable, type Placement } from './dom';
import { IpeElement } from './ipe-element';
import {
  BooleanAttr,
  IdRefAttr,
  IntegerAttr,
  PlacementAttr,
} from './attributes';

// TODO: Observe changes on anchor ID to update the float element;

export class IpeFloatElement extends IpeElement implements HTMLOpenable {
  protected _open: boolean = false;
  protected _openAttr = new BooleanAttr('open', this._open);

  protected _inline: boolean = false;
  protected _inlineAttr = new BooleanAttr('inline', this._inline);

  protected _offset: number = 0;
  protected _offsetAttr = new IntegerAttr('offset', this._offset);

  protected _shift: number = 0;
  protected _shiftAttr = new IntegerAttr('shift', this._shift);

  protected _placement: Placement = 'auto';
  protected _placementAttr = new PlacementAttr('placement', this._placement);

  protected _anchor: Element | null = null;
  protected _anchorAttr = new IdRefAttr(
    'anchor',
    this._anchor,
    this.ownerDocument,
  );

  protected _updateTimerID: number | null = null;

  protected _updateCleanup: (() => void) | null = null;

  get open(): boolean {
    return this._open;
  }
  set open(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeOpen(value)) return;
    this.updatePosition();
  }

  get anchor(): Element | null {
    return this._anchor;
  }
  set anchor(value: Element | null) {
    if (value != null && !(value instanceof Element)) return;
    if (!this.changeAnchor(value)) return;
    this.updatePosition();
  }

  get inline(): boolean {
    return this._inline;
  }
  set inline(value: boolean) {
    if (typeof value !== 'boolean') return;
    if (!this.changeInline(value)) return;
    this.updatePosition();
  }

  get offset(): number {
    return this._offset;
  }
  set offset(value: number) {
    if (typeof value !== 'number') return;
    if (!this.changeOffset(value)) return;
    this.updatePosition();
  }

  get shift(): number {
    return this._shift;
  }
  set shift(value: number) {
    if (typeof value !== 'number') return;
    if (!this.changeShift(value)) return;
    this.updatePosition();
  }

  get placement(): Placement {
    return this._placement;
  }
  set placement(value: Placement) {
    if (!isPlacement(value)) return;
    if (!this.changePlacement(value)) return;
    this.updatePosition();
  }

  protected override initProperties(): void {
    super.initProperties();
    if (!this.hasAttribute('popover')) {
      this.popover = 'auto';
    }
    this.changeAnchor(this._anchorAttr.get(this));
    this.changePlacement(this._placementAttr.get(this));
    this.changeOffset(this._offsetAttr.get(this));
    this.changeShift(this._shiftAttr.get(this));
    this.changeInline(this._inlineAttr.get(this));
    this.changeOpen(this._openAttr.get(this));
  }

  protected override holdListeners(): void {
    super.holdListeners();
    this.addEventListener('beforetoggle', this.handleBeforetoggle);
  }

  protected override releaseListeners(): void {
    super.releaseListeners();
    this.removeEventListener('beforetoggle', this.handleBeforetoggle);
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    this.updatePosition();
  }

  protected override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.updatePosition();
  }

  protected override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === this._openAttr.name) {
      const open = this._openAttr.from(newValue);
      if (!this.changeOpen(open)) return;
      this.updatePosition();
      return;
    }
    if (name === this._anchorAttr.name) {
      const anchor = this._anchorAttr.from(newValue);
      if (!this.changeAnchor(anchor)) return;
      this.updatePosition();
      return;
    }
    if (name === this._inlineAttr.name) {
      const inline = this._inlineAttr.from(newValue);
      if (!this.changeInline(inline)) return;
      this.updatePosition();
      return;
    }
    if (name === this._offsetAttr.name) {
      const offset = this._offsetAttr.from(newValue);
      if (!this.changeOffset(offset)) return;
      this.updatePosition();
      return;
    }
    if (name === this._shiftAttr.name) {
      const shift = this._shiftAttr.from(newValue);
      if (!this.changeShift(shift)) return;
      this.updatePosition();
      return;
    }
    if (name === this._placementAttr.name) {
      const placement = this._placementAttr.from(newValue);
      if (!this.changePlacement(placement)) return;
      this.updatePosition();
      return;
    }
  }

  protected changeOpen(newValue: boolean): boolean {
    const oldValue = this._open;
    if (newValue === oldValue) return false;
    this._open = newValue;
    this._openAttr.set(this, newValue);
    if (this._anchor != null) {
      this._anchor.ariaExpanded = newValue ? 'true' : 'false';
    }
    return true;
  }

  protected changeAnchor(newValue: Element | null): boolean {
    const oldValue = this._anchor;
    if (oldValue === newValue) return false;
    this._anchor = newValue;
    this._anchorAttr.set(this, newValue);
    if (oldValue != null) {
      oldValue.ariaHasPopup = null;
      oldValue.ariaExpanded = null;
    }
    if (newValue != null) {
      newValue.ariaHasPopup = 'true';
      newValue.ariaExpanded = this._open ? 'true' : 'false';
    }
    return true;
  }

  protected changeInline(newValue: boolean): boolean {
    const oldValue = this._inline;
    if (oldValue === newValue) return false;
    this._inline = newValue;
    this._inlineAttr.set(this, newValue);
    return true;
  }

  protected changeOffset(newValue: number): boolean {
    const oldValue = this._offset;
    if (oldValue === newValue) return false;
    this._offset = newValue;
    this._offsetAttr.set(this, newValue);
    return true;
  }

  protected changeShift(newValue: number): boolean {
    const oldValue = this._shift;
    if (oldValue === newValue) return false;
    this._shift = newValue;
    this._shiftAttr.set(this, newValue);
    return true;
  }

  protected changePlacement(newValue: Placement): boolean {
    const oldValue = this._placement;
    if (oldValue === newValue) return false;
    this._placement = newValue;
    this._placementAttr.set(this, newValue);
    return true;
  }

  protected updatePosition(): void {
    if (this._updateCleanup != null) {
      this._updateCleanup();
      this._updateCleanup = null;
    }
    if (!this._open || !this.isConnected) return;
    const anchor = this._anchor ?? this.ownerDocument.body.firstElementChild;
    if (anchor == null) return;
    const placement = this._placement === 'auto' ? undefined : this._placement;
    const middleware: Array<Middleware> = [];
    if (Number.isSafeInteger(this._offset)) {
      middleware.push(offsetMiddleware(this._offset));
    }
    if (this._inline) {
      middleware.push(inlineMiddleware());
    }
    if (this._placement === 'auto') {
      middleware.push(autoPlacementMiddleware());
    } else {
      middleware.push(flipMiddleware());
    }
    if (Number.isSafeInteger(this._shift)) {
      middleware.push(shiftMiddleware({ padding: this._shift }));
    }
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
    const open = event.newState === 'open';
    if (!this.changeOpen(open)) return;
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
