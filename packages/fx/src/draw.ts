import {
  createScope,
  type Ease,
  type PatternHandle,
  type ProgressSource,
  prefersReducedMotion,
  type Seekable,
} from '@snowbros/core';
import { animate, resolveTargets, type TargetInput } from '@snowbros/motion';
import { round3 } from './internal.js';

export interface DrawPathPlayOptions {
  /** Seconds. Default 1.4. */
  duration?: number;
  ease?: Ease;
  /** Play automatically on creation. Default true when `duration` options are passed. */
  autoplay?: boolean;
}

export interface DrawPathHandle extends Seekable, PatternHandle {
  /** Animate 0 → 1 over time. Under reduced motion, jumps to the drawn state. */
  play(options?: DrawPathPlayOptions): Promise<void>;
  /** Measured lengths, one per path. */
  readonly lengths: readonly number[];
  /** Re-measure (after the path's `d` changes). */
  refresh(): void;
}

const isProgressSource = (v: unknown): v is ProgressSource =>
  !!v &&
  typeof (v as ProgressSource).get === 'function' &&
  typeof (v as ProgressSource).subscribe === 'function';

/**
 * SVG stroke drawing via `stroke-dasharray` / `stroke-dashoffset`.
 *
 * Drive it three ways: pass a `ProgressSource` (scroll), pass `{ duration }` to play on time,
 * or seek it yourself / hand it to `scrub()` from `@snowbros/motion`.
 *
 * Reduced motion: time-based playback jumps to the drawn state. Progress-driven (scroll)
 * drawing still follows the user's own scrolling, which is user-initiated motion.
 */
export function drawPath(
  paths: TargetInput,
  driver?: ProgressSource | DrawPathPlayOptions,
): DrawPathHandle {
  const scope = createScope();
  const els = resolveTargets(paths) as SVGGeometryElement[];
  const prev = els.map((el) => ({
    dasharray: el.style.strokeDasharray,
    dashoffset: el.style.strokeDashoffset,
  }));
  let lengths: number[] = [];
  let progress = 0;

  const seek = (p: number) => {
    progress = Math.min(1, Math.max(0, p));
    els.forEach((el, i) => {
      const len = lengths[i] ?? 0;
      el.style.strokeDashoffset = String(round3(len * (1 - progress)));
    });
  };
  const refresh = () => {
    lengths = els.map((el) => (typeof el.getTotalLength === 'function' ? el.getTotalLength() : 0));
    els.forEach((el, i) => {
      const len = lengths[i] ?? 0;
      el.style.strokeDasharray = `${round3(len)} ${round3(len)}`;
    });
    seek(progress);
  };
  refresh();

  const proxy = { p: 0 };
  const play = (options: DrawPathPlayOptions = {}): Promise<void> => {
    if (prefersReducedMotion()) {
      seek(1);
      return Promise.resolve();
    }
    proxy.p = progress;
    const tl = animate(
      proxy,
      { p: 1 },
      {
        duration: options.duration ?? 1.4,
        ease: options.ease ?? 'inOutCubic',
        onUpdate: () => seek(proxy.p),
      },
    );
    scope.add(() => tl.kill());
    return tl.finished;
  };

  if (isProgressSource(driver)) {
    seek(driver.get());
    scope.add(driver.subscribe(seek));
  } else if (driver && driver.autoplay !== false) {
    void play(driver);
  }

  scope.add(() => {
    els.forEach((el, i) => {
      el.style.strokeDasharray = prev[i]?.dasharray ?? '';
      el.style.strokeDashoffset = prev[i]?.dashoffset ?? '';
    });
  });

  return {
    duration: 0,
    seek,
    play,
    refresh,
    get lengths() {
      return lengths;
    },
    dispose: () => scope.dispose(),
  };
}
