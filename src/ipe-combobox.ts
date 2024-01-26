import {
  type Middleware,
  autoPlacement as autoPlacementMiddleware,
  autoUpdate,
  computePosition,
  flip as flipMiddleware,
  offset as offsetMiddleware,
  shift as shiftMiddleware,
} from '@floating-ui/dom';
import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import { isEqual } from 'moderndash';
import { IpeOptlistElement } from './ipe-optlist';
import {
  type HTMLOpenable,
  type HTMLOptlist,
  type HTMLValueOption,
  type Placement,
  asInt,
  asPlacement,
  isHTMLValueOption,
  nextOptionOf,
  previousOptionOf,
  BoolAttributeConverter,
  IntAttributeConverter,
  PlacementAttributeConverter,
  StringAttributeConverter,
} from './commons';

// TODO: Add support to option group element

export class IpeComboboxElement
  extends IpeOptlistElement
  implements HTMLOptlist<HTMLValueOption>, HTMLOpenable
{
  static override properties: PropertyDeclarations = {
    open: {
      reflect: true,
      attribute: 'open',
      converter: new BoolAttributeConverter(),
    },
    offset: {
      reflect: true,
      attribute: 'offset',
      converter: new IntAttributeConverter(0),
    },
    shift: {
      reflect: true,
      attribute: 'shift',
      converter: new IntAttributeConverter(0),
    },
    placement: {
      reflect: true,
      attribute: 'placement',
      converter: new PlacementAttributeConverter(),
    },
    placeholder: {
      reflect: true,
      attribute: 'placeholder',
      converter: new StringAttributeConverter(),
    },
  };

  static override styles = css`
    :host {
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      height: 2.5em;
      border: solid 0.125em dimgray;
      background-color: white;
      font-size: 1em;
      line-height: 1;
      cursor: pointer;
    }

    #input {
      box-sizing: border-box;
      position: absolute;
      display: block;
      border: none;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      padding: 0 0.5em;
      background-color: transparent;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: dimgray;
      cursor: pointer;
    }

    #picked {
      box-sizing: border-box;
      position: absolute;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5em;
      border: none;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      padding: 0 0.5em;
      background-color: transparent;
      text-align: left;
      color: currentColor;
      pointer-events: none;
    }
    #picked::slotted(*) {
      display: none;
      border: 0;
      font-size: 1em;
    }
    #picked::slotted([selected]) {
      display: unset;
    }

    #popover {
      display: hidden;
      box-sizing: border-box;
      margin: 0;
      border: solid 0.125em dimgray;
      padding: 0;
      background-color: white;
    }
    #popover:popover-open {
      display: unset;
    }
    #popover::slotted(*) {
      border: 0;
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
  `;

  static override content = `
    <input id="input" part="placeholder" type="button" popovertarget="popover" inert />
    <slot id="picked" name="picked" part="picked"></slot>
    <slot></slot>
    <slot id="popover" name="popover" part="popover" popover="auto"></slot>
  `;

  public declare open: boolean;
  public declare offset: number;
  public declare shift: number;
  public declare placement: Placement;
  public declare placeholder: string;

  protected declare _defaultOffset: number;
  protected declare _defaultShift: number;
  protected declare _defaultPlacement: Placement;
  protected declare _defaultPlaceholder: string;
  protected declare _updateCleanup: (() => void) | null;
  protected declare _picked: ReadonlyArray<HTMLValueOption>;

  constructor() {
    super();
    this.open = false;
    this.offset = 0;
    this.shift = 0;
    this.placement = 'auto';
    this.placeholder = '';
    this._defaultOffset = 0;
    this._defaultShift = 0;
    this._defaultPlacement = 'auto';
    this._defaultPlaceholder = '';
    this._updateCleanup = null;
    this._picked = [];
  }

  showPicker(): void {
    this.popoverSlot?.showPopover();
  }

  hidePicker(): void {
    this.popoverSlot?.hidePopover();
  }

  togglePicker(): void {
    this.popoverSlot?.togglePopover();
  }

  override connectedCallback() {
    super.connectedCallback();

    this._defaultOffset = this.offset;
    this._defaultShift = this.shift;
    this._defaultPlacement = this.placement;
    this._defaultPlaceholder = this.placeholder;

    this._internals.ariaHasPopup = 'true';
    if (!this.hasAttribute('aria-haspopup')) {
      this.ariaHasPopup = 'true';
    }

    this.addEventListener('click', this.handleClick);
    this.updatePicked();

    const inputElement = this.inputElement;
    if (inputElement != null) {
      this.subscribe(inputElement, 'click', this.handleInputClick);
    }

    const popoverSlot = this.popoverSlot;
    if (popoverSlot != null) {
      this.subscribe(popoverSlot, 'slotchange', this.handlePopoverSlotChange);
      this.subscribe(
        popoverSlot,
        'beforetoggle',
        this.handlePopoverBeforetoggle,
      );
      this.subscribe(popoverSlot, 'toggle', this.handlePopoverToggle);
    }

    const pickedSlot = this.pickedSlot;
    if (pickedSlot != null) {
      this.subscribe(pickedSlot, 'slotchange', this.handlePickedSlotChange);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
    this.updatePicked();

    const inputElement = this.inputElement;
    if (inputElement != null) {
      this.unsubscribe(inputElement, 'click', this.handleInputClick);
    }

    const popoverSlot = this.popoverSlot;
    if (popoverSlot != null) {
      this.unsubscribe(popoverSlot, 'slotchange', this.handlePopoverSlotChange);
      this.unsubscribe(
        popoverSlot,
        'beforetoggle',
        this.handlePopoverBeforetoggle,
      );
      this.unsubscribe(popoverSlot, 'toggle', this.handlePopoverToggle);
    }

    const pickedSlot = this.pickedSlot;
    if (pickedSlot != null) {
      this.unsubscribe(pickedSlot, 'slotchange', this.handlePickedSlotChange);
    }
    this.updatePosition();
  }

  protected get inputElement(): HTMLInputElement | null {
    const element = this.renderRoot.querySelector('input');
    return element;
  }

  protected get pickedSlot(): HTMLSlotElement | null {
    const element = this.getSlot('picked');
    return element;
  }

  protected get popoverSlot(): HTMLSlotElement | null {
    const element = this.getSlot('popover');
    return element;
  }

  protected get _positionProps(): Array<keyof this> {
    return ['open', 'offset', 'shift', 'placement'];
  }

  protected override get _formProps(): (keyof this)[] {
    return [...super._formProps, 'offset', 'shift', 'placement', 'placeholder'];
  }

  protected override saveForm(): void {
    super.saveForm();
    const inputElement = this.inputElement;
    if (inputElement == null) return;
    const selected = this.getOptionsValues();
    inputElement.value = selected.length === 0 ? this.placeholder : '';
  }

  protected override resetForm(): void {
    super.resetForm();
    this.offset = this._defaultOffset;
    this.shift = this._defaultShift;
    this.placement = this._defaultPlacement;
    this.placeholder = this._defaultPlaceholder;
    for (const pick of this._picked) {
      const option = this._options.find((o) => o.value === pick.value);
      pick.selected = option?.selected ?? false;
    }
  }

  protected override restoreForm(state: FormData): void {
    super.restoreForm(state);
    if (state.has('offset')) {
      const entry = state.get('offset')!;
      this.offset = asInt(Number.parseFloat(String(entry)));
    }
    if (state.has('shift')) {
      const entry = state.get('shift')!;
      this.shift = asInt(Number.parseFloat(String(entry)));
    }
    if (state.has('placement')) {
      const entry = state.get('placement')!;
      this.placement = asPlacement(String(entry));
    }
    if (state.has('placeholder')) {
      const entry = state.get('placeholder')!;
      this.placeholder = String(entry);
    }
    for (const pick of this._picked) {
      const option = this._options.find((o) => o.value === pick.value);
      pick.selected = option?.selected ?? false;
    }
  }

  protected override updated(props: PropertyValues<this>): void {
    if (props.has('open')) this.openUpdated();
    if (props.has('offset')) this.offsetUpdated();
    if (props.has('shift')) this.shiftUpdated();
    if (props.has('placement')) this.placementUpdated();
    if (props.has('placeholder')) this.placeholderUpdated();
    const positionPropNames = this._positionProps;
    const changedPropNames = Array.from(props.keys());
    if (positionPropNames.some((name) => changedPropNames.includes(name))) {
      this.updatePosition();
    }
    return super.updated(props);
  }

  protected openUpdated(): void {
    this._internals.ariaExpanded = this.open ? 'true' : 'false';
    this.ariaExpanded = this.open ? 'true' : 'false';
  }

  protected offsetUpdated(): void {
    const offset = this.offset.toString(10);
    this._formState.set('offset', offset);
  }

  protected shiftUpdated(): void {
    const shift = this.shift.toString(10);
    this._formState.set('shift', shift);
  }

  protected placementUpdated(): void {
    this._formState.set('placement', this.placement);
  }

  protected placeholderUpdated(): void {
    this._formState.set('placeholder', this.placeholder);
    this._internals.ariaPlaceholder = this.placeholder;
    this.ariaPlaceholder = this.placeholder;
    const inputElement = this.inputElement;
    if (inputElement == null) return;
    const selected = this.getOptionsValues();
    inputElement.value = selected.length === 0 ? this.placeholder : '';
  }

  protected override optionsUpdated(
    oldValue: ReadonlyArray<HTMLValueOption>,
  ): void {
    super.optionsUpdated(oldValue);
    for (const pick of this._picked) {
      const option = this._options.find((o) => o.value === pick.value);
      pick.selected = option?.selected ?? false;
    }
  }

  protected pickedUpdated(oldValue: ReadonlyArray<HTMLValueOption>): void {
    for (const pick of oldValue) {
      this.unsubscribe(pick, 'beforetoggle', this.handlePickedBeforeToggle);
      this.unsubscribe(pick, 'toggle', this.handlePickedToggle);
      this.unsubscribe(pick, 'change', this.handlePickedChange);
    }

    for (const pick of this._picked) {
      const option = this._options.find((o) => o.value === pick.value);
      pick.selected = option?.selected ?? false;
      this.subscribe(pick, 'beforetoggle', this.handlePickedBeforeToggle);
      this.subscribe(pick, 'toggle', this.handlePickedToggle);
      this.subscribe(pick, 'change', this.handlePickedChange);
    }
  }

  protected override async updateOptions(): Promise<void> {
    const elements = await this.getDefinedAssignedElements('popover');
    const newValue = elements.filter(isHTMLValueOption);
    const oldValue = this._options;
    if (isEqual(oldValue, newValue)) return;

    this._options = newValue;
    this.optionsUpdated(oldValue);
  }

  protected async updatePicked(): Promise<void> {
    const elements = await this.getDefinedAssignedElements('picked');
    const newValue = elements.filter(isHTMLValueOption);
    const oldValue = this._options;
    if (isEqual(oldValue, newValue)) return;

    this._picked = newValue;
    this.pickedUpdated(oldValue);
  }

  protected override selectOption(option: HTMLValueOption): void {
    if (!this.multiple) {
      for (const other of this._options) {
        other.selected = other.value === option.value;
      }
      for (const pick of this._picked) {
        pick.selected = pick.value === option.value;
      }
    } else {
      for (const other of this._options) {
        if (other.value !== option.value) continue;
        other.selected = true;
      }
      for (const pick of this._picked) {
        if (pick.value !== option.value) continue;
        pick.selected = true;
      }
    }
    this.saveForm();
  }

  protected override deselectOption(option: HTMLValueOption): void {
    for (const other of this._options) {
      if (other.value !== option.value) continue;
      other.selected = false;
    }
    for (const picked of this._picked) {
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
    if (!this.open || !this.isConnected) return;

    const popoverSlot = this.popoverSlot;
    if (popoverSlot == null) return;

    const middleware: Array<Middleware> = [];
    middleware.push(offsetMiddleware(this.offset));

    let placement: Exclude<Placement, 'auto'> | undefined;
    if (this.placement === 'auto') {
      middleware.push(autoPlacementMiddleware());
    } else {
      placement = this.placement;
      middleware.push(flipMiddleware());
    }

    middleware.push(shiftMiddleware({ padding: this.shift }));

    const style = window.getComputedStyle(popoverSlot);

    const strategy = style.position === 'fixed' ? 'fixed' : 'absolute';

    const update = () => {
      computePosition(this, popoverSlot, {
        placement,
        middleware,
        strategy,
      })
        .then((result) => {
          popoverSlot.style.left = `${result.x}px`;
          popoverSlot.style.top = `${result.y}px`;
          const rect = this.getBoundingClientRect();
          popoverSlot.style.width = `${rect.width}px`;
          return result;
        })
        .catch((error) => console.error(error));
    };

    this._updateCleanup = autoUpdate(this, popoverSlot, update);
  }

  protected override handleSlotChange(): void {
    return;
  }

  protected handlePopoverSlotChange(): void {
    this.updateOptions();
  }

  protected handlePickedSlotChange(): void {
    this.updatePicked();
  }

  protected override handleBlur(event: FocusEvent): void {
    super.handleBlur(event);
    this.popoverSlot?.hidePopover();
    const inputElement = this.inputElement;
    if (inputElement == null) return;
    inputElement.inert = true;
  }

  protected handleClick(event: MouseEvent): void {
    if (event.target !== this) return;
    this._userInteracted = true;
    const inputElement = this.inputElement;
    if (inputElement == null) return;
    inputElement.inert = false;
    inputElement.click();
  }

  protected handleInputClick(event: MouseEvent): void {
    event.stopImmediatePropagation();
    this.focus();
  }

  protected override handleKeydown(event: KeyboardEvent): void {
    this._userInteracted = true;
    if (event.target !== this) return;

    const keys = ['Home', 'End', 'ArrowDown', 'ArrowUp', 'Enter', ' ', 'Tab'];
    if (!keys.includes(event.key)) return;

    if (this.open) {
      if (this.activeElement == null) return;

      if (event.key === 'Tab') {
        // Prevent changing focus when the combobox is opened
        event.preventDefault();
      }

      if (event.key === 'Enter' || event.key === ' ') {
        const selected = !this.activeElement.selected;
        if (selected && this.canSelect()) {
          this.selectNotifyOption(this.activeElement);
        }
        if (!selected && this.canDeselect()) {
          this.deselectNotifyOption(this.activeElement);
        }
        if (this.multiple) return;
        this.popoverSlot?.hidePopover();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        // Alt + ArrowDow is the same as clicking on the input
        if (event.altKey) {
          this.inputElement?.click();
          return;
        }
        this.activeElement = nextOptionOf(this.options, this.activeElement);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        // Alt + ArrowUp is the same as clicking on the input
        if (event.altKey) {
          this.inputElement?.click();
          return;
        }
        this.activeElement = previousOptionOf(
          this._options,
          this.activeElement,
        );
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        this.activeElement = this.first();
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        this.activeElement = this.last();
        return;
      }

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const inputElement = this.inputElement;
      if (inputElement == null) return;
      inputElement.inert = false;
      inputElement.click();
      // this.activeElement = this.selectedOption ?? this.first();
      return;
    }

    let next: HTMLValueOption | null = null;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      // Alt + ArrowDow or multiple is the same as clicking on the input
      if (event.altKey || this.multiple) {
        this.inputElement?.click();
        return;
      }
      const current = this.selectedOption;
      next =
        current != null ? nextOptionOf(this._options, current) : this.first();
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      // Alt + ArrowUp or multiple is the same as clicking on the input
      if (event.altKey || this.multiple) {
        this.inputElement?.click();
        return;
      }
      const current = this.selectedOption;
      next =
        current != null
          ? previousOptionOf(this._options, current)
          : this.last();
    }

    if (event.key === 'Home') {
      event.preventDefault();
      next = this.first();
    }

    if (event.key === 'End') {
      event.preventDefault();
      next = this.last();
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
    super.handleOptionClick(event);
    if (this.multiple) return;
    this.popoverSlot?.hidePopover();
  }

  protected handlePickedChange(event: Event): void {
    const pick = this._picked.find((p) => p === event.target);
    if (pick == null) return;

    const option = this._options.find((o) => o.value === pick.value);
    pick.selected = option?.selected ?? false;
  }

  protected handlePickedBeforeToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const picked = this._picked.find((o) => o === event.target);
    if (picked == null) return;

    const option = this._options.find((o) => o.value === picked.value);
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

    event.preventDefault();
  }

  protected handlePickedToggle(event: ToggleEvent): void {
    const newState = event.newState;
    if (newState !== 'selected' && newState !== 'unselected') return;

    const pick = this._picked.find((o) => o === event.target);
    if (pick == null) return;

    const option = this._options.find((o) => o.value === pick.value);
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
    const beforeToggle = new ToggleEvent('beforetoggle', {
      cancelable: true,
      newState: event.newState,
      oldState: event.oldState,
    });
    const proceed = this.dispatchEvent(beforeToggle);
    if (!proceed) {
      event.preventDefault();
      return;
    }

    this.open = event.newState === 'open';
    this.activeElement = this.selectedOption ?? this.first();
    if (event.newState === 'open') return;

    this.focus();

    const inputElement = this.inputElement;
    if (inputElement == null) return;

    inputElement.inert = true;
  }

  protected handlePopoverToggle(event: ToggleEvent): void {
    const toggle = new ToggleEvent('toggle', {
      cancelable: false,
      newState: event.newState,
      oldState: event.oldState,
    });
    this.dispatchEvent(toggle);
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
