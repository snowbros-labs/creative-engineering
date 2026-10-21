export type Listener<T> = (value: T, previous: T) => void;

/**
 * Minimal observable value. Used to share progress, motion preference and capability state
 * between modules and framework adapters without coupling them to a framework's reactivity.
 * Compatible with React's `useSyncExternalStore` (`subscribe` + `get`).
 */
export interface Signal<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: Listener<T>): () => void;
}

export interface ReadonlySignal<T> {
  get(): T;
  subscribe(listener: Listener<T>): () => void;
}

export function createSignal<T>(
  initial: T,
  equals: (a: T, b: T) => boolean = Object.is,
): Signal<T> {
  let value = initial;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => value,
    set(next) {
      if (equals(value, next)) return;
      const prev = value;
      value = next;
      for (const l of [...listeners]) l(next, prev);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Derive a read-only signal from another. Recomputes on change only. */
export function derive<A, B>(source: ReadonlySignal<A>, map: (value: A) => B): ReadonlySignal<B> {
  const out = createSignal(map(source.get()));
  let subscribers = 0;
  let unsub: (() => void) | null = null;
  return {
    get: () => (unsub ? out.get() : map(source.get())),
    subscribe(listener) {
      if (subscribers++ === 0) {
        out.set(map(source.get()));
        unsub = source.subscribe((v) => out.set(map(v)));
      }
      const off = out.subscribe(listener);
      return () => {
        off();
        if (--subscribers === 0 && unsub) {
          unsub();
          unsub = null;
        }
      };
    },
  };
}
