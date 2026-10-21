export type Cleanup = () => void;
export type Disposable = Cleanup | { dispose(): void } | { kill(): void } | null | undefined | void;

/**
 * A lifecycle container. Everything an effect creates — listeners, observers, timelines,
 * GPU resources, child scopes — is registered here and torn down together, in reverse order.
 *
 * Framework adapters map a scope to their own lifecycle: React `useEffect` cleanup,
 * Vue `onScopeDispose`, Svelte `$effect` teardown, a custom element's `disconnectedCallback`.
 */
export interface Scope {
  /** Register something to dispose. Returns it unchanged for inline use. */
  add<T extends Disposable>(item: T): T;
  /** addEventListener that is removed when the scope is disposed. */
  listen<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    handler: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen(
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void;
  /** Create a child scope disposed together with this one (or earlier, on its own). */
  child(): Scope;
  /** Dispose everything. Safe to call more than once. */
  dispose(): void;
  readonly disposed: boolean;
  /** An AbortSignal aborted on dispose — pass it to fetch, addEventListener, loaders. */
  readonly signal: AbortSignal;
}

function run(item: Disposable): void {
  if (!item) return;
  if (typeof item === 'function') item();
  else if ('dispose' in item && typeof item.dispose === 'function') item.dispose();
  else if ('kill' in item && typeof item.kill === 'function') item.kill();
}

export function createScope(): Scope {
  let items: Disposable[] = [];
  let disposed = false;
  const controller = new AbortController();

  const scope: Scope = {
    get disposed() {
      return disposed;
    },
    get signal() {
      return controller.signal;
    },
    add(item) {
      if (disposed) {
        // Late registration after teardown (e.g. a model finished loading after unmount):
        // dispose immediately so nothing leaks.
        run(item);
        return item;
      }
      items.push(item);
      return item;
    },
    listen(
      target: EventTarget,
      type: string,
      handler: (event: Event) => void,
      options?: AddEventListenerOptions,
    ) {
      if (disposed) return;
      target.addEventListener(type, handler, { ...options, signal: controller.signal });
    },
    child() {
      const c = createScope();
      if (disposed) {
        c.dispose();
        return c;
      }
      const dispose = c.dispose;
      // Detach from the parent when disposed early, so long-lived parents don't accumulate
      // dead children (e.g. media contexts toggling on resize).
      const entry = () => dispose();
      items.push(entry);
      c.dispose = () => {
        items = items.filter((i) => i !== entry);
        dispose();
      };
      return c;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      const list = items;
      items = [];
      for (let i = list.length - 1; i >= 0; i--) {
        try {
          run(list[i]);
        } catch (error) {
          // One failing cleanup must not prevent the rest from running.
          if (typeof console !== 'undefined') console.error('[snowbros] cleanup failed', error);
        }
      }
    },
  };
  return scope;
}
