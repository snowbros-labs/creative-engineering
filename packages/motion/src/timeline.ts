import {
  type Ease,
  type EaseFn,
  type Playable,
  type PlaybackState,
  prefersReducedMotion,
  type ReducedMotionPolicy,
  resolveEase,
  type TimingOptions,
  ticker,
} from '@snowbros/core';
import { accessor, isTransformKey, resolveTargets, type TargetInput } from './targets.js';
import { type Interpolator, interpolate, parseUnit } from './values.js';

/** A value, a `[from, to]` pair, or a per-target function returning either. */
export type PropValue =
  | string
  | number
  | readonly [string | number, string | number]
  | ((
      index: number,
      target: object,
    ) => string | number | readonly [string | number, string | number]);

export type Props = Record<string, PropValue>;

export interface TweenOptions extends TimingOptions {
  /** Render `from` values immediately when explicit `[from, to]` pairs are given. Default true. */
  immediateRender?: boolean;
  /** Reduced-motion behaviour. Default `skip` (jump to end state). */
  reducedMotion?: ReducedMotionPolicy;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
  /** Start playing automatically. Default true for `animate()`, false inside timelines. */
  autoplay?: boolean;
}

/** Internal: anything a timeline can schedule. Times are local seconds. */
interface Child {
  readonly duration: number;
  render(time: number, forceSync?: boolean): void;
}

const FADE_DURATION = 0.2;
const FADE_PROPS = new Set(['opacity']);

class PropTrack {
  private interp: Interpolator | null = null;
  constructor(
    private readonly set: (v: string | number) => void,
    private readonly get: () => string | number,
    private readonly from: string | number | undefined,
    private readonly to: string | number,
    private readonly unit: string,
  ) {
    if (from !== undefined) this.interp = this.build(from);
  }

  private build(from: string | number): Interpolator {
    let a = from;
    let b = this.to;
    // Bare numbers on unit-bearing props (x: 100) get the default unit when the other side has one.
    if (this.unit) {
      const [, ua] = parseUnit(a);
      const [, ub] = parseUnit(b);
      if (typeof a === 'number' && ub) a = `${a}${ub}`;
      if (typeof b === 'number' && ua) b = `${b}${ua}`;
    }
    return interpolate(a, b);
  }

  /** Lazily capture the starting value the first time the track renders. */
  ensure(): void {
    if (!this.interp) this.interp = this.build(this.get());
  }

  /** Forget a lazily captured start so the next play re-reads it. */
  reset(): void {
    if (this.from === undefined) this.interp = null;
  }

  render(t: number): void {
    this.ensure();
    this.set(this.interp!(t));
  }
}

/** Leaf: animates the props of a single target. */
class Tween implements Child {
  private tracks: PropTrack[] = [];
  private last = -1;
  constructor(
    target: object,
    index: number,
    props: Props,
    readonly duration: number,
    private readonly ease: EaseFn,
    immediateRender: boolean,
  ) {
    let hasExplicitFrom = false;
    for (const [key, raw] of Object.entries(props)) {
      const resolved = typeof raw === 'function' ? raw(index, target) : raw;
      const acc = accessor(target, key);
      const pair = Array.isArray(resolved)
        ? (resolved as readonly [string | number, string | number])
        : null;
      if (pair) hasExplicitFrom = true;
      this.tracks.push(
        new PropTrack(
          acc.set,
          acc.get,
          pair ? pair[0] : undefined,
          pair ? pair[1] : (resolved as string | number),
          acc.unit || (isTransformKey(key) ? 'px' : ''),
        ),
      );
    }
    if (hasExplicitFrom && immediateRender) this.render(0, true);
  }

  render(time: number, force = false): void {
    if (!force && time === this.last) return;
    // Never-started children stay untouched (so later tweens on the same prop don't clobber
    // earlier ones) — except when rewinding a child that has played.
    if (!force && time <= 0 && this.last <= 0) {
      this.last = time;
      return;
    }
    if (time > 0 && this.last <= 0) for (const t of this.tracks) t.ensure();
    this.last = time;
    const p =
      this.duration === 0 ? (time > 0 ? 1 : 0) : Math.min(1, Math.max(0, time / this.duration));
    const e = this.ease(p);
    for (const t of this.tracks) t.render(e);
  }

  resetStart(): void {
    for (const t of this.tracks) t.reset();
    this.last = -1;
  }
}

