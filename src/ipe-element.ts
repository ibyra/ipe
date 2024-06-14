/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />

import { ReactiveElement } from 'lit';

/**
 * Represents a base component that all other Ipe elements can extend.
 */
export abstract class IpeElement extends ReactiveElement {
  static template: HTMLTemplateElement | null = null;

  #boundListeners: WeakMap<EventListener, EventListener>;

  constructor() {
    super();
    this.#boundListeners = new WeakMap();
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const renderRoot = super.createRenderRoot();
    if (renderRoot.children.length !== 0) return renderRoot;

    const template = (this.constructor as typeof IpeElement).template;
    if (template == null) return renderRoot;

    renderRoot.replaceChildren(template.content.cloneNode(true));
    return renderRoot;
  }

  /**
   * Returns the slot on the shadow root with the given name, or the default
   * slot if no name is given. Returns null if no slot is found.
   *
   * @param name - the name of the slot
   */
  getSlot(name?: string): HTMLSlotElement | null {
    const attr = name != null ? `[name="${name}"]` : ':not([name])';
    const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot${attr}`);
    return slot;
  }

  /**
   * Returns the assigned elements from a slot on the shadow root with the given
   * name, or the default slot if no name is given.
   *
   * @param name - the name of the slot
   */
  protected getAssignedElements(name?: string): Array<Element> {
    if (!this.isConnected) return [];

    const slot = this.getSlot(name);
    if (slot == null) return [];

    const elements = slot.assignedElements();
    return elements;
  }

  /**
   * Returns the assigned elements from a slot on the shadow root with the given
   * name, or the default slot if no name is given. This method guarantees that
   * all elements returned are defined and upgraded.
   *
   * @param name - the name of the slot
   */
  protected async getDefinedAssignedElements(
    name?: string,
  ): Promise<Array<Element>> {
    const elements = this.getAssignedElements(name);
    const notDefined = elements.filter((e) => e.matches(':not(:defined)'));
    if (notDefined.length === 0) return elements;

    const customElements = this.ownerDocument.defaultView!.customElements;
    const tags = new Set(notDefined.map((element) => element.localName));
    const promises = Array.from(tags, (t) => customElements.whenDefined(t));
    await Promise.all(promises);
    for (const element of notDefined) {
      customElements.upgrade(element);
    }
    return elements;
  }

  /**
   * Subscribe a listener to a type of event in a event target that is always
   * bound to this element.
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
    listener: (this: this, ev: AnimationEventMap[K]) => void,
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
}
