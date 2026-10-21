import {
  createScope,
  createSpringValue,
  type PatternHandle,
  prefersReducedMotion,
  type SpringConfig,
  type SpringName,
} from '@snowbros/core';
import { createLoop, finePointer, round3 } from './internal.js';

export interface MagneticOptions {
  /** Fraction of the pointer offset the element follows. Default 0.35. */
  strength?: number;
  /** Activation distance in px beyond the element's bounds. Default 60. */
  radius?: number;
  spring?: SpringConfig | SpringName;
  /** Inner element (label, icon) that moves further for a parallax feel. */
  inner?: HTMLElement;
  /** Inner movement relative to `strength`. Default 1.6. */
  innerFactor?: number;
  /** Run even on touch / no-hover devices. Default false. */
  force?: boolean;
}

/**
 * Pointer attraction ("magnetic" buttons). The element drifts toward the pointer while it is
 * within `radius` of its bounds and springs back when it leaves — retargeting keeps momentum.
 *
 * Layout is read once per scroll/resize (not per frame). Reduced motion: disabled (no movement).
 * Touch / no-hover devices: no-op unless `force`.
 */
export function magnetic(el: HTMLElement, options: MagneticOptions = {}): PatternHandle {
  const scope = createScope();
  if (!options.force && !finePointer()) return scope;
  const strength = options.strength ?? 0.35;
  const radius = options.radius ?? 60;
  const inner = options.inner;
  const innerFactor = options.innerFactor ?? 1.6;
  const spring = options.spring ?? 'snappy';
  const prev = { transform: el.style.transform, inner: inner?.style.transform ?? '' };
  const x = createSpringValue(0, spring);
  const y = createSpringValue(0, spring);
  let rect: DOMRect | null = null;

  const apply = () => {
    el.style.transform = `translate3d(${round3(x.value)}px, ${round3(y.value)}px, 0)`;
    if (inner) {
      inner.style.transform = `translate3d(${round3(x.value * (innerFactor - 1))}px, ${round3(y.value * (innerFactor - 1))}px, 0)`;
    }
  };
  const loop = createLoop((frame) => {
    x.step(frame.delta);
    y.step(frame.delta);
    apply();
    return x.settled && y.settled;
  });

  const invalidate = () => {
    rect = null;
  };
  scope.listen(window, 'scroll', invalidate, { passive: true });
  scope.listen(window, 'resize', invalidate);
  scope.listen(
    window,
    'pointermove',
    (e) => {
      if (prefersReducedMotion()) return;
      // Measure lazily; subtract the current offset so our own transform doesn't skew the box.
      rect ??= el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - x.value;
      const cy = rect.top + rect.height / 2 - y.value;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const inside =
        Math.abs(dx) <= rect.width / 2 + radius && Math.abs(dy) <= rect.height / 2 + radius;
      const tx = inside ? dx * strength : 0;
      const ty = inside ? dy * strength : 0;
      if (tx !== x.target || ty !== y.target) {
        x.set(tx);
        y.set(ty);
        loop.kick();
      }
    },
    { passive: true },
  );
  scope.listen(document, 'pointerleave', () => {
    x.set(0);
    y.set(0);
    loop.kick();
  });

  scope.add(() => {
    loop.stop();
    el.style.transform = prev.transform;
    if (inner) inner.style.transform = prev.inner;
  });
  return { dispose: () => scope.dispose() };
}
