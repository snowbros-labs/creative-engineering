/**
 * The SNOWBROS interaction contract.
 *
 * Every pattern — a DOM tween, an SVG path draw, a shader uniform, a Three.js camera rig —
 * is described with the same vocabulary, even though each renderer implements it natively.
 * Adapters translate these concepts; they do not force one implementation on all renderers.
 */
import type { Ease } from './ease.js';

/** A normalised 0..1 value that something else produces (scroll, time, drag, data). */
export interface ProgressSource {
  get(): number;
  subscribe(listener: (progress: number) => void): () => void;
}

/** Anything that can be driven by a progress value (seekable). */
export interface Seekable {
  /** Set the normalised progress (0..1) and render that state immediately. */
  seek(progress: number): void;
  /** Total duration in seconds (0 for purely progress-driven effects). */
  readonly duration: number;
}

export type PlaybackState = 'idle' | 'running' | 'paused' | 'finished' | 'killed';

/** A time-based effect that can be played, paused, reversed and awaited. */
export interface Playable extends Seekable {
  play(): this;
  pause(): this;
  reverse(): this;
  /** Restart from the beginning. */
  restart(): this;
  /** Stop and release resources. Final state is left as-is unless `revert` is called. */
  kill(): void;
  readonly state: PlaybackState;
  /** Current normalised progress. */
  readonly progress: number;
  /** Resolves when the effect reaches its end (or rejects never; killed resolves too). */
  readonly finished: Promise<void>;
}

/**
 * What a pattern should do when the user prefers reduced motion.
 * - `skip`: jump to the end state immediately (default for decorative entrances).
 * - `fade`: replace spatial movement with a short opacity change.
 * - `minimal`: keep the effect but cap travel distance and duration.
 * - `keep`: the motion carries essential meaning and is already gentle (rare; justify it).
 */
export type ReducedMotionPolicy = 'skip' | 'fade' | 'minimal' | 'keep';

/** Where a trigger-based pattern starts: on load, when in view, on interaction, or manually. */
export type TriggerKind = 'load' | 'inview' | 'hover' | 'press' | 'focus' | 'manual' | 'scroll';

/** Shared timing inputs. Every field is optional; patterns document their defaults. */
export interface TimingOptions {
  /** Seconds. */
  duration?: number;
  /** Seconds. */
  delay?: number;
  ease?: Ease;
  /** Seconds between successive targets, or a function of index. */
  stagger?: number | ((index: number, total: number) => number);
  /** Repeat count; `Infinity` loops. */
  repeat?: number;
  /** Alternate direction on each repeat. */
  yoyo?: boolean;
}

/** Shared expressive inputs for effects. */
export interface ExpressionOptions {
  /** 0..1+ scaling of distance/strength. 1 is the designed default. */
  intensity?: number;
  /** Direction hint, interpreted per pattern. */
  direction?: 'up' | 'down' | 'left' | 'right' | 'in' | 'out';
  reducedMotion?: ReducedMotionPolicy;
}

/** Every pattern factory returns at least this. */
export interface PatternHandle {
  /** Tear down listeners/resources. Must be idempotent. */
  dispose(): void;
}
