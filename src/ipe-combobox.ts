import {
  type Middleware,
  autoPlacement as autoPlacementMiddleware,
  autoUpdate,
  computePosition,
  flip as flipMiddleware,
  offset as offsetMiddleware,
  shift as shiftMiddleware,
} from '@floating-ui/dom';
import { isEqual } from 'moderndash';
import {
  type HTMLOpenable,
  type HTMLOptlist,
  type HTMLValueOption,
  type Placement,
} from './dom';
import { IpeOptlistElement } from './ipe-optlist';
import {
  asInt,
  asPlacement,
  getFirstOption,
  getLastOption,
  getSelectedOptions,
  isHTMLValueOption,
  nextOptionOf,
  previousOptionOf,
} from './commons';
import { FormProperty, Property, attributeParsers } from './property';

// TODO: Add support to option group element

// TODO: remove "--ipe-combobox-index" CSS variable when the CSS `attr()`
//       function supports integer values.
//       https://developer.mozilla.org/en-US/docs/Web/CSS/attr

export class IpeComboboxElement
  extends IpeOptlistElement
  implements HTMLOptlist<HTMLValueOption>, HTMLOpenable
{
  protected _picked = new Property(this, {
    name: 'picked',
    value: [] as ReadonlyArray<HTMLValueOption>,
    equals: isEqual,
  });

  protected _open = new Property(this, {
    name: 'open',
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

  protected _placeholder = new FormProperty(this, {
    name: 'placeholder',
    value: '',
    cast: String,
    attribute: attributeParsers.str,
  });

  protected _popoverElem: HTMLDivElement;

  protected _inputElem: HTMLInputElement;

  protected _updateTimerID: number | null = null;

  protected _updateCleanup: (() => void) | null = null;

  constructor() {
    super();
    this._popoverElem = this.shadowRoot!.querySelector('#popover')!;
    this._inputElem = this.shadowRoot!.querySelector('#input')!;
  }

  protected override get template(): string {
    return `
      <style>
        :host {
          display: block;
          position: relative;
          box-sizing: border-box;
        }

        #input {
          box-sizing: border-box;
          display: block;
          width: 100%;
          height: 2.5em;
          border: solid 2px dimgray;
          background-color: white;
          cursor: pointer;
        }

        #picked {
          display: flex;
          flex-direction: row;
          position: absolute;
          box-sizing: border-box;
          gap: 0.5em;
          top: 50%;
          left: 0.5em;
          translate: 0 -50%;
          pointer-events: none;
        }
        #picked::slotted(*) {
          display: none;
        }
        #picked::slotted([selected]) {
          display: unset;
        }

        #popover {
          display: hidden;
          box-sizing: border-box;
          margin: 0;
          border: solid 2px dimgray;
          padding: 0;
          background-color: white; 
        }
        #popover:popover-open {
          display: unset;
        }
        #popover::slotted(*) {
          padding: 0.25em;
          cursor: pointer;
        }
        #popover::slotted([active]) {
          background-color: rgba(255, 255, 255, 0.1);
        }
        #popover::slotted([selected]) {
          background-color: rgba(255, 255, 255, 0.2);
        }
        #popover::slotted([active][selected]) {
          background-color: rgba(255, 255, 255, 0.3);
        }
      </style>
      <input id="input" part="input" type="button" popovertarget="popover" />
      <slot id="picked" name="picked" part="picked"></slot>
      <slot></slot>
      <slot id="popover" name="popover" part="popover" popover="auto"></slot>
    `;
  }

  get open(): boolean {
    return this._open.value;
  }
  set open(value: boolean) {
    this._open.value = value;
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

  get placeholder(): string {
    return this._placeholder.value;
  }
  set placeholder(value: string) {
    this._placeholder.value = value;
  }

  showPicker(): void {
    this._popoverElem.showPopover();
  }

  hidePicker(): void {
    this._popoverElem.hidePopover();
  }

  togglePicker(): void {
    this._popoverElem.togglePopover();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.handleClick);
    this.subscribe(
      this._popoverElem,
      'beforetoggle',
      this.handlePopoverBeforetoggle,
    );

    this._internals.ariaHasPopup = 'true';
    if (!this.hasAttribute('aria-haspopup')) {
      this.ariaHasPopup = 'true';
    }

    this.updatePosition();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._picked.value = [];

    this.removeEventListener('click', this.handleClick);
    this.unsubscribe(
      this._popoverElem,
      'beforetoggle',
      this.handlePopoverBeforetoggle,
    );
    this.updatePosition();
  }

  override assignSlots(): void {
    super.assignSlots();
    const picked = this.assignedPicked();
    this._picked.value = picked;
  }

  override propertyChanged(
    name: string | symbol,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === this._options.name) {
      const curr = newValue as ReadonlyArray<HTMLValueOption>;
      const prev = oldValue as ReadonlyArray<HTMLValueOption>;
      return this.optionsChanged(curr, prev);
    }
    if (name === this._picked.name) {
      const curr = newValue as ReadonlyArray<HTMLValueOption>;
      const prev = oldValue as ReadonlyArray<HTMLValueOption>;
      return this.pickedChanged(curr, prev);
    }
    if (name === this._placeholder.name) {
      const curr = newValue as string;
      return this.placeholderChanged(curr);
    }
    if (name === this._open.name) {
      const curr = newValue as boolean;
      return this.openChanged(curr);
    }
    if (
      name === this._offset.name ||
      name === this._shift.name ||
      name === this._placement.name
    ) {
      return this.updatePosition();
    }
    return super.propertyChanged(name, oldValue, newValue);
  }

  protected override optionsChanged(
    newValue: ReadonlyArray<HTMLValueOption>,
    oldValue: ReadonlyArray<HTMLValueOption>,
  ): void {
    super.optionsChanged(newValue, oldValue);

    for (const option of oldValue) {
      this.unsubscribe(option, 'click', this.handleOptionClick);
      this.unsubscribe(option, 'mouseenter', this.handleOptionMouseenter);
    }
    for (const option of newValue) {
      this.subscribe(option, 'click', this.handleOptionClick);
      this.subscribe(option, 'mouseenter', this.handleOptionMouseenter);
    }
  }

  protected pickedChanged(
    newValue: ReadonlyArray<HTMLValueOption>,
    oldValue: ReadonlyArray<HTMLValueOption>,
  ): void {
    for (const option of oldValue) {
      this.unsubscribe(option, 'beforetoggle', this.handlePickedBeforeToggle);
      this.unsubscribe(option, 'toggle', this.handlePickedToggle);
      this.unsubscribe(option, 'change', this.handlePickedChange);
    }

    for (const option of newValue) {
      this.subscribe(option, 'beforetoggle', this.handlePickedBeforeToggle);
      this.subscribe(option, 'toggle', this.handlePickedToggle);
      this.subscribe(option, 'change', this.handlePickedChange);
    }
  }

  protected placeholderChanged(newValue: string): void {
    this._internals.ariaPlaceholder = newValue;
    this.ariaPlaceholder = newValue;
    const selected = getSelectedOptions(this._options.value);
    this._inputElem.value = selected.length === 0 ? newValue : '';
  }

  protected openChanged(newValue: boolean): void {
    this._internals.ariaExpanded = newValue ? 'true' : 'false';
    this.ariaExpanded = newValue ? 'true' : 'false';
    this.updatePosition();
    this._activeElement.value =
      getFirstOption(getSelectedOptions(this._options.value)) ??
      getFirstOption(this._options.value);
  }

  protected override selectOption(option: HTMLValueOption): void {
    if (!this._multiple.value) {
      for (const other of this._options.value) {
        other.selected = other.value === option.value;
      }
      for (const picked of this._picked.value) {
        picked.selected = picked.value === option.value;
      }
    } else {
      for (const other of this._options.value) {
        if (other.value !== option.value) continue;
        other.selected = true;
      }
      for (const picked of this._picked.value) {
        if (picked.value !== option.value) continue;
        picked.selected = true;
      }
    }
    this.saveForm();
  }

  protected override deselectOption(option: HTMLValueOption): void {
    for (const other of this._options.value) {
      if (other.value !== option.value) continue;
      other.selected = false;
    }
    for (const picked of this._picked.value) {
      if (picked.value !== option.value) continue;
      picked.selected = false;
    }
    this.saveForm();
  }

  protected updatePosition(): void {
    if (this._updateCleanup != null) {
      this._updateCleanup();
      this._updateCleanup = null;
    }
    if (!this._open.value || !this.isConnected) return;

    const middleware: Array<Middleware> = [];

    middleware.push(offsetMiddleware(this._offset.value));

    let placement: Exclude<Placement, 'auto'> | undefined;
    if (this._placement.value === 'auto') {
      middleware.push(autoPlacementMiddleware());
    } else {
      placement = this._placement.value;
      middleware.push(flipMiddleware());
    }

    middleware.push(shiftMiddleware({ padding: this._shift.value }));

    const style = window.getComputedStyle(this._popoverElem);

    const strategy = style.position === 'fixed' ? 'fixed' : 'absolute';

    const update = () => {
      computePosition(this._inputElem, this._popoverElem, {
        placement,
        middleware,
        strategy,
      })
        .then((result) => {
          this._popoverElem.style.left = `${result.x}px`;
          this._popoverElem.style.top = `${result.y}px`;
          const rect = this._inputElem.getBoundingClientRect();
          this._popoverElem.style.width = `${rect.width}px`;
          return result;
        })
        .catch((error) => console.error(error));
    };

    this._updateCleanup = autoUpdate(
      this._inputElem,
      this._popoverElem,
      update,
    );
  }

  protected override assignedOptions(): Array<HTMLValueOption> {
    if (!this.isConnected) return [];
    const slot = this.getShadowRootSlot('popover');
    if (slot == null) return [];
    const elements = slot.assignedElements();
    const notDefined = elements.filter((e) => e.matches(':not(:defined)'));
    const localNames = new Set(Array.from(notDefined, (e) => e.localName));
    for (const localName of localNames) {
      window.customElements
        .whenDefined(localName)
        .then(() => this.assignSlots())
        .catch(console.error);
    }
    return elements.filter(isHTMLValueOption);
  }

  protected assignedPicked(): Array<HTMLValueOption> {
    if (!this.isConnected) return [];
    const slot = this.getShadowRootSlot('picked');
    if (slot == null) return [];
    const elements = slot.assignedElements();
    const notDefined = elements.filter((e) => e.matches(':not(:defined)'));
    const localNames = new Set(Array.from(notDefined, (e) => e.localName));
    for (const localName of localNames) {
      window.customElements
        .whenDefined(localName)
        .then(() => this.assignSlots())
        .catch(console.error);
    }
    return elements.filter(isHTMLValueOption);
  }

  protected handleClick(event: MouseEvent): void {
    if (event.target !== this) return;
    this._userInteracted = true;
    this._inputElem.focus();
  }

  protected override handleKeydown(event: KeyboardEvent): void {
    this._userInteracted = true;
    if (event.target !== this) return;

    const keys = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'Enter', ' '];
    if (!keys.includes(event.key)) return;

    if (this._open.value) {
      if (this._activeElement.value == null) {
        this._activeElement.value =
          getFirstOption(getSelectedOptions(this._options.value)) ??
          getFirstOption(this._options.value);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        const option = this._activeElement.value;
        const selected = !option.selected;
        if (selected) {
          if (!this.canSelect()) return;
          this.selectNotifyOption(option);
          return;
        }
        if (!this.canDeselect()) return;
        this.deselectNotifyOption(option);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        // Alt + ArrowDow is the same as clicking on the input
        if (event.altKey) {
          this._inputElem.click();
          return;
        }
        this._activeElement.value = nextOptionOf(
          this._options.value,
          this._activeElement.value,
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        // Alt + ArrowUp is the same as clicking on the input
        if (event.altKey) {
          this._inputElem.click();
          return;
        }
        this._activeElement.value = previousOptionOf(
          this._options.value,
          this._activeElement.value,
        );
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        this._activeElement.value = getFirstOption(this._options.value);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        this._activeElement.value = getLastOption(this._options.value);
        return;
      }

      return;
    }

    // Don't do anything, just open the popover
    if (event.key === 'Enter' || event.key === ' ') {
      this._activeElement.value =
        getFirstOption(getSelectedOptions(this._options.value)) ??
        getFirstOption(this._options.value);
      return;
    }

    let next: HTMLValueOption | null = null;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      // Alt + ArrowDow or multiple is the same as clicking on the input
      if (event.altKey || this._multiple.value) {
        this._inputElem.click();
        return;
      }
      const current = getFirstOption(getSelectedOptions(this._options.value));
      next =
        current != null
          ? nextOptionOf(this._options.value, current)
          : getFirstOption(this._options.value);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      // Alt + ArrowUp or multiple is the same as clicking on the input
      if (event.altKey || this._multiple.value) {
        this._inputElem.click();
        return;
      }
      const current = getFirstOption(getSelectedOptions(this._options.value));
      next =
        current != null
          ? previousOptionOf(this._options.value, current)
          : getLastOption(this._options.value);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      next = getFirstOption(this._options.value);
    }

    if (event.key === 'End') {
      event.preventDefault();
      next = getLastOption(this._options.value);
    }

    if (next == null) return;

    const selected = !next.selected;
    if (selected) {
      if (!this.canSelect()) return;
      this.selectNotifyOption(next);
      return;
    }
    if (!this.canDeselect()) return;
    this.deselectNotifyOption(next);
    return;
  }

  protected override handleOptionClick(event: MouseEvent): void {
    this._userInteracted = true;
    if (this._multiple.value) return;
    const option = this._options.value.find((o) => o === event.target);
    if (option == null) return;
    this._popoverElem.hidePopover();
  }

  protected handleOptionMouseenter(event: MouseEvent): void {
    const option = this._options.value.find((o) => o === event.target);
    if (option == null) return;
    if (option.disabled) return;
    this._activeElement.value = option;
  }

  protected handlePickedChange(): void {
    for (const picked of this._picked.value) {
      const option = this._options.value.find((o) => o.value === picked.value);
      picked.selected = option?.selected ?? false;
    }
  }

  protected handlePickedBeforeToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const picked = this._picked.value.find((o) => o === event.target);
    if (picked == null) return;

    const option = this._options.value.find((o) => o.value === picked.value);
    if (option == null) return;

    this._userInteracted = true;

    if (newState === 'selected') {
      if (option.selected) return;
      if (this.canSelect()) return;
    }
    if (newState === 'unselected') {
      if (!option.selected) return;
      if (this.canDeselect()) return;
    }
    console.log('aqui');
    event.preventDefault();
  }

  protected handlePickedToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const picked = this._picked.value.find((o) => o === event.target);
    if (picked == null) return;

    const option = this._options.value.find((o) => o.value === picked.value);
    if (option == null) return;

    this._userInteracted = true;
    if (newState === 'selected') {
      if (option.selected) return;
      this.selectNotifyOption(option);
      return;
    }

    if (!option.selected) return;
    this.deselectNotifyOption(option);
    return;
  }

  protected handlePopoverBeforetoggle(event: ToggleEvent): void {
    this._open.value = event.newState === 'open';
  }

  static override get observedAttributes(): Array<string> {
    return [
      ...super.observedAttributes,
      'placeholder',
      'search',
      'open',
      'offset',
      'shift',
      'placement',
    ];
  }
}

window.IpeComboboxElement = IpeComboboxElement;

window.customElements.define('ipe-combobox', IpeComboboxElement);

declare global {
  interface Window {
    IpeComboboxElement: typeof IpeComboboxElement;
  }

  interface HTMLElementTagNameMap {
    'ipe-combobox': IpeComboboxElement;
  }
}