class Callback implements Child {
  readonly duration = 0;
  private last = -1;
  constructor(private readonly fn: () => void) {}
  render(time: number): void {
    // Fire when the playhead crosses its position moving forward.
    if (time >= 0 && this.last < 0) this.fn();
    this.last = time;
  }
}

/**
 * Position grammar for `Timeline.add`:
 * - number: absolute seconds
 * - `'>'` (default): end of the previous child; `'<'`: start of the previous child
 * - `'+=0.2'` / `'-=0.2'`: relative to the end of the timeline
 * - `'<+=0.1'` / `'>-=0.1'`: relative to previous child start/end
 * - `'label'` or `'label+=0.3'`
 */
export type Position = number | string;

interface Slot {
  child: Child;
  start: number;
}

export interface TimelineOptions extends Omit<TweenOptions, 'immediateRender'> {
  /** Default options merged into every `.to()` call. */
  defaults?: Omit<TweenOptions, 'autoplay' | 'onUpdate' | 'onComplete'>;
}

/**
 * Timeline: schedules tweens, callbacks and nested timelines on one clock.
 * A timeline is itself `Playable` and `Seekable`, so it can be played by time,
 * scrubbed by scroll progress, or nested inside another timeline.
 */
export class Timeline implements Playable, Child {
  private slots: Slot[] = [];
  private labels = new Map<string, number>();
  private time = 0; // local time within one iteration span (0..totalDuration)
  private direction: 1 | -1 = 1;
  private unsubscribe: (() => void) | null = null;
  private _state: PlaybackState = 'idle';
  private resolveFinished: (() => void) | null = null;
  private _finished!: Promise<void>;
  private readonly ease: EaseFn;
  private readonly repeat: number;
  private readonly yoyo: boolean;
  private readonly delay: number;
  private elapsedDelay = 0;
  timeScale = 1;

  constructor(private readonly options: TimelineOptions = {}) {
    this.ease = resolveEase(options.ease, (t) => t);
    this.repeat = options.repeat ?? 0;
    this.yoyo = options.yoyo ?? false;
    this.delay = options.delay ?? 0;
    this.resetFinished();
  }

  private resetFinished() {
    this._finished = new Promise((r) => {
      this.resolveFinished = r;
    });
  }

  /** Duration of one iteration in seconds. */
  get iterationDuration(): number {
    let end = 0;
    for (const s of this.slots) end = Math.max(end, s.start + s.child.duration);
    return end;
  }

  /** Total duration including repeats (Infinity when repeating forever). */
  get duration(): number {
    return this.iterationDuration * (this.repeat + 1);
  }

  get state(): PlaybackState {
    return this._state;
  }

  get progress(): number {
    const d = this.duration;
    if (!Number.isFinite(d)) return 0;
    return d === 0 ? (this.time > 0 ? 1 : 0) : this.time / d;
  }

  get finished(): Promise<void> {
    return this._finished;
  }

  private resolvePosition(position: Position | undefined): number {
    const prev = this.slots[this.slots.length - 1];
    const end = this.iterationDuration;
    if (position === undefined || position === '>')
      return prev ? prev.start + prev.child.duration : 0;
    if (typeof position === 'number') return Math.max(0, position);
    const m = /^([<>]|[A-Za-z_][\w-]*)?\s*(?:([+-])=\s*(-?[\d.]+))?$/.exec(position.trim());
    if (!m) throw new Error(`[snowbros] invalid timeline position "${position}"`);
    const [, anchor, sign, amount] = m;
    let base = end;
    if (anchor === '<') base = prev ? prev.start : 0;
    else if (anchor === '>') base = prev ? prev.start + prev.child.duration : 0;
    else if (anchor) {
      const label = this.labels.get(anchor);
      if (label === undefined) throw new Error(`[snowbros] unknown timeline label "${anchor}"`);
      base = label;
    }
    const offset = amount ? Number(amount) * (sign === '-' ? -1 : 1) : 0;
    return Math.max(0, base + offset);
  }

  /** Add a tween group, timeline or callback at a position. */
  add(child: Timeline | (() => void), position?: Position): this {
    const start = this.resolvePosition(position);
    const c: Child = typeof child === 'function' ? new Callback(child) : child;
    if (child instanceof Timeline) child.detach();
    this.slots.push({ child: c, start });
    return this;
  }

  /** Mark a named position. */
  label(name: string, position?: Position): this {
    this.labels.set(
      name,
      position === undefined ? this.iterationDuration : this.resolvePosition(position),
    );
    return this;
  }

