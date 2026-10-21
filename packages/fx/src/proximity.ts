import { createScope, damp, type PatternHandle, prefersReducedMotion } from '@snowbros/core';
import { resolveTargets, type TargetInput } from '@snowbros/motion';
import { createLoop, finePointer, round3 } from './internal.js';

export interface ProximityOptions {
  /** Distance in px at which influence reaches 0. Default 180. */
  radius?: number;
  /** CSS custom property written on each target (0 far … 1 under the pointer). Default `--sb-proximity`. */
  property?: string;
  /** Follow rate per second (higher = snappier). Default 10. */
  rate?: number;
  /** Shape the falloff, e.g. `(t) => t * t`. Default smoothstep. */
  falloff?: (t: number) => number;
  /** Also called per target with its eased value — for effects CSS variables can't express. */
  onUpdate?: (el: HTMLElement, value: number, index: number) => void;
  /** Run on touch / no-hover devices. Default false. */
  force?: boolean;
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * Pointer proximity as data. Each target gets `--sb-proximity` (0..1) based on its distance to
 * the pointer, eased over time. Style it however you like — variable-font weight, scale (a dock),
 * colour, letter-spacing:
 *
 * ```css
 * .word { font-variation-settings: "wght" calc(300 + 500 * var(--sb-proximity, 0)); }
 * ```
 *
 * One pointer listener and one frame loop for all targets; rects are cached and re-measured on
 * resize/scroll/font load and at most every 200 ms while the pointer moves. Sleeps when every value has settled. Touch / no-hover: inactive (values stay 0).
 * Reduced motion: values jump instead of easing.
 */
export function proximity(targets: TargetInput, options: ProximityOptions = {}): PatternHandle {
  const scope = createScope();
  const els = resolveTargets(targets).filter((t): t is HTMLElement => t instanceof HTMLElement);
  if (!els.length || (!options.force && !finePointer())) return scope;

  const radius = options.radius ?? 180;
  const prop = options.property ?? '--sb-proximity';
  const rate = options.rate ?? 10;
  const falloff = options.falloff ?? smoothstep;
  const centres = els.map(() => ({ x: 0, y: 0 }));
  const value = els.map(() => 0);
  const target = els.map(() => 0);
  let dirty = true;
  let measuredAt = 0;
  let px = -1e6;
  let py = -1e6;

  const measure = () => {
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      centres[i]!.x = r.left + r.width / 2;
      centres[i]!.y = r.top + r.height / 2;
    });
    dirty = false;
    measuredAt = performance.now();
  };
  const retarget = () => {
    if (dirty) measure();
    for (let i = 0; i < els.length; i++) {
      const d = Math.hypot(centres[i]!.x - px, centres[i]!.y - py);
      target[i] = d >= radius ? 0 : falloff(1 - d / radius);
    }
  };

  const loop = createLoop(({ delta }) => {
    let settled = true;
    const instant = prefersReducedMotion();
    for (let i = 0; i < els.length; i++) {
      const next = instant ? target[i]! : damp(value[i]!, target[i]!, rate, delta);
      const done = Math.abs(next - target[i]!) < 0.002;
      const v = done ? target[i]! : next;
      if (v !== value[i]) {
        value[i] = v;
        els[i]!.style.setProperty(prop, String(round3(v)));
        options.onUpdate?.(els[i]!, v, i);
      }
      if (!done) settled = false;
    }
    return settled;
  });

  const invalidate = () => {
    dirty = true;
  };
  scope.listen(
    window,
    'pointermove',
    (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      // Layout can shift without resize/scroll (font swap, weight changes, content): refresh
      // cached centres at most ~5×/s while the pointer moves.
      if (performance.now() - measuredAt > 200) dirty = true;
      retarget();
      loop.kick();
    },
    { passive: true },
  );
  scope.listen(
    window,
    'scroll',
    () => {
      invalidate();
      retarget();
      loop.kick();
    },
    { passive: true },
  );
  scope.listen(window, 'resize', invalidate);
  void document.fonts?.ready.then(invalidate);
  scope.listen(document, 'pointerleave', () => {
    px = py = -1e6;
    retarget();
    loop.kick();
  });

  scope.add(() => {
    loop.stop();
    for (const el of els) el.style.removeProperty(prop);
  });
  return scope;
}
