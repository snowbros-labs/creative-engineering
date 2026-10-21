import {
  clamp,
  createScope,
  createSignal,
  damp,
  isBrowser,
  type PatternHandle,
  Priority,
  type ProgressSource,
  type ReadonlySignal,
  type Seekable,
  ticker,
} from '@snowbros/core';

/**
 * Scroll choreography without scroll-jacking.
 *
 * Model (the same one verified on production award sites such as cvnt.in): native scrolling,
 * one passive scroll listener per scroll container, layout measured only on resize, and per
 * frame nothing but arithmetic → a 0..1 progress → transforms. No layout reads in the hot path.
 */

type Container = Window | HTMLElement;

interface Measured {
  /** Scroll offset at which progress is 0. */
  start: number;
  /** Scroll offset at which progress is 1. */
  end: number;
}

interface Watcher {
  measure(): void;
  /** Read the container's scroll position on this watcher's axis and update progress. */
  update(): void;
}

interface ContainerState {
  watchers: Set<Watcher>;
  dirty: boolean;
  dispose(): void;
}

const containers = new Map<Container, ContainerState>();

const readScroll = (c: Container, axis: 'y' | 'x') =>
  c === window
    ? axis === 'y'
      ? window.scrollY
      : window.scrollX
    : axis === 'y'
      ? (c as HTMLElement).scrollTop
      : (c as HTMLElement).scrollLeft;

const viewportSize = (c: Container, axis: 'y' | 'x') =>
  c === window
    ? axis === 'y'
      ? window.innerHeight
      : window.innerWidth
    : axis === 'y'
      ? (c as HTMLElement).clientHeight
      : (c as HTMLElement).clientWidth;

