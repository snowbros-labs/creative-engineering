import {
  createScope,
  createSpringValue,
  type PatternHandle,
  prefersReducedMotion,
  type SpringConfig,
  type SpringName,
} from '@snowbros/core';
import { createLoop, finePointer, round3 } from './internal.js';

export interface TiltOptions {
  /** Maximum rotation in degrees. Default 8. */
  max?: number;
  /** Perspective distance in px. Default 800. */
  perspective?: number;
  /** Add a soft specular highlight layer following the pointer. Default false. */
  glare?: boolean;
  /** Maximum glare opacity. Default 0.18. */
  glareOpacity?: number;
  spring?: SpringConfig | SpringName;
  /** Run on touch / no-hover devices. Default false. */
  force?: boolean;
}

/**
 * 3D pointer tilt for cards and media. Box is measured on `pointerenter` only.
 * Reduced motion: disabled. Touch / no-hover devices: no-op unless `force`.
 */
export function tilt(el: HTMLElement, options: TiltOptions = {}): PatternHandle {
  const scope = createScope();
  if (!options.force && !finePointer()) return scope;
  const max = options.max ?? 8;
  const perspective = options.perspective ?? 800;
  const spring = options.spring ?? 'smooth';
  const prev = { transform: el.style.transform, position: el.style.position };
  const rx = createSpringValue(0, spring);
  const ry = createSpringValue(0, spring);
  const glareAmount = createSpringValue(0, spring);
  let rect: DOMRect | null = null;
  let glare: HTMLElement | null = null;

  if (options.glare) {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    glare = document.createElement('span');
    glare.setAttribute('aria-hidden', 'true');
    glare.style.cssText =
      'position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;' +
      'background:radial-gradient(circle at var(--sb-glare-x,50%) var(--sb-glare-y,50%),rgba(255,255,255,.9),transparent 60%);' +
      'mix-blend-mode:soft-light';
    el.appendChild(glare);
  }
  const glareMax = options.glareOpacity ?? 0.18;

  const apply = () => {
    el.style.transform = `perspective(${perspective}px) rotateX(${round3(rx.value)}deg) rotateY(${round3(ry.value)}deg)`;
    if (glare) glare.style.opacity = String(round3(glareAmount.value * glareMax));
  };
  const loop = createLoop((frame) => {
    rx.step(frame.delta);
    ry.step(frame.delta);
    glareAmount.step(frame.delta);
    apply();
    return rx.settled && ry.settled && glareAmount.settled;
  });

  scope.listen(el, 'pointerenter', () => {
    rect = el.getBoundingClientRect();
  });
  scope.listen(el, 'pointermove', (e) => {
    if (prefersReducedMotion()) return;
    rect ??= el.getBoundingClientRect();
    const px = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
    const py = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
    rx.set(-(py - 0.5) * 2 * max);
    ry.set((px - 0.5) * 2 * max);
    glareAmount.set(1);
    if (glare) {
      glare.style.setProperty('--sb-glare-x', `${round3(px * 100)}%`);
      glare.style.setProperty('--sb-glare-y', `${round3(py * 100)}%`);
    }
    loop.kick();
  });
  scope.listen(el, 'pointerleave', () => {
    rect = null;
    rx.set(0);
    ry.set(0);
    glareAmount.set(0);
    loop.kick();
  });

  scope.add(() => {
    loop.stop();
    glare?.remove();
    el.style.transform = prev.transform;
    el.style.position = prev.position;
  });
  return { dispose: () => scope.dispose() };
}
