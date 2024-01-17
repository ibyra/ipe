import { isEqual } from 'moderndash';
import { type HTMLFormControl } from './dom';
import { IpeElement } from './ipe-element';
import { getErrorMessageElement, isHTMLFormControl } from './commons';
import { Property } from './property';

export class IpeFieldElement extends IpeElement {
  protected _invalidated = false;

  protected _controls = new Property(this, {
    name: 'controls',
    equals: isEqual,
    value: [] as ReadonlyArray<HTMLFormControl>,
  });

  protected _internals = this.attachInternals();

  protected override get template(): string | null {
    return `
      <style>
        :host {
          display: block;
        }
      </style>
      <slot></slot>`;
  }

  get controls(): Array<HTMLFormControl> {
    return Array.from(this._controls.value);
  }

  override assignSlots(): void {
    super.assignSlots();
    const controls = this.assignedControls();
    this._controls.value = controls;
  }

  override propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === 'controls') {
      const curr = newValue as ReadonlyArray<HTMLFormControl>;
      const prev = oldValue as ReadonlyArray<HTMLFormControl>;
      return this.controlsChanged(curr, prev);
    }
    super.propertyChanged(name, oldValue, newValue);
  }

  protected controlsChanged(
    newValue: ReadonlyArray<HTMLFormControl>,
    oldValue: ReadonlyArray<HTMLFormControl>,
  ): void {
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
      const errormessage = getErrorMessageElement(control);
      if (errormessage != null && errormessage.innerText.length > 0) {
        this._invalidated = true;
        this.ariaInvalid = 'true';
        this._internals.ariaInvalid = 'true';
        control.setCustomValidity(errormessage.innerText);
      }
    }
  }

  protected assignedControls(): Array<HTMLFormControl> {
    if (!this.isConnected) return [];
    const slot = this.getShadowRootSlot();
    if (slot == null) return [];
    return slot.assignedElements().filter(isHTMLFormControl);
  }

  protected handleInvalid(event: Event): void {
    const target = event.target;
    const control = this._controls.value.find((c) => c === target);
    if (control == null) return;

    this.ariaInvalid = 'true';
    this._internals.ariaInvalid = 'true';
    this._invalidated = true;

    const errormessage = getErrorMessageElement(control);
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
    const control = this._controls.value.find((c) => c === target);
    if (control == null) return;

    control.setCustomValidity('');
    const invalids = this._controls.value.filter((c) => !c.checkValidity());
    if (invalids.length > 0) return;

    this.ariaInvalid = 'false';
    this._internals.ariaInvalid = 'false';
    const errormessage = getErrorMessageElement(control);
    if (errormessage == null) return;

    errormessage.replaceChildren();
  }

  protected handleReset(): void {
    this._invalidated = false;
    this.ariaInvalid = 'false';
    this._internals.ariaInvalid = 'false';
    for (const control of this._controls.value) {
      control.setCustomValidity('');
      const errormessage = getErrorMessageElement(control);
      if (errormessage != null) {
        errormessage.ariaLive = 'off';
        errormessage.replaceChildren();
      }
    }
  }
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
