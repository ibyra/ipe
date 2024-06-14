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
import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import { type HTMLOpenable, type Placement, html } from './commons';
import {
  BoolConverter,
  IdRefConverter,
  IntConverter,
  PlacementConverter,
} from './attributes';
import { IpeElement } from './ipe-element';

// TODO: Observe changes on anchor ID to update the float element;

export class IpeFloatElement extends IpeElement implements HTMLOpenable {
  static override properties: PropertyDeclarations = {
    open: {
      reflect: true,
      attribute: 'open',
      converter: new BoolConverter(),
    },
    inline: {
      reflect: true,
      attribute: 'inline',
      converter: new BoolConverter(),
    },
    offset: {
      reflect: true,
      attribute: 'offset',
      converter: new IntConverter(0),
    },
    shift: {
      reflect: true,
      attribute: 'shift',
      converter: new IntConverter(0),
    },
    placement: {
      reflect: true,
      attribute: 'placement',
      converter: new PlacementConverter(),
    },
    anchor: {
      reflect: true,
      attribute: 'anchor',
      converter: new IdRefConverter(document),
    },
  };

  static override styles = css`
    :host {
      display: none;
      margin: 0;
      max-width: 256px;
      overflow: hidden;
    }
    :host(:popover-open) {
      display: unset;
    }
  `;

  static override template = html`<slot></slot>`;

  public declare open: boolean;
  public declare inline: boolean;
  public declare offset: number;
  public declare shift: number;
  public declare placement: Placement;
  public declare anchor: Element | null;

  protected declare _updateTimerID: number | null;
  protected declare _updateCleanup: (() => void) | null;

  constructor() {
    super();
    this.open = false;
    this.inline = false;
    this.offset = 0;
    this.shift = 0;
    this.placement = 'auto';
    this.anchor = null;
    this._updateTimerID = null;
    this._updateCleanup = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('popover')) {
      this.popover = 'auto';
    }
    this.addEventListener('beforetoggle', this.handleBeforetoggle);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('beforetoggle', this.handleBeforetoggle);
  }

  protected get _positionProps(): Array<keyof this> {
    return ['open', 'inline', 'offset', 'shift', 'placement', 'anchor'];
  }

  protected get contentSlot(): HTMLSlotElement | null {
    const element = this.getSlot();
    return element;
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('open')) this.openUpdated();
    if (props.has('anchor')) this.anchorUpdated(props.get('anchor')!);
    const positionPropNames = this._positionProps;
    const changedPropNames = Array.from(props.keys());
    if (positionPropNames.some((name) => changedPropNames.includes(name))) {
      this.updatePosition();
    }
    return super.updated(props);
  }

  protected openUpdated(): void {
    if (this.anchor == null) return;
    this.anchor.ariaExpanded = this.open ? 'true' : 'false';
  }

  protected anchorUpdated(oldValue: Element | null): void {
    if (oldValue != null) {
      oldValue.ariaHasPopup = null;
      oldValue.ariaExpanded = null;
    }
    if (this.anchor != null) {
      this.anchor.ariaHasPopup = 'true';
      this.anchor.ariaExpanded = this.open ? 'true' : 'false';
    }
  }

  protected updatePosition(): void {
    if (this._updateCleanup != null) {
      this._updateCleanup();
      this._updateCleanup = null;
    }
    if (!this.open || !this.isConnected) return;

    const anchor = this.anchor ?? this.ownerDocument.body.firstElementChild;
    if (anchor == null) return;

    const middleware: Array<Middleware> = [];

    middleware.push(offsetMiddleware(this.offset));

    if (this.inline) {
      middleware.push(inlineMiddleware());
    }

    let placement: Exclude<Placement, 'auto'> | undefined;
    if (this.placement === 'auto') {
      middleware.push(autoPlacementMiddleware());
    } else {
      placement = this.placement;
      middleware.push(flipMiddleware());
    }

    middleware.push(shiftMiddleware({ padding: this.shift }));

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
    this.open = event.newState === 'open';
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
