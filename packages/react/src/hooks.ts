import {
  type Cleanup,
  createScope,
  motionPreference,
  type ProgressSource,
  type ReadonlySignal,
  type Scope,
} from '@snowbros/core';
import {
  type FlipOptions,
  flip,
  type InViewOptions,
  inView,
  type Pin,
  type PinOptions,
  pin,
  type ScrollProgressOptions,
  type ScrubOptions,
  scrollProgress,
  scrub,
  type Timeline,
  timeline,
} from '@snowbros/motion';
import {
  type DependencyList,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/** useLayoutEffect on the client, useEffect on the server (no SSR warning). */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Run imperative motion setup with guaranteed cleanup. Everything registered on the scope is
 * disposed on unmount or when deps change — including under React StrictMode double-invocation.
 *
 * ```tsx
 * useSnowbros((scope) => {
 *   scope.add(revealText(titleRef.current!));
 * }, []);
 * ```
 */
export function useSnowbros(
  // biome-ignore lint/suspicious/noConfusingVoidType: setup may return nothing or a cleanup
  setup: (scope: Scope) => void | Cleanup,
  deps: DependencyList = [],
): void {
  const setupRef = useRef(setup);
  setupRef.current = setup;
  useIsomorphicLayoutEffect(() => {
    const scope = createScope();
    const result = setupRef.current(scope);
    if (typeof result === 'function') scope.add(result);
    return () => scope.dispose();
  }, deps);
}

/** Subscribe to a SNOWBROS signal as React state. Avoid for per-frame values (use refs). */
export function useSignal<T>(signal: ReadonlySignal<T>, serverValue?: T): T {
  return useSyncExternalStore(
    (cb) => signal.subscribe(cb),
    () => signal.get(),
    () => (serverValue === undefined ? signal.get() : serverValue),
  );
}

/** `true` when the user prefers reduced motion (OS setting or in-app override). SSR: false. */
export function useReducedMotion(): boolean {
  return useSignal(motionPreference, 'full') === 'reduced';
}

/**
 * A stable scroll progress source for an element. Returns a source, not a number, on purpose:
 * subscribing writes styles directly instead of re-rendering React 60 times a second.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  options: ScrollProgressOptions = {},
): ProgressSource {
  const holder = useMemo(() => createForwardingSource(), []);
  const key = JSON.stringify({ s: options.start, e: options.end, a: options.axis });
  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    const p = scrollProgress(ref.current, options);
    holder.connect(p);
    return () => {
      holder.connect(null);
      p.dispose();
    };
  }, [ref, key, holder]);
  return holder;
}

/** Pin a section with CSS sticky. Returns a stable progress source (0 → 1 while pinned). */
export function usePin(
  ref: RefObject<HTMLElement | null>,
  options: PinOptions = {},
): ProgressSource {
  const holder = useMemo(() => createForwardingSource(), []);
  const key = JSON.stringify({ d: options.distance, t: options.top });
  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    const p: Pin = pin(ref.current, options);
    holder.connect(p.progress);
    return () => {
      holder.connect(null);
      p.dispose();
    };
  }, [ref, key, holder]);
  return holder;
}

/**
 * Build a timeline once per deps change and kill it on cleanup. If `source` is given, the
 * timeline is scrubbed by it (scroll-linked); otherwise it is returned paused for you to play.
 */
export function useTimeline(
  build: (tl: Timeline) => void,
  deps: DependencyList,
  source?: ProgressSource,
  scrubOptions?: ScrubOptions,
): RefObject<Timeline | null> {
  const tlRef = useRef<Timeline | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  useIsomorphicLayoutEffect(() => {
    const tl = timeline();
    buildRef.current(tl);
    tlRef.current = tl;
    const handle = source ? scrub(tl, source, scrubOptions) : null;
    return () => {
      handle?.dispose();
      tl.kill();
      tlRef.current = null;
    };
  }, [...deps, source]);
  return tlRef;
}

/** Boolean in-view state (changes rarely, safe as React state). */
export function useInView(ref: RefObject<Element | null>, options: InViewOptions = {}): boolean {
  const [visible, setVisible] = useState(false);
  const key = JSON.stringify(options);
  // biome-ignore lint/correctness/useExhaustiveDependencies: options serialised into key
  useEffect(() => {
    if (!ref.current) return;
    const handle = inView(
      ref.current,
      () => {
        setVisible(true);
        return () => setVisible(false);
      },
      options,
    );
    return () => handle.dispose();
  }, [ref, key]);
  return visible;
}

/**
 * FLIP helper for React state changes. Call with the container whose children move, and a
 * function performing the state update; it waits for React to commit before animating.
 */
export function useFlip(options: FlipOptions = {}) {
  const pending = useRef<null | { resolve: () => void }>(null);
  const [tick, setTick] = useState(0);
  useIsomorphicLayoutEffect(() => {
    pending.current?.resolve();
    pending.current = null;
  }, [tick]);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  return useCallback((container: Element | null, update: () => void) => {
    if (!container) {
      update();
      return Promise.resolve();
    }
    return flip(
      Array.from(container.children),
      () =>
        new Promise<void>((resolve) => {
          pending.current = { resolve };
          update();
          setTick((t) => t + 1);
        }),
      optionsRef.current,
    );
  }, []);
}

interface ForwardingSource extends ProgressSource {
  connect(source: ProgressSource | null): void;
}

/** A stable source object whose upstream can be swapped as effects re-run. */
function createForwardingSource(): ForwardingSource {
  let upstream: ProgressSource | null = null;
  let off: (() => void) | null = null;
  const listeners = new Set<(p: number) => void>();
  const emit = (p: number) => {
    for (const l of [...listeners]) l(p);
  };
  return {
    get: () => upstream?.get() ?? 0,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    connect(source) {
      off?.();
      off = null;
      upstream = source;
      if (source) {
        off = source.subscribe(emit);
        emit(source.get());
      }
    },
  };
}
