import { isEqual } from 'moderndash';
import {
  type HTMLFormControl,
  getErrorMessageElement,
  isHTMLFormControl,
} from './commons';
import { IpeElement } from './ipe-element';
import { css } from 'lit';

// TODO: Replace setting 'aria-invalid' attribute on the field to use a custom
//       pseudo class state.

export class IpeFieldElement extends IpeElement {
  static override styles = css`
    :host {
      display: block;
    }
  `;

  static override content = `
    <slot><slot>
  `;

  protected declare _invalidated: boolean;
  protected declare _internals: ElementInternals;
  protected declare _controls: ReadonlyArray<HTMLFormControl>;
  protected declare _controlObserver: MutationObserver;

  constructor() {
    super();
    this._invalidated = false;
    this._internals = this.attachInternals();
    this._controls = [];
    this._controlObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        this.handleMutation(mutation);
      }
    });
  }

  get controls(): Array<HTMLFormControl> {
    return Array.from(this._controls);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.updateControls();
    const content = this.contentSlot;
    if (content == null) return;
    this.subscribe(content, 'slotchange', this.handleSlotChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.updateControls();
    const content = this.contentSlot;
    if (content == null) return;
    this.unsubscribe(content, 'slotchange', this.handleSlotChange);
  }

  protected get contentSlot(): HTMLSlotElement | null {
    const element = this.getSlot();
    return element;
  }

  protected controlsUpdated(oldValue: ReadonlyArray<HTMLFormControl>): void {
    this._controlObserver.disconnect();

    for (const control of oldValue) {
      this.unsubscribe(control, 'invalid', this.handleControlInvalid);
      this.unsubscribe(control, 'change', this.handleControlChange);
      if (control.form != null) {
        this.unsubscribe(control.form, 'reset', this.handleFormReset);
      }
    }

    for (const control of this._controls) {
      this._controlObserver.observe(control, {
        attributes: true,
        attributeFilter: ['aria-errormessage'],
      });
      this.subscribe(control, 'invalid', this.handleControlInvalid);
      this.subscribe(control, 'change', this.handleControlChange);
      if (control.form != null) {
        this.subscribe(control.form, 'reset', this.handleFormReset);
      }
      this.updateErrorMessage(control);
    }
  }

  protected async updateControls(): Promise<void> {
    const elements = await this.getDefinedAssignedElements();
    const newValue = elements.filter(isHTMLFormControl);
    const oldValue = this._controls;
    if (isEqual(oldValue, newValue)) return;

    this._controls = newValue;
    this.controlsUpdated(oldValue);
  }

  protected updateErrorMessage(control: HTMLFormControl): void {
    const errormessage = getErrorMessageElement(control);
    if (errormessage != null && errormessage.innerText.length > 0) {
      this._invalidated = true;
      this.ariaInvalid = 'true';
      this._internals.ariaInvalid = 'true';
      control.setCustomValidity(errormessage.innerText);
    }
  }

  protected handleSlotChange(): void {
    this.updateControls();
  }

  protected handleMutation(mutation: MutationRecord): void {
    if (mutation.type !== 'attributes') return;
    const target = mutation.target;
    if (!isHTMLFormControl(target)) return;
    this.updateErrorMessage(target);
  }

  protected handleControlInvalid(event: Event): void {
    const target = event.target;
    const control = this._controls.find((control) => control === target);
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

  protected handleControlChange(event: Event): void {
    // If was invalidated once, check validity on every change
    if (!this._invalidated) return;

    const target = event.target;
    const control = this._controls.find((c) => c === target);
    if (control == null) return;

    control.setCustomValidity('');
    const invalids = this._controls.filter((c) => !c.checkValidity());
    if (invalids.length > 0) return;

    this.ariaInvalid = 'false';
    this._internals.ariaInvalid = 'false';
    const errormessage = getErrorMessageElement(control);
    if (errormessage == null) return;

    errormessage.replaceChildren();
  }

  protected handleFormReset(): void {
    this._invalidated = false;
    this.ariaInvalid = 'false';
    this._internals.ariaInvalid = 'false';
    for (const control of this._controls) {
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
