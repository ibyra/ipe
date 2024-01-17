import { IpeFloatElement } from './ipe-float';

export class IpeTooltip extends IpeFloatElement {
  showTooltip(): void {
    this.showPopover();
  }

  hideTooltip(): void {
    this.hidePopover();
  }

  protected override anchorChanged(
    newValue: Element | null,
    oldValue: Element | null,
  ): void {
    super.anchorChanged(newValue, oldValue);
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
    if (newValue != null) {
      // @ts-expect-error Same as above, but for adding the "mouseover" event.
      this.subscribe(newValue, 'mouseover', this.showTooltip);
      // @ts-expect-error Same as above, but for adding the "mouseleave" event.
      this.subscribe(newValue, 'mouseleave', this.hideTooltip);
      // @ts-expect-error Same as above, but for adding the "focus" event.
      this.subscribe(newValue, 'focus', this.showTooltip);
      // @ts-expect-error Same as above, but for adding the "blur" event.
      this.subscribe(newValue, 'blur', this.hideTooltip);
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
