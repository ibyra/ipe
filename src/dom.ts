/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />

declare global {
  interface HTMLElementEventMap {
    toggle: ToggleEvent;
    beforetoggle: ToggleEvent;
  }
}

export type HTMLButton = HTMLButtonElement | HTMLInputElement;

/**
 * Represents an HTML element that can be selected as an option.
 */
export interface HTMLOption extends HTMLElement {
  /**
   * The selected state of the option.
   */
  selected: boolean;

  /**
   * The disabled state of the option.
   */
  disabled: boolean;

  /**
   * Toggles the selected state of the option.
   */
  toggle(): void;

  /**
   * Selects the option, if the option is not selected.
   **/
  select(): void;

  /**
   * Deselects the option, if the option is selected.
   */
  deselect(): void;
}

/**
 * Represents an HTML element that contains a list of options that can be
 * selected.
 */
export interface HTMLOptlist<T extends HTMLOption = HTMLOption>
  extends HTMLElement {
  /**
   * The disabled state of the option list.
   */
  disabled: boolean;

  /**
   * The multiple state of the option list. If `true`, multiple options can
   * be in the selected state at the same time. If `false`, only one option
   * can be in the selected state at the same time.
   */
  multiple: boolean;

  /**
   * The clearable state of the option list. If `true`, the user can deselect
   * all the options of the list. If `false`, the user can deselect all the
   * options but one.
   */
  clearable: boolean;

  /**
   * An array of references of the options of this list.
   */
  readonly options: Array<T>;

  /**
   * An array of references of the selected options of this list.
   */
  readonly selectedOptions: Array<T>;

  /**
   * A references to the selected option if there are one; or `null` if there
   * are no selected option.
   */
  readonly selectedOption: T | null;

  /**
   * Toggles the selection of the option.
   */
  toggle(option: T): void;

  /**
   * Selects the option if the option is in this list and not selected.
   **/
  select(option: T): void;

  /**
   * Deselects the option if the option is in this list and selected.
   */
  deselect(option: T): void;

  /**
   * Returns a reference to the first non-disabled option of this list; or
   * `null` otherwise.
   */
  first(): T | null;

  /**
   * Returns a reference to the last non-disabled option of this list; or
   * `null` otherwise.
   */
  last(): T | null;

  /**
   * Returns a reference to the next non-disabled option of:
   * - the active option, or;
   * - the first selected option, or;
   * - the first option of this list.
   */
  next(): T | null;

  /**
   * Returns a reference to the previous non-disabled option of:
   * - the active option, or;
   * - the last selected option, or;
   * - the last option of this list.
   */
  previous(): T | null;
}

/**
 * Represents an HTML element that can be opened.
 */
export interface HTMLOpenable extends HTMLElement {
  /**
   * The opened state of the element.
   */
  open: boolean;
}

/**
 * Represents an HTML element that can be selected as an option as it is open
 * or closed when interacting with one of the its summaries.
 */
export interface HTMLDisclosure extends HTMLOption, HTMLOpenable {
  /**
   * An array of references of all the summaries of this disclosure.
   */
  summaries: Array<Element>;
}

/**
 * Represents an HTML element that contains a list of disclosures that can be
 * open/closed.
 */
export interface HTMLAccordion extends HTMLOptlist<HTMLDisclosure> {
  clearable: boolean;
}