function getContainer(c: Container): ContainerState {
  const existing = containers.get(c);
  if (existing) return existing;
  const scope = createScope();
  const state: ContainerState = {
    watchers: new Set(),
    dirty: false,
    dispose: () => scope.dispose(),
  };
  const flush = () => {
    if (!state.dirty) return;
    state.dirty = false;
    for (const w of state.watchers) w.update();
  };
  const onScroll = () => {
    if (state.dirty) return;
    state.dirty = true;
    ticker.once(flush, Priority.input);
  };
  const remeasure = () => {
    for (const w of state.watchers) w.measure();
    state.dirty = true;
    ticker.once(flush, Priority.input);
  };
  scope.listen(c as EventTarget, 'scroll', onScroll, { passive: true });
  scope.listen(window, 'resize', remeasure);
  if (typeof ResizeObserver !== 'undefined') {
    // Content height changes (images loading, accordions) shift every trigger.
    const ro = new ResizeObserver(remeasure);
    ro.observe(c === window ? document.documentElement : (c as HTMLElement));
    scope.add(() => ro.disconnect());
  }
  // Fonts swapping in changes line heights.
  (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(() => {
    if (!scope.disposed) remeasure();
  });
  containers.set(c, state);
  return state;
}

function releaseContainer(c: Container) {
  const state = containers.get(c);
  if (state && state.watchers.size === 0) {
    state.dispose();
    containers.delete(c);
  }
}

/** Offset of an element from the top/left of its scroll container, ignoring transforms. */
function offsetWithin(el: HTMLElement, container: Container, axis: 'y' | 'x'): number {
  let offset = 0;
  let node: HTMLElement | null = el;
  const stop = container === window ? null : (container as HTMLElement);
  while (node && node !== stop) {
    offset += axis === 'y' ? node.offsetTop : node.offsetLeft;
    const parent = node.offsetParent as HTMLElement | null;
    if (stop && parent && !stop.contains(parent)) {
      // Container is not an offsetParent: subtract its own offset.
      offset -= axis === 'y' ? stop.offsetTop : stop.offsetLeft;
      break;
    }
    node = parent;
  }
  return offset;
}

const EDGE: Record<string, number> = { top: 0, left: 0, center: 0.5, bottom: 1, right: 1 };

/** Parse `"top"`, `"center"`, `"80%"`, `"120px"`, `"top+=100"` into a pixel offset within `size`. */
function parseEdge(token: string, size: number): number {
  const m = /^([a-z]+|-?[\d.]+%|-?[\d.]+(?:px)?)?(?:([+-])=(-?[\d.]+)(px|%)?)?$/.exec(token.trim());
  if (!m) throw new Error(`[snowbros] invalid scroll edge "${token}"`);
  const [, base = 'top', sign, amount, unit] = m;
  let px: number;
  if (base in EDGE) px = EDGE[base]! * size;
  else if (base.endsWith('%')) px = (Number.parseFloat(base) / 100) * size;
  else px = Number.parseFloat(base);
  if (sign && amount) {
    const a = unit === '%' ? (Number(amount) / 100) * size : Number(amount);
    px += sign === '-' ? -a : a;
  }
  return px;
}

export interface ScrollProgressOptions {
  /**
   * When progress is 0: `"<element edge> <viewport edge>"`. Default `"top bottom"`
   * (element's top meets viewport bottom — it starts entering).
   */
  start?: string;
  /** When progress is 1. Default `"bottom top"` (element fully left the viewport). */
  end?: string;
  axis?: 'y' | 'x';
  /** Scroll container. Default `window`. */
  container?: HTMLElement;
}

export interface ScrollProgress extends ProgressSource, PatternHandle {
  /** Re-measure layout (call after DOM changes the observers can't see). */
  refresh(): void;
  /** Measured scroll offsets for start/end, for debugging and markers. */
  readonly range: Readonly<Measured>;
}

/**
 * Progress (0..1) of an element moving through the viewport.
 *
 * ```ts
 * const p = scrollProgress(section, { start: 'top top', end: 'bottom bottom' });
 * p.subscribe((v) => (bar.style.transform = `scaleX(${v})`));
 * ```
 */
export function scrollProgress(target: HTMLElement, options: ScrollProgressOptions = {}): ScrollProgress {
  const axis = options.axis ?? 'y';
  const container: Container = options.container ?? (isBrowser ? window : (null as never));
  const signal = createSignal(0);
  const range: Measured = { start: 0, end: 1 };
  const [elStart = 'top', vpStart = 'bottom'] = (options.start ?? 'top bottom').split(/\s+/);
  const [elEnd = 'bottom', vpEnd = 'top'] = (options.end ?? 'bottom top').split(/\s+/);

  if (!isBrowser) {
    return { ...signal, refresh() {}, dispose() {}, range };
  }

  const state = getContainer(container);
  const watcher: Watcher = {
    measure() {
      const size = axis === 'y' ? target.offsetHeight : target.offsetWidth;
      const offset = offsetWithin(target, container, axis);
      const vp = viewportSize(container, axis);
      range.start = offset + parseEdge(elStart, size) - parseEdge(vpStart, vp);
      range.end = offset + parseEdge(elEnd, size) - parseEdge(vpEnd, vp);
    },
    update() {
      const scroll = readScroll(container, axis);
      const span = range.end - range.start;
      signal.set(span <= 0 ? (scroll >= range.end ? 1 : 0) : clamp((scroll - range.start) / span));
    },
  };
  watcher.measure();
  watcher.update();
  state.watchers.add(watcher);

  let disposed = false;
  return {
    get: signal.get,
    subscribe: signal.subscribe,
    range,
    refresh() {
      watcher.measure();
      watcher.update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      state.watchers.delete(watcher);
      releaseContainer(container);
    },
  };
}

export interface ScrubOptions {
  /**
   * Smoothing: `false`/`0` follows scroll exactly; a number is a damping rate (per second,
   * ~6 soft … 20 tight). Smoothing adds perceived weight without hijacking native scroll.
   */
  smooth?: number | false;
  /** Map progress before seeking (e.g. `(p) => segment(p, 0.2, 0.8)`). */
  map?: (progress: number) => number;
}

/**
 * Drive anything seekable (a Timeline, a camera rig, a shader uniform wrapper) from a
 * progress source. Pauses timelines so time and scroll never fight over the playhead.
 */
export function scrub(target: Seekable & { pause?: () => unknown }, source: ProgressSource, options: ScrubOptions = {}): PatternHandle {
  target.pause?.();
  const scope = createScope();
  const map = options.map ?? ((p: number) => p);
  const rate = options.smooth || 0;
  let current = map(source.get());
  target.seek(current);

  if (rate <= 0) {
    scope.add(source.subscribe((p) => target.seek(map(p))));
    return scope;
  }

  let stopLoop: (() => void) | null = null;
  const loop = (frame: { delta: number }) => {
    const goal = map(source.get());
    current = damp(current, goal, rate, frame.delta);
    if (Math.abs(goal - current) < 0.0001) {
      current = goal;
      stopLoop?.();
      stopLoop = null;
    }
    target.seek(current);
  };
  scope.add(
    source.subscribe(() => {
      if (!stopLoop) stopLoop = ticker.add(loop, Priority.update);
    }),
  );
  scope.add(() => stopLoop?.());
  return scope;
}

/**
 * Scroll velocity in pixels/second, smoothed. Useful for skew, motion blur or marquee speed.
 * The ticker only runs while scrolling and while the value decays back to 0.
 */
export function scrollVelocity(options: { container?: HTMLElement; decay?: number } = {}): ReadonlySignal<number> & PatternHandle {
  const signal = createSignal(0);
  if (!isBrowser) return { ...signal, dispose() {} };
  const container: Container = options.container ?? window;
  const decay = options.decay ?? 8;
  let last = readScroll(container, 'y');
  let raw = 0;
  let stop: (() => void) | null = null;
  const scope = createScope();
  const loop = (frame: { delta: number }) => {
    const pos = readScroll(container, 'y');
    if (frame.delta > 0) raw = (pos - last) / frame.delta;
    last = pos;
    const v = damp(signal.get(), raw, decay, frame.delta || 1 / 60);
    raw = damp(raw, 0, decay, frame.delta || 1 / 60);
    signal.set(Math.abs(v) < 0.5 ? 0 : v);
    if (signal.get() === 0 && raw === 0) {
      stop?.();
      stop = null;
    }
  };
  scope.listen(container as EventTarget, 'scroll', () => {
    if (!stop) {
      last = readScroll(container, 'y');
      stop = ticker.add(loop, Priority.input);
    }
  }, { passive: true });
  scope.add(() => stop?.());
  return { get: signal.get, subscribe: signal.subscribe, dispose: () => scope.dispose() };
}

export interface PinOptions {
  /**
   * Extra scroll distance while pinned: a number of pixels or a CSS length (`"200vh"`,
   * `"150svh"`, `"3000px"`). Default `"100vh"`.
   */
  distance?: number | string;
  /** Sticky offset from the top (e.g. header height). Default 0. */
  top?: number | string;
  /** Element to stick. Default: the first element child of `section`. */
  sticky?: HTMLElement;
}

export interface Pin extends PatternHandle {
  /** 0 when pinning starts, 1 when it ends. */
  progress: ScrollProgress;
  readonly section: HTMLElement;
  readonly sticky: HTMLElement;
}

const cssLength = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

function warnOverflowAncestors(el: HTMLElement) {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const o = getComputedStyle(node);
    if (/(hidden|scroll|auto)/.test(`${o.overflow}${o.overflowX}${o.overflowY}`)) {
      console.warn(
        '[snowbros] pin(): an ancestor has overflow other than visible/clip, which breaks position: sticky. Use `overflow: clip` instead.',
        node,
      );
      return;
    }
    node = node.parentElement;
  }
}