  /** Animate `targets` to `props`. Values may be `[from, to]` pairs or per-target functions. */
  to(targets: TargetInput, props: Props, options: TweenOptions = {}, position?: Position): this {
    const merged = { ...this.options.defaults, ...options, autoplay: false };
    return this.add(createTweenGroup(targets, props, merged), position);
  }

  /** Call `fn` when the playhead passes `position`. */
  call(fn: () => void, position?: Position): this {
    return this.add(fn, position);
  }

  /** Render the state at local time `t` (seconds, including repeats). */
  render(t: number, force = false): void {
    const iter = this.iterationDuration;
    let local = t;
    if (iter > 0 && this.repeat !== 0) {
      const total = this.duration;
      const clamped = Math.min(Math.max(t, 0), total);
      let cycle = Math.floor(clamped / iter);
      if (clamped === total && clamped > 0) cycle -= 1;
      local = clamped - cycle * iter;
      if (this.yoyo && cycle % 2 === 1) local = iter - local;
    }
    local = Math.min(Math.max(local, 0), iter);
    const eased = iter > 0 ? this.ease(local / iter) * iter : local;
    // Forward: render in start order so later children win; backward: reverse order.
    const forward = eased >= this.lastRendered;
    this.lastRendered = eased;
    const list = forward ? this.slots : [...this.slots].reverse();
    for (const { child, start } of list) {
      const childTime = eased - start;
      if (child instanceof Callback) child.render(childTime);
      else child.render(Math.min(Math.max(childTime, 0), child.duration), force);
    }
    if (this.options.onUpdate) {
      const d = this.duration;
      this.options.onUpdate(d > 0 && Number.isFinite(d) ? Math.min(Math.max(t / d, 0), 1) : 1);
    }
  }
  private lastRendered = 0;

  /** Seek to normalised progress (0..1) and render immediately. Pauses time playback. */
  seek(progress: number): void {
    const d = this.duration;
    if (!Number.isFinite(d)) return;
    this.time = Math.min(Math.max(progress, 0), 1) * d;
    this.render(this.time);
  }

  /** Seek to an absolute time in seconds. */
  seekTime(seconds: number): this {
    this.time = Math.min(Math.max(seconds, 0), this.duration);
    this.render(this.time);
    return this;
  }

  private attach() {
    if (this.unsubscribe) return;
    this.unsubscribe = ticker.add((frame) => this.advance(frame.delta));
  }

  /** Stop listening to the ticker (used when nested or scrubbed). */
  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this._state === 'running') this._state = 'paused';
  }

  private advance(delta: number) {
    if (this.elapsedDelay < this.delay && this.direction === 1) {
      this.elapsedDelay += delta;
      if (this.elapsedDelay < this.delay) return;
      delta = this.elapsedDelay - this.delay;
    }
    const d = this.duration;
    this.time += delta * this.timeScale * this.direction;
    const done = this.direction === 1 ? this.time >= d : this.time <= 0;
    if (done) this.time = this.direction === 1 ? d : 0;
    this.render(this.time);
    if (done) this.complete();
  }

  private complete() {
    this.detach();
    this._state = 'finished';
    this.options.onComplete?.();
    this.resolveFinished?.();
  }

  play(): this {
    if (this._state === 'killed') return this;
    if (this._state === 'finished') this.resetFinished();
    this.direction = 1;
    if (this.time >= this.duration && Number.isFinite(this.duration)) this.time = 0;
    if (prefersReducedMotion() && (this.options.reducedMotion ?? 'skip') === 'skip') {
      const end = Number.isFinite(this.duration) ? this.duration : this.iterationDuration;
      this.time = end;
      this.render(end);
      this.complete();
      return this;
    }
    this._state = 'running';
    this.attach();
    return this;
  }

  pause(): this {
    if (this._state === 'running') {
      this.detach();
      this._state = 'paused';
    }
    return this;
  }

  reverse(): this {
    if (this._state === 'killed') return this;
    if (this._state === 'finished') this.resetFinished();
    this.direction = -1;
    this.elapsedDelay = this.delay;
    if (this.time <= 0) this.time = this.duration;
    this._state = 'running';
    this.attach();
    return this;
  }

  restart(): this {
    this.time = 0;
    this.elapsedDelay = 0;
    this.render(0, true);
    if (this._state === 'finished') this.resetFinished();
    this._state = 'idle';
    return this.play();
  }

  kill(): void {
    this.detach();
    this._state = 'killed';
    this.resolveFinished?.();
  }
}

