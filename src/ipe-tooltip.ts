import { IpeFloatElement } from './ipe-float';

export class IpeTooltip extends IpeFloatElement {
  showTooltip(): void {
    this.showPopover();
  }

  hideTooltip(): void {
    this.hidePopover();
  }

  protected override anchorUpdated(oldValue: Element | null): void {
    super.anchorUpdated(oldValue);
    if (oldValue != null) {
      // @ts-expect-error Only HTMLElement instances support the "mouseover"
      // event, but you can remove the event in any event target.
      this.unsubscribe(oldValue, 'mouseover', this.showTooltip);
      // @ts-expect-error Same as above, but for "mouseleave"
      this.unsubscribe(oldValue, 'mouseleave', this.hideTooltip);
      // @ts-expect-error Same as above, but for "focus"
      this.unsubscribe(oldValue, 'focus', this.showTooltip);
      // @ts-expect-error Same as above, but for "blur"
      this.unsubscribe(oldValue, 'blur', this.hideTooltip);
    }
    if (this.anchor != null) {
      // @ts-expect-error Same as above, but for adding the "mouseover" event.
      this.subscribe(this.anchor, 'mouseover', this.showTooltip);
      // @ts-expect-error Same as above, but for adding the "mouseleave" event.
      this.subscribe(this.anchor, 'mouseleave', this.hideTooltip);
      // @ts-expect-error Same as above, but for adding the "focus" event.
      this.subscribe(this.anchor, 'focus', this.showTooltip);
      // @ts-expect-error Same as above, but for adding the "blur" event.
      this.subscribe(this.anchor, 'blur', this.hideTooltip);
    }
  }
}

window.IpeTooltip = IpeTooltip;
window.customElements.define('ipe-tooltip', IpeTooltip);

declare global {
  interface Window {
    IpeTooltip: typeof IpeTooltip;
  }

  interface HTMLElementTagNameMap {
    'ipe-tooltip': IpeTooltip;
  }
}