/**
 * Pin a section while the user scrolls a set distance — using `position: sticky`.
 *
 * No DOM re-parenting, no spacer injection, no scroll hijacking: the section grows by
 * `distance`, its first child sticks. Works with SSR, native scroll, find-in-page, anchors and
 * keyboard scrolling. Returns a progress source to drive timelines.
 *
 * ```html
 * <section id="story"><div class="stage">…</div></section>
 * ```
 */
export function pin(section: HTMLElement, options: PinOptions = {}): Pin {
  const sticky = options.sticky ?? (section.firstElementChild as HTMLElement | null);
  if (!sticky) throw new Error('[snowbros] pin() needs a child element to stick');
  const distance = cssLength(options.distance ?? '100vh');
  const top = cssLength(options.top ?? 0);
  const prev = {
    sectionHeight: section.style.height,
    sectionPosition: section.style.position,
    stickyPosition: sticky.style.position,
    stickyTop: sticky.style.top,
    stickyHeight: sticky.style.height,
  };
  // svh keeps the pinned stage stable while mobile browser chrome shows/hides.
  section.style.position = section.style.position || 'relative';
  section.style.height = `calc(100svh - ${top} + ${distance})`;
  sticky.style.position = 'sticky';
  sticky.style.top = top;
  sticky.style.height = `calc(100svh - ${top})`;
  if (isBrowser) warnOverflowAncestors(section);

  const progress = scrollProgress(section, {
    start: `top top+=${Number.parseFloat(String(options.top ?? 0)) || 0}`,
    end: 'bottom bottom',
  });
  return {
    section,
    sticky,
    progress,
    dispose() {
      progress.dispose();
      section.style.height = prev.sectionHeight;
      section.style.position = prev.sectionPosition;
      sticky.style.position = prev.stickyPosition;
      sticky.style.top = prev.stickyTop;
      sticky.style.height = prev.stickyHeight;
    },
  };
}

export interface HorizontalOptions extends Omit<PinOptions, 'distance'> {
  /** Smoothing rate passed to scrub. Default false. */
  smooth?: number | false;
}

/**
 * Vertical scroll drives a horizontal track. The pinned distance equals the track's overflow,
 * so the scroll speed feels 1:1. Keyboard/AT users still reach every item: the track stays in
 * normal DOM order and focus scrolls the page to it.
 */
export function horizontalScroll(section: HTMLElement, track: HTMLElement, options: HorizontalOptions = {}): Pin {
  const overflow = () => Math.max(0, track.scrollWidth - (section.clientWidth || window.innerWidth));
  const p = pin(section, { ...options, distance: overflow() });
  let distance = overflow();
  const scope = createScope();
  const apply = (v: number) => {
    track.style.transform = `translate3d(${-v * distance}px, 0, 0)`;
  };
  scope.add(
    scrub({ duration: 0, seek: apply }, p.progress, { smooth: options.smooth ?? false }),
  );
  const resize = () => {
    distance = overflow();
    section.style.height = `calc(100svh - ${cssLength(options.top ?? 0)} + ${distance}px)`;
    p.progress.refresh();
    apply(p.progress.get());
  };
  scope.listen(window, 'resize', resize);
  // Move focused items into view: translate the page so the focused card is visible.
  scope.listen(track, 'focusin', (e) => {
    const item = e.target as HTMLElement;
    if (distance <= 0) return;
    const ratio = clamp(item.offsetLeft / (track.scrollWidth - item.offsetWidth || 1));
    const { start, end } = p.progress.range;
    window.scrollTo({ top: start + ratio * (end - start) });
  });
  return {
    ...p,
    dispose() {
      scope.dispose();
      track.style.transform = '';
      p.dispose();
    },
  };
}
