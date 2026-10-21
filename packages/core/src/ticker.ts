export interface FrameInfo {
  /** Timestamp in milliseconds (same clock as `performance.now()`). */
  time: number;
  /** Seconds since the previous frame, clamped to `maxDelta`. */
  delta: number;
  /** Frame counter since the ticker was created. */
  frame: number;
}

export type TickCallback = (frame: FrameInfo) => void;

/**
 * Callback order inside a frame. Read scroll/pointer input first, then advance
 * animations, then render (canvas/WebGL) — so every consumer sees the same state.
 */
export const Priority = {
  input: -100,
  update: 0,
  render: 100,
} as const;

export interface Ticker {
  /** Register a callback. Returns an unsubscribe function. */
  add(callback: TickCallback, priority?: number): () => void;
  /** Run `callback` once on the next frame. */
  once(callback: TickCallback, priority?: number): () => void;
  /** Number of active callbacks. */
  readonly size: number;
  /** Multiplies `delta`. 0 freezes time, 0.5 is slow motion. */
  timeScale: number;
  /** Upper bound for `delta` (seconds) — avoids huge jumps after tab switches. Default 1/20. */
  maxDelta: number;
  /**
   * Drive the ticker from an external loop (Lenis, GSAP, a game loop, a test).
   * While set, the ticker stops requesting its own animation frames.
   * Call the returned function to restore the internal rAF loop.
   */
  useExternalClock(): () => void;
  /** Advance one frame manually. Used by external clocks and tests. */
  tick(time?: number): void;
  /** True while frames are being scheduled. */
  readonly running: boolean;
}

interface Entry {
  callback: TickCallback;
  priority: number;
  once: boolean;
  removed: boolean;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Create an isolated ticker. Most code should use the shared {@link ticker} so the whole page
 * runs exactly one requestAnimationFrame loop. The loop sleeps when there is nothing to do and
 * when the document is hidden.
 */
export function createTicker(): Ticker {
  let entries: Entry[] = [];
  let dirty = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let frame = 0;
  let external = false;
  const hasRaf = typeof requestAnimationFrame === 'function';

  const schedule = () => {
    if (external || rafId !== null || !hasRaf || entries.length === 0) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    rafId = requestAnimationFrame((t) => {
      rafId = null;
      api.tick(t);
    });
  };

  const cancel = () => {
    if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    rafId = null;
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        cancel();
      } else {
        lastTime = null; // do not count hidden time as a giant delta
        schedule();
      }
    });
  }

  const insert = (entry: Entry) => {
    entries.push(entry);
    dirty = true;
    schedule();
    return () => {
      if (entry.removed) return;
      entry.removed = true;
      entries = entries.filter((e) => e !== entry);
      if (entries.length === 0) cancel();
    };
  };

  const api: Ticker = {
    timeScale: 1,
    maxDelta: 1 / 20,
    get size() {
      return entries.length;
    },
    get running() {
      return rafId !== null || external;
    },
    add(callback, priority = Priority.update) {
      return insert({ callback, priority, once: false, removed: false });
    },
    once(callback, priority = Priority.update) {
      return insert({ callback, priority, once: true, removed: false });
    },
    useExternalClock() {
      external = true;
      cancel();
      return () => {
        external = false;
        lastTime = null;
        schedule();
      };
    },
    tick(time = now()) {
      if (dirty) {
        entries.sort((a, b) => a.priority - b.priority);
        dirty = false;
      }
      const raw = lastTime === null ? 0 : (time - lastTime) / 1000;
      lastTime = time;
      const info: FrameInfo = {
        time,
        delta: Math.min(Math.max(raw, 0), api.maxDelta) * api.timeScale,
        frame: frame++,
      };
      // Snapshot so callbacks may add/remove entries safely during iteration.
      const snapshot = entries.slice();
      for (const entry of snapshot) {
        if (entry.removed) continue;
        if (entry.once) {
          entry.removed = true;
          entries = entries.filter((e) => e !== entry);
        }
        entry.callback(info);
      }
      if (entries.length === 0) lastTime = null;
      schedule();
    },
  };
  return api;
}

/** The shared, page-wide ticker. One rAF loop for every SNOWBROS module. */
export const ticker: Ticker = createTicker();