/** Build a timeline containing one tween per target, staggered. */
function createTweenGroup(targets: TargetInput, props: Props, options: TweenOptions): Timeline {
  const list = resolveTargets(targets);
  const reduced = prefersReducedMotion();
  const policy = options.reducedMotion ?? 'skip';
  let duration = options.duration ?? 0.6;
  let effectiveProps = props;

  if (reduced && policy === 'fade') {
    effectiveProps = Object.fromEntries(Object.entries(props).filter(([k]) => FADE_PROPS.has(k)));
    duration = Math.min(duration, FADE_DURATION);
  } else if (reduced && policy === 'minimal') {
    duration = Math.min(duration, FADE_DURATION);
  }

  const group = new Timeline({
    onUpdate: options.onUpdate,
    onComplete: options.onComplete,
    repeat: options.repeat,
    yoyo: options.yoyo,
    reducedMotion: policy,
  });
  const ease = resolveEase(options.ease as Ease | undefined);
  const stagger = options.stagger;
  const delay = options.delay ?? 0;
  list.forEach((target, i) => {
    const offset =
      delay + (typeof stagger === 'function' ? stagger(i, list.length) : (stagger ?? 0) * i);
    const tween = new Tween(
      target,
      i,
      effectiveProps,
      duration,
      ease,
      options.immediateRender ?? true,
    );
    group.add(wrap(tween), offset);
  });
  return group;
}

/** Wrap a leaf as a Timeline-compatible child. */
function wrap(tween: Tween): Timeline {
  const t = new Timeline();
  // biome-ignore lint/suspicious/noExplicitAny: internal slot access
  (t as any).slots.push({ child: tween, start: 0 });
  return t;
}

/**
 * Animate targets now. Returns a playing `Timeline`.
 *
 * ```ts
 * animate('.card', { y: [24, 0], opacity: [0, 1] }, { duration: 0.6, stagger: 0.05, ease: 'outExpo' });
 * animate(mesh.rotation, { y: Math.PI }, { duration: 1.2, ease: 'cinematic' });
 * ```
 */
export function animate(targets: TargetInput, props: Props, options: TweenOptions = {}): Timeline {
  const group = createTweenGroup(targets, props, options);
  if (options.autoplay !== false) group.play();
  return group;
}

/** Create an empty timeline. Paused until `play()` (or scrubbed by a progress source). */
export function timeline(options: TimelineOptions = {}): Timeline {
  return new Timeline(options);
}

export interface StaggerOptions {
  /** Where the wave starts. Default `start`. */
  from?: 'start' | 'center' | 'end' | 'random' | number;
  /** Ease the distribution of delays across the total spread. */
  ease?: Ease;
  /** `[columns, rows]` to stagger by 2D distance in a grid. */
  grid?: [number, number];
}

/** Delay distribution helper: `stagger(0.05, { from: 'center' })`. */
export function stagger(each: number, options: StaggerOptions = {}) {
  const from = options.from ?? 'start';
  const ease = options.ease ? resolveEase(options.ease) : null;
  const seeds = new Map<number, number[]>();
  return (index: number, total: number): number => {
    let distance: number;
    let max: number;
    if (options.grid) {
      const [cols, rows] = options.grid;
      const ox =
        from === 'center'
          ? (cols - 1) / 2
          : from === 'end'
            ? cols - 1
            : typeof from === 'number'
              ? from % cols
              : 0;
      const oy =
        from === 'center'
          ? (rows - 1) / 2
          : from === 'end'
            ? rows - 1
            : typeof from === 'number'
              ? Math.floor(from / cols)
              : 0;
      const x = index % cols;
      const y = Math.floor(index / cols);
      distance = Math.hypot(x - ox, y - oy);
      max = Math.max(
        Math.hypot(ox, oy),
        Math.hypot(cols - 1 - ox, oy),
        Math.hypot(ox, rows - 1 - oy),
        Math.hypot(cols - 1 - ox, rows - 1 - oy),
      );
    } else if (from === 'random') {
      let order = seeds.get(total);
      if (!order) {
        order = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5);
        seeds.set(total, order);
      }
      distance = order[index] ?? index;
      max = total - 1;
    } else {
      const origin =
        from === 'center'
          ? (total - 1) / 2
          : from === 'end'
            ? total - 1
            : from === 'start'
              ? 0
              : from;
      distance = Math.abs(index - origin);
      max = Math.max(origin, total - 1 - origin);
    }
    if (ease && max > 0) return ease(distance / max) * max * each;
    return distance * each;
  };
}
