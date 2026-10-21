import {
  clamp,
  createScope,
  damp,
  type PatternHandle,
  Priority,
  prefersReducedMotion,
  ticker,
} from '@snowbros/core';
import type { Object3D } from 'three';

export interface OrbitInertiaOptions {
  /** Idle auto-spin speed in radians/second. 0 disables. Default 0.25. Off under reduced motion. */
  autoSpin?: number;
  /** Velocity decay rate per second after release. Default 3.5. */
  damping?: number;
  /** Maximum pitch (radians) for vertical drag. Default 0.5. 0 locks pitch. */
  maxPitch?: number;
  /** Radians per pixel of drag. Default 0.008. */
  sensitivity?: number;
  /** Seconds after interaction before auto-spin resumes. Default 2. */
  resumeAfter?: number;
  /** Called when the object moved (use `stage.invalidate` in demand mode). */
  onChange?: () => void;
}

/**
 * Drag-to-spin an object with damped inertia and an idle auto-spin. Pointer events cover mouse,
 * pen and touch; horizontal drags are captured on the element only (`touch-action: pan-y`),
 * so vertical page scrolling still works on phones. Arrow keys rotate when the element is
 * focused (it gets `tabindex="0"` and an `aria-label` if missing).
 */
export function createOrbitInertia(
  object: Object3D,
  element: HTMLElement,
  options: OrbitInertiaOptions = {},
): PatternHandle {
  const scope = createScope();
  const sensitivity = options.sensitivity ?? 0.008;
  const decay = options.damping ?? 3.5;
  const maxPitch = options.maxPitch ?? 0.5;
  const autoSpin = options.autoSpin ?? 0.25;
  const resumeAfter = (options.resumeAfter ?? 2) * 1000;
  let vy = 0;
  let vx = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastMove = 0;
  let lastInteraction = -Infinity;
  let pitch = object.rotation.x;

  const prevTouch = element.style.touchAction;
  element.style.touchAction = 'pan-y';
  if (!element.hasAttribute('tabindex')) element.tabIndex = 0;
  if (!element.hasAttribute('aria-label'))
    element.setAttribute('aria-label', 'Interactive 3D view. Use arrow keys to rotate.');
  scope.add(() => {
    element.style.touchAction = prevTouch;
  });

  scope.listen(element, 'pointerdown', (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    lastMove = performance.now();
    vx = vy = 0;
    element.setPointerCapture?.(e.pointerId);
  });
  scope.listen(element, 'pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastMove) / 1000;
    const dx = (e.clientX - lastX) * sensitivity;
    const dy = (e.clientY - lastY) * sensitivity;
    object.rotation.y += dx;
    pitch = clamp(pitch + dy, -maxPitch, maxPitch);
    object.rotation.x = pitch;
    vy = dx / dt;
    vx = dy / dt;
    lastX = e.clientX;
    lastY = e.clientY;
    lastMove = now;
    lastInteraction = now;
    options.onChange?.();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    lastInteraction = performance.now();
    if (prefersReducedMotion()) vx = vy = 0; // no coasting
  };
  scope.listen(element, 'pointerup', release);
  scope.listen(element, 'pointercancel', release);
  scope.listen(element, 'keydown', (e: KeyboardEvent) => {
    const step = 0.15;
    if (e.key === 'ArrowLeft') object.rotation.y -= step;
    else if (e.key === 'ArrowRight') object.rotation.y += step;
    else if (e.key === 'ArrowUp') pitch = clamp(pitch - step, -maxPitch, maxPitch);
    else if (e.key === 'ArrowDown') pitch = clamp(pitch + step, -maxPitch, maxPitch);
    else return;
    e.preventDefault();
    object.rotation.x = pitch;
    lastInteraction = performance.now();
    options.onChange?.();
  });

  scope.add(
    ticker.add(({ delta, time }) => {
      if (dragging || delta === 0) return;
      let moved = false;
      if (Math.abs(vy) > 0.001 || Math.abs(vx) > 0.001) {
        object.rotation.y += vy * delta;
        pitch = clamp(pitch + vx * delta, -maxPitch, maxPitch);
        object.rotation.x = pitch;
        vy = damp(vy, 0, decay, delta);
        vx = damp(vx, 0, decay, delta);
        moved = true;
      } else if (autoSpin && !prefersReducedMotion() && time - lastInteraction > resumeAfter) {
        object.rotation.y += autoSpin * delta;
        moved = true;
      }
      if (moved) options.onChange?.();
    }, Priority.update),
  );
  return scope;
}

export interface PointerParallaxOptions {
  /** Max rotation in radians. Default 0.12. */
  strength?: number;
  /** Follow rate per second. Default 4. */
  ease?: number;
  /** Element whose box normalises the pointer. Default: the window. */
  element?: HTMLElement;
  onChange?: () => void;
}

/**
 * Subtle tilt toward the pointer. Disabled on coarse pointers (no hover) and under reduced motion.
 * Rotation is applied as an offset from the object's rotation at creation time.
 */
export function pointerParallax(
  object: Object3D,
  options: PointerParallaxOptions = {},
): PatternHandle {
  const scope = createScope();
  const strength = options.strength ?? 0.12;
  const rate = options.ease ?? 4;
  const baseX = object.rotation.x;
  const baseY = object.rotation.y;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  const hover = typeof matchMedia === 'function' ? matchMedia('(hover: hover)').matches : true;
  if (!hover) return scope;

  scope.listen(
    window,
    'pointermove',
    (e: PointerEvent) => {
      const r = options.element?.getBoundingClientRect();
      const w = r ? r.width : window.innerWidth;
      const h = r ? r.height : window.innerHeight;
      const nx = ((e.clientX - (r?.left ?? 0)) / w) * 2 - 1;
      const ny = ((e.clientY - (r?.top ?? 0)) / h) * 2 - 1;
      tx = clamp(nx, -1, 1);
      ty = clamp(ny, -1, 1);
    },
    { passive: true },
  );

  scope.add(
    ticker.add(({ delta }) => {
      if (prefersReducedMotion()) return;
      const nx = damp(cx, tx, rate, delta);
      const ny = damp(cy, ty, rate, delta);
      if (Math.abs(nx - cx) < 1e-5 && Math.abs(ny - cy) < 1e-5) return;
      cx = nx;
      cy = ny;
      object.rotation.y = baseY + cx * strength;
      object.rotation.x = baseX + cy * strength;
      options.onChange?.();
    }, Priority.update),
  );
  scope.add(() => {
    object.rotation.x = baseX;
    object.rotation.y = baseY;
  });
  return scope;
}
