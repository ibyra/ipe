import { isEqual } from 'moderndash';
import { type HTMLFormControl } from './dom';
import { IpeElement } from './ipe-element';
import { isHTMLFormControl } from './commons';

export class IpeFieldElement extends IpeElement {
  protected _invalidated = false;
  protected _controls: ReadonlyArray<HTMLFormControl> = [];
  protected _internals = this.attachInternals();

  protected override get template(): string | null {
    return `<slot></slot>`;
  }

  get controls(): Array<HTMLFormControl> {
    return Array.from(this._controls);
  }

  protected override holdSlots(): void {
    super.holdSlots();
    const controls = this.assignedControls();
    this.changeControls(controls);
  }

  protected override releaseSlots(): void {
    super.releaseSlots();
    this.changeControls([]);
  }

  protected changeControls(newValue: ReadonlyArray<HTMLFormControl>): boolean {
    const oldValue = this._controls;
    if (isEqual(newValue, oldValue)) return false;

    this._controls = newValue;

    for (const control of oldValue) {
      this.unsubscribe(control, 'invalid', this.handleInvalid);
      this.unsubscribe(control, 'change', this.handleChange);
      if (control.form != null) {
        this.unsubscribe(control.form, 'reset', this.handleReset);
      }
    }
    for (const control of newValue) {
      this.subscribe(control, 'invalid', this.handleInvalid);
      this.subscribe(control, 'change', this.handleChange);
      if (control.form != null) {
        this.subscribe(control.form, 'reset', this.handleReset);
      }
      const errormessage = getErrorMessage(control);
      if (errormessage != null && errormessage.innerText.length > 0) {
        this._invalidated = true;
        this.ariaInvalid = 'true';
        this._internals.ariaInvalid = 'true';
        control.setCustomValidity(errormessage.innerText);
      }
    }
    return true;
  }

  protected assignedControls(): Array<HTMLFormControl> {
    if (!this.isConnected) return [];
    const slot = this.getShadowRootSlot();
    if (slot == null) return [];
    return slot.assignedElements().filter(isHTMLFormControl);
  }

  protected handleInvalid(event: Event): void {
    const target = event.target;
    const control = this._controls.find((control) => control === target);
    if (control == null) return;

    this.ariaInvalid = 'true';
    this._internals.ariaInvalid = 'true';
    this._invalidated = true;

    const errormessage = getErrorMessage(control);
    if (errormessage == null) return;

    // Prevent the browser alerts
    event.preventDefault();

    const validity = control.validity;
    const keys: Array<keyof ValidityStateFlags> = [
      'valueMissing',
      'typeMismatch',
      'patternMismatch',
      'rangeOverflow',
      'rangeUnderflow',
      'stepMismatch',
      'tooLong',
      'tooShort',
      'badInput',
    ];
    const key = keys.find((key) => key in validity && validity[key] === true);
    let message = control.validationMessage;
    if (key != null) message = control.dataset[key] ?? message;

    errormessage.replaceChildren(message);
    errormessage.ariaLive = 'assertive';
  }

  protected handleChange(event: Event): void {
    // If was invalidated once, check validity on every change
    if (!this._invalidated) return;

    const target = event.target;
    const control = this._controls.find((control) => control === target);
    if (control == null) return;

    control.setCustomValidity('');
    const invalids = this._controls.filter((c) => !c.checkValidity());
    if (invalids.length > 0) return;

    this.ariaInvalid = 'false';
    this._internals.ariaInvalid = 'false';
    const errormessage = getErrorMessage(control);
    if (errormessage == null) return;

    errormessage.replaceChildren();
  }

  protected handleReset(): void {
    this._invalidated = false;
    this.ariaInvalid = 'false';
    this._internals.ariaInvalid = 'false';
    for (const control of this._controls) {
      control.setCustomValidity('');
      const errormessage = getErrorMessage(control);
      if (errormessage != null) {
        errormessage.ariaLive = 'off';
        errormessage.replaceChildren();
      }
    }
  }
}

function getErrorMessage(element: Element | null): HTMLElement | null {
  if (element == null) return null;
  const id = element.getAttribute('aria-errormessage');
  if (id == null || id === '') return null;
  const errormessage = element.ownerDocument.querySelector(`#${id}`);
  if (errormessage == null) return null;
  if (!(errormessage instanceof HTMLElement)) return null;
  return errormessage;
}

window.IpeFieldElement = IpeFieldElement;
window.customElements.define('ipe-field', IpeFieldElement);

declare global {
  interface Window {
    IpeFieldElement: typeof IpeFieldElement;
  }

  interface HTMLElementTagNameMap {
    'ipe-field': IpeFieldElement;
  }
}
