/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />

import type { Host, AttributeProp } from './property';

/**
 * Represents a base component that all other Ipe elements can extend.
 */
export abstract class IpeElement extends HTMLElement implements Host {
  #boundListeners = new WeakMap<EventListener, EventListener>();

  #propertyByName = new Map<string, AttributeProp<unknown>>();

  constructor() {
    super();
    const template = this.template;
    if (this.shadowRoot == null && template != null) {
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = template;
    }
  }

  addProperty(property: AttributeProp<unknown>): void {
    this.#propertyByName.set(property.name, property);
  }

  removeProperty(property: AttributeProp<unknown>): void {
    this.#propertyByName.delete(property.name);
  }

  shouldPropertyChange(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _name: string | symbol,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _oldValue: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _newValue: unknown,
  ): boolean {
    return true;
  }

  propertyChanged(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _name: string | symbol,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _oldValue: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _newValue: unknown,
  ): void {
    return;
  }

  /**
   * Returns the template for the shadow root this element. Can be set to `null`
   * to indicate that the element has no shadow root.
   */
  protected get template(): string | null {
    return null;
  }

  /**
   * Returns the the shadow root slot with the given name; or the default slot
   * if the name is undefined.
   *
   * @param name the name of the slot
   */
  protected getShadowRootSlot(name?: string): HTMLSlotElement | null {
    if (this.shadowRoot == null) return null;
    const selector = name == null ? 'slot:not([name])' : `slot[name="${name}"]`;
    return this.shadowRoot.querySelector<HTMLSlotElement>(selector);
  }

  /**
   * Subscribe a listener to a type of event in a event target bound to this
   * element. This will create an map of the original function to the bound
   * function to handle unsubscribing.
   *
   * @param target the event target
   * @param type the name of the event
   * @param listener the event listener
   * @param options the event listener options
   */
  protected subscribe<T extends ShadowRoot, K extends keyof ShadowRootEventMap>(
    target: T,
    type: string,
    listener: (this: this, evt: ShadowRootEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  protected subscribe<T extends Element, K extends keyof ElementEventMap>(
    target: T,
    type: K,
    listener: (this: this, evt: ElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  protected subscribe<
    T extends HTMLElement,
    K extends keyof HTMLElementEventMap,
  >(
    target: T,
    type: K,
    listener: (this: this, evt: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  protected subscribe<K extends keyof AnimationEventMap>(
    target: Animation,
    type: K,
    listener: (this: Animation, ev: AnimationEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  protected subscribe(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ): void {
    const bound = this.#boundListeners.get(listener) ?? listener.bind(this);
    this.#boundListeners.set(listener, bound);
    target.addEventListener(type, bound, options);
  }

  /**
   * Unsubscribe a listener to a type of event in a event target bound to this
   * element. This will use the listener reference to get the bound listener
   * and remove it from the target.
   *
   * @param target the event target
   * @param type the name of the event
   * @param listener the event listener
   * @param options the event listener options
   */
  protected unsubscribe<
    T extends ShadowRoot,
    K extends keyof ShadowRootEventMap,
  >(
    target: T,
    type: string,
    listener: (this: this, evt: ShadowRootEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  protected unsubscribe<T extends Element, K extends keyof ElementEventMap>(
    target: T,
    type: K,
    listener: (this: this, evt: ElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  protected unsubscribe<
    T extends HTMLElement,
    K extends keyof HTMLElementEventMap,
  >(
    target: T,
    type: K,
    listener: (this: this, evt: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  protected unsubscribe<T extends EventTarget>(
    target: T,
    type: string,
    callback: EventListener,
    options?: AddEventListenerOptions | boolean,
  ): void {
    const bound = this.#boundListeners.get(callback) ?? callback;
    target.removeEventListener(type, bound, options);
  }

  // /**
  //  * This callback is called during `connectedCallback`. It should be extended
  //  * to init the properties of the `IpeElement` using attributes.
  //  */
  // protected initProperties(): void {
  //   return;
  // }

  // /**
  //  * This callback is called during `disconnectedCallback`. It should be
  //  * extended to release references for slots of the shadow root and unsubscribe
  //  * to events on them.
  //  */
  // protected releaseSlots(): void {
  //   return;
  // }

  // /**
  //  * This callback is called during `connectedCallback`. It should be extended
  //  * to subscribe listeners to events on the `IpeElement`.
  //  */
  // protected holdListeners(): void {
  //   if (this.shadowRoot != null) {
  //     this.subscribe(this.shadowRoot, 'slotchange', this.handleSlotchange);
  //   }
  // }

  // /**
  //  * This callback is called during `disconnectedCallback`.It should be extended
  //  * to unsubscribe listeners to events on the `IpeElement`.
  //  */
  // protected releaseListeners(): void {
  //   if (this.shadowRoot != null) {
  //     this.unsubscribe(this.shadowRoot, 'slotchange', this.handleSlotchange);
  //   }
  // }

  /**
   * Called when the element is connected to the DOM tree.
   */
  connectedCallback(): void {
    for (const property of this.#propertyByName.values()) {
      property.attributeInit();
    }
    this.assignSlots();
    if (this.shadowRoot != null) {
      this.subscribe(this.shadowRoot, 'slotchange', this.assignSlots);
    }
  }

  /**
   * Called when the element is disconnected to the DOM tree.
   */
  disconnectedCallback(): void {
    if (this.shadowRoot != null) {
      this.unsubscribe(this.shadowRoot, 'slotchange', this.assignSlots);
    }
  }

  /**
   * Called when the element is adopted on a new DOM tree.
   */
  adoptedCallback(): void {
    this.assignSlots();
    return;
  }

  /**
   * Called when an observed attribute change its value.
   *
   * @param name the name of the attribute
   * @param oldValue the previous value of the attribute
   * @param newValue the current value of the attribute
   */
  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    const property = this.#propertyByName.get(name);
    if (property == null) return;
    property.attributeChanged(oldValue, newValue);
  }

  /**
   * This callback is called during `connectedCallback`, `adoptedCallback`
   * or during an `slotchange` event. It should be extended to hold references
   * for slots of the shadow root and subscribe to events on them.
   */
  assignSlots(): void {
    return;
  }

  static supportsDeclarativeShadowDOM(): boolean {
    return Object.prototype.hasOwnProperty.call(
      HTMLTemplateElement.prototype,
      'shadowRootMode',
    );
  }

  /**
   * The names of all observed attributes. The `attributeChangedCallback`
   * callback when whenever an attribute whose name returned here is added,
   * modified, removed, or replaced.
   */
  static get observedAttributes(): Array<string> {
    return [];
  }
}
