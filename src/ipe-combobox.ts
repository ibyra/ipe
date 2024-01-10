import {
  type Middleware,
  autoPlacement as autoPlacementMiddleware,
  autoUpdate,
  computePosition,
  flip as flipMiddleware,
  offset as offsetMiddleware,
  shift as shiftMiddleware,
} from '@floating-ui/dom';
import {
  type HTMLOpenable,
  type HTMLOptlist,
  type HTMLValueOption,
  type Placement,
} from './dom';
import { IpeOptlistElement } from './ipe-optlist';
import {
  BooleanAttr,
  IntegerAttr,
  PlacementAttr,
  StringAttr,
} from './attributes';
import { IntegerFData, PlacementFData, StringFData } from './formdata';
import { isBoolean, isHTMLValueOption, isPlacement, isString } from './commons';
import { isEqual } from 'moderndash';

// TODO: Add support to option group element

// TODO: remove "--ipe-combobox-index" CSS variable when the CSS `attr()`
//       function supports integer values.
//       https://developer.mozilla.org/en-US/docs/Web/CSS/attr

export class IpeComboboxElement
  extends IpeOptlistElement
  implements HTMLOptlist<HTMLValueOption>, HTMLOpenable
{
  protected _openAttr = new BooleanAttr(this, 'open', false);
  protected _open: boolean = false;

  protected _placeholderAttr = new StringAttr(this, 'placeholder', '');
  protected _placeholderFData = new StringFData('placeholder', '');
  protected _placeholder: string = '';

  protected _offsetAttr = new IntegerAttr(this, 'offset', 0);
  protected _offsetFData = new IntegerFData('offset', 0);
  protected _offset: number = 0;

  protected _shiftAttr = new IntegerAttr(this, 'shift', 0);
  protected _shiftFData = new IntegerFData('shift', 0);
  protected _shift: number = 0;

  protected _placementAttr = new PlacementAttr(
    this,
    'placement',
    'auto' as Placement,
  );
  protected _placementFData = new PlacementFData(
    'placement',
    'auto' as Placement,
  );
  protected _placement: Placement = 'auto';

  protected _popoverElem: HTMLDivElement;

  protected _inputElem: HTMLInputElement;

  protected _picked: ReadonlyArray<HTMLValueOption> = [];

  protected _updateTimerID: number | null = null;

  protected _updateCleanup: (() => void) | null = null;

  constructor() {
    super();
    this._popoverElem = this.shadowRoot!.querySelector('#popover')!;
    this._inputElem = this.shadowRoot!.querySelector('input')!;
  }

  protected override get template(): string {
    return `
      <input part="input" type="button" popovertarget="popover" />
      <slot name="picked" part="picked"></slot>
      <slot></slot>
      <slot id="popover" name="popover" part="popover" popover="auto"></slot>
    `;
  }

  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(value: boolean) {
    if (!isString(value)) return;
    if (!this.changePlaceholder(value)) return;
    this.saveFormValue();
  }

  get open(): boolean {
    return this._open;
  }
  set open(value: boolean) {
    if (!isBoolean(value)) return;
    if (!this.changeOpen(value)) return;
    this.updatePosition();
  }

  get offset(): number {
    return this._offset;
  }
  set offset(value: number) {
    if (typeof value !== 'number') return;
    if (!this.changeOffset(value)) return;
    this.updatePosition();
    this.saveFormValue();
  }

  get shift(): number {
    return this._shift;
  }
  set shift(value: number) {
    if (typeof value !== 'number') return;
    if (!this.changeShift(value)) return;
    this.updatePosition();
    this.saveFormValue();
  }

  get placement(): Placement {
    return this._placement;
  }
  set placement(value: Placement) {
    if (!isPlacement(value)) return;
    if (!this.changePlacement(value)) return;
    this.updatePosition();
    this.saveFormValue();
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

  protected override initProperties(): void {
    super.initProperties();
    this.changePlaceholder(this._placeholderAttr.get());
    this.changeOpen(this._openAttr.get());
    this.changeOffset(this._offsetAttr.get());
    this.changeShift(this._shiftAttr.get());
    this.changePlacement(this._placementAttr.get());
    this._internals.ariaHasPopup = 'true';
    if (!this.hasAttribute('aria-haspopup')) {
      this.ariaHasPopup = 'true';
    }
  }

  protected override holdListeners(): void {
    super.holdListeners();
    this.subscribe(
      this._popoverElem,
      'beforetoggle',
      this.handlePopoverBeforetoggle,
    );
  }

  protected override releaseListeners(): void {
    super.releaseListeners();
    this.unsubscribe(
      this._popoverElem,
      'beforetoggle',
      this.handlePopoverBeforetoggle,
    );
  }

  protected override holdSlots(): void {
    super.holdSlots();
    const picked = this.assignedPicked();
    this.changePicked(picked);
  }

  protected override releaseSlots(): void {
    super.releaseSlots();
    this.changePicked([]);
  }

  protected override connectedCallback() {
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
    if (name === this._placeholderAttr.name) {
      const placeholder = this._placeholderAttr.from(newValue);
      if (!this.changePlaceholder(placeholder)) return;
      this.saveFormValue();
      return;
    }
    if (name === this._openAttr.name) {
      const open = this._openAttr.from(newValue);
      if (!this.changeOpen(open)) return;
      this.updatePosition();
      return;
    }
    if (name === this._offsetAttr.name) {
      const offset = this._offsetAttr.from(newValue);
      if (!this.changeOffset(offset)) return;
      this.updatePosition();
      this.saveFormValue();
      return;
    }
    if (name === this._shiftAttr.name) {
      const shift = this._shiftAttr.from(newValue);
      if (!this.changeShift(shift)) return;
      this.updatePosition();
      this.saveFormValue();
      return;
    }
    if (name === this._placementAttr.name) {
      const placement = this._placementAttr.from(newValue);
      if (!this.changePlacement(placement)) return;
      this.updatePosition();
      this.saveFormValue();
      return;
    }
  }

  protected override getFormState(): FormData {
    const state = super.getFormState();
    this._placeholderFData.set(state, this._placeholder);
    this._offsetFData.set(state, this._offset);
    this._shiftFData.set(state, this._shift);
    this._placementFData.set(state, this._placement);
    return state;
  }

  protected override setFormState(state: FormData): void {
    super.setFormState(state);
    this.changePlaceholder(this._placeholderFData.get(state));
    this.changeOffset(this._offsetFData.get(state));
    this.changeShift(this._shiftFData.get(state));
    this.changePlacement(this._placementFData.get(state));
  }

  protected override changeOptions(
    newValue: readonly HTMLValueOption[],
  ): boolean {
    const oldValue = this._options;
    if (!super.changeOptions(newValue)) return false;
    for (const option of oldValue) {
      this.unsubscribe(option, 'click', this.handleOptionClick);
      this.unsubscribe(option, 'mouseenter', this.handleOptionMouseenter);
    }
    for (const option of newValue) {
      this.subscribe(option, 'click', this.handleOptionClick);
      this.subscribe(option, 'mouseenter', this.handleOptionMouseenter);
    }
    return true;
  }

  protected override changeValues(newValue: readonly string[]): boolean {
    if (!super.changeValues(newValue)) return false;
    for (const option of this._picked) {
      const index = newValue.indexOf(option.value);
      option.selected = index !== -1;
      option.style.setProperty('--ipe-combobox-index', index.toString());
    }
    this._inputElem.value = newValue.length === 0 ? this._placeholder : '';
    return true;
  }

  protected changePicked(newValue: ReadonlyArray<HTMLValueOption>): boolean {
    const oldValue = this._picked;
    if (isEqual(oldValue, newValue)) return false;
    this._picked = newValue;
    for (const option of oldValue) {
      option.style.removeProperty('--ipe-combobox-index');
      this.unsubscribe(option, 'beforetoggle', this.handlePickedBeforeToggle);
      this.unsubscribe(option, 'toggle', this.handlePickedToggle);
      this.unsubscribe(option, 'change', this.handlePickedChange);
    }
    for (const option of newValue) {
      const index = this._values.indexOf(option.value);
      option.selected = index !== -1;
      option.style.setProperty('--ipe-combobox-index', index.toString());
      this.subscribe(option, 'beforetoggle', this.handlePickedBeforeToggle);
      this.subscribe(option, 'toggle', this.handlePickedToggle);
      this.subscribe(option, 'change', this.handlePickedChange);
    }
    return true;
  }

  protected changePlaceholder(newValue: string): boolean {
    const oldValue = this._placeholder;
    if (newValue === oldValue) return false;
    this._placeholder = newValue;
    this._placeholderAttr.set(newValue);
    this._internals.ariaPlaceholder = newValue;
    this.ariaPlaceholder = newValue;
    this._inputElem.value = this._values.length === 0 ? newValue : '';
    return true;
  }

  protected changeOpen(newValue: boolean): boolean {
    const oldValue = this._open;
    if (newValue === oldValue) return false;
    this._open = newValue;
    this._openAttr.set(newValue);
    this._internals.ariaExpanded = newValue ? 'true' : 'false';
    this.ariaExpanded = newValue ? 'true' : 'false';
    return true;
  }

  protected changeOffset(newValue: number): boolean {
    const oldValue = this._offset;
    if (oldValue === newValue) return false;
    this._offset = newValue;
    this._offsetAttr.set(newValue);
    return true;
  }

  protected changeShift(newValue: number): boolean {
    const oldValue = this._shift;
    if (oldValue === newValue) return false;
    this._shift = newValue;
    this._shiftAttr.set(newValue);
    return true;
  }

  protected changePlacement(newValue: Placement): boolean {
    const oldValue = this._placement;
    if (oldValue === newValue) return false;
    this._placement = newValue;
    this._placementAttr.set(newValue);
    return true;
  }

  protected updatePosition(): void {
    if (this._updateCleanup != null) {
      this._updateCleanup();
      this._updateCleanup = null;
    }
    if (!this._open || !this.isConnected) return;
    const placement = this._placement === 'auto' ? undefined : this._placement;
    const middleware: Array<Middleware> = [];
    if (Number.isSafeInteger(this._offset)) {
      middleware.push(offsetMiddleware(this._offset));
    }
    if (this._placement === 'auto') {
      middleware.push(autoPlacementMiddleware());
    } else {
      middleware.push(flipMiddleware());
    }
    if (Number.isSafeInteger(this._shift)) {
      middleware.push(shiftMiddleware({ padding: this._shift }));
    }
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

  protected getFirstPicked(): HTMLValueOption | null {
    return this._picked.find((o) => !o.disabled && o.selected) ?? null;
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
        .then(() => this.holdSlots())
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
        .then(() => this.holdSlots())
        .catch(console.error);
    }
    return elements.filter(isHTMLValueOption);
  }

  protected override handleClick(event: MouseEvent): void {
    // Search input will prevent this event
    if (event.defaultPrevented) return;
    if (event.target !== this) return;
    this._userInteracted = true;
    // @ts-expect-error Only implemented in Firefox right now.
    this._inputElem.focus({ focusVisible: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override handleFocus(_event: FocusEvent): void {
    // const option = this.getFirstPicked();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override handleBlur(_event: FocusEvent): void {
    // if (!this.changeActiveElement(null)) return;
  }

  protected override handleKeydown(event: KeyboardEvent): void {
    this._userInteracted = true;
    if (event.target !== this) return;
    // Search input will prevent this event
    if (event.defaultPrevented) return;
    const keys = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'Enter', ' '];
    if (!keys.includes(event.key)) return;

    if (this._open) {
      if (event.key === 'Enter' || event.key === ' ') {
        if (this._activeElement == null) return;
        const selected = !this._activeElement.selected;
        if (!this.canSelect(selected)) return;
        // If is multiple, prevent closing the popover on selection
        if (this.multiple) event.preventDefault();
        const value = this._activeElement.value;
        if (!this.selectNotifyValue(value, selected)) return;
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        // Alt + ArrowDow is the same as clicking on the input
        if (event.altKey) {
          this._inputElem.click();
          return;
        }
        const next =
          this._activeElement != null
            ? this.nextOf(this._activeElement)
            : this.getFirstSelected() ?? this.getFirst();
        this.changeActiveElement(next);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        // Alt + ArrowUp is the same as clicking on the input
        if (event.altKey) {
          this._inputElem.click();
          return;
        }
        const next =
          this._activeElement != null
            ? this.previousOf(this._activeElement)
            : this.getLastSelected() ?? this.getLast();
        this.changeActiveElement(next);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        const next = this.getFirst();
        this.changeActiveElement(next);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        const next = this.getLast();
        this.changeActiveElement(next);
        return;
      }
      return;
    }
    // Don't do anything, just open the popover
    if (event.key === 'Enter' || event.key === ' ') return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      // Alt + ArrowDow or multiple is the same as clicking on the input
      if (event.altKey || this._multiple) {
        this._inputElem.click();
        return;
      }
      const current = this.getFirstSelected();
      const next = current != null ? this.nextOf(current) : this.getFirst();
      if (next == null) return;
      const selected = !next.selected;
      if (!this.canSelect(selected)) return;
      if (!this.selectNotifyValue(next.value, selected)) return;
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      // Alt + ArrowUp or multiple is the same as clicking on the input
      if (event.altKey || this._multiple) {
        this._inputElem.click();
        return;
      }
      const current = this.getFirstSelected();
      const next = current != null ? this.previousOf(current) : this.getLast();
      if (next == null) return;
      const selected = !next.selected;
      if (!this.canSelect(selected)) return;
      if (!this.selectNotifyValue(next.value, selected)) return;
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      const next = this.getFirst();
      if (next == null) return;
      const selected = !next.selected;
      if (!this.canSelect(selected)) return;
      if (!this.selectNotifyValue(next.value, selected)) return;
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      const next = this.getLast();
      if (next == null) return;
      const selected = !next.selected;
      if (!this.canSelect(selected)) return;
      if (!this.selectNotifyValue(next.value, selected)) return;
      return;
    }
  }

  protected handleOptionClick(event: MouseEvent): void {
    this._userInteracted = true;
    if (this._multiple) return;
    const option = this._options.find((o) => o === event.target);
    if (option == null) return;
    this._popoverElem.hidePopover();
  }

  protected handleOptionMouseenter(event: MouseEvent): void {
    const option = this._options.find((o) => o === event.target);
    if (option == null) return;
    if (option.disabled) return;
    this.changeActiveElement(option);
  }

  protected handlePickedChange(): void {
    for (const option of this._picked) {
      option.selected = this._values.includes(option.value);
    }
  }

  protected handlePickedBeforeToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;
    const picked = this._picked.find((option) => option === event.target);
    if (picked == null) return;
    this._userInteracted = true;
    const selected = newState === 'selected';
    if (this.canSelect(selected)) return;
    event.preventDefault();
  }

  protected handlePickedToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;
    const picked = this._picked.find((option) => option === event.target);
    if (picked == null) return;
    this._userInteracted = true;
    const selected = newState === 'selected';
    this.selectNotifyValue(picked.value, selected);
  }

  protected handlePopoverBeforetoggle(event: ToggleEvent): void {
    const open = event.newState === 'open';
    if (!this.changeOpen(open)) return;
    this.updatePosition();
    const next = open ? this.getFirstSelected() ?? this.getFirst() : null;
    this.changeActiveElement(next);
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
