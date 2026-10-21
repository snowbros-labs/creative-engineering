import {
  createScope,
  createSpringValue,
  type HapticName,
  haptic,
  type PatternHandle,
  prefersReducedMotion,
  type SpringConfig,
  type SpringName,
} from '@snowbros/core';
import { createLoop, round3 } from './internal.js';

export interface PressableOptions {
  /** CSS custom property receiving press depth (0 up … 1 fully pressed). Default `--sb-press`. */
  property?: string;
  /** Spring used for release; an underdamped one gives a physical "pop". Default bouncy-ish. */
  spring?: SpringConfig | SpringName;
  /** Haptic on press (`null` for none). Default `press`. */
  haptic?: HapticName | null;
  /** Called when the press commits (pointer up inside, or key up). */
  onPress?: (event: Event) => void;
}

/**
 * A control with physical press depth. Works for pointer (including touch) and keyboard
 * (Space / Enter, matching native buttons). Writes `--sb-press` so CSS decides what "depth"
 * looks like — translate, shadow collapse, scale:
 *
 * ```css
 * .key {
 *   transform: translateY(calc(var(--sb-press, 0) * 3px));
 *   box-shadow: 0 calc((1 - var(--sb-press, 0)) * 4px) 0 var(--edge);
 * }
 * ```
 *
 * Presses snap down instantly (feedback must be immediate); releases spring back. Optional
 * vibration via `haptic()` — an enhancement only. Reduced motion: release is instant too.
 * Does not change semantics: put it on a real `<button>` / link.
 */
export function pressable(el: HTMLElement, options: PressableOptions = {}): PatternHandle {
  const scope = createScope();
  const prop = options.property ?? '--sb-press';
  const depth = createSpringValue(0, options.spring ?? { stiffness: 520, damping: 18, mass: 1 });
  let down = false;

  const write = (v: number) => el.style.setProperty(prop, String(round3(Math.max(-0.4, v))));
  const loop = createLoop(({ delta }) => {
    write(depth.step(delta));
    return depth.settled;
  });

  const press = () => {
    if (down) return;
    down = true;
    depth.jump(1);
    write(1);
    el.dataset.pressed = 'true';
    if (options.haptic !== null) haptic(options.haptic ?? 'press');
  };
  const release = (commit: boolean, event: Event) => {
    if (!down) return;
    down = false;
    delete el.dataset.pressed;
    if (prefersReducedMotion()) {
      depth.jump(0);
      write(0);
    } else {
      depth.set(0);
      loop.kick();
    }
    if (commit) options.onPress?.(event);
  };

  scope.listen(el, 'pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    press();
  });
  scope.listen(el, 'pointerup', (e: Event) => release(true, e));
  scope.listen(el, 'pointerleave', (e: Event) => release(false, e));
  scope.listen(el, 'pointercancel', (e: Event) => release(false, e));
  scope.listen(el, 'keydown', (e: KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press();
  });
  scope.listen(el, 'keyup', (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') release(true, e);
  });
  scope.listen(el, 'blur', (e: Event) => release(false, e));

  scope.add(() => {
    loop.stop();
    el.style.removeProperty(prop);
    delete el.dataset.pressed;
  });
  return scope;
}
