import { createScope, type PatternHandle } from '@snowbros/core';
import { finePointer, round3 } from './internal.js';

export interface SpotlightOptions {
  /** Radius in px, exposed as `--sb-spot-r`. Default 320. */
  radius?: number;
  /** Highlight color, exposed as `--sb-spot-color`. */
  color?: string;
  /** Run on touch / no-hover devices. Default false. */
  force?: boolean;
}

/**
 * Pointer spotlight via CSS custom properties. Sets `--sb-x` / `--sb-y` (px, relative to the
 * element), `--sb-spot-r`, `--sb-spot-color` and `--sb-spot-opacity` (0/1). Your CSS paints it:
 *
 * ```css
 * .card { background: radial-gradient(var(--sb-spot-r) circle at var(--sb-x) var(--sb-y),
 *   color-mix(in oklab, var(--sb-spot-color) calc(var(--sb-spot-opacity) * 14%), transparent), transparent); }
 * ```
 *
 * Box measured on enter and after scroll. Not motion (a static highlight under the pointer), so it
 * stays active under reduced motion. Touch / no-hover devices: no-op unless `force`.
 */
export function spotlight(el: HTMLElement, options: SpotlightOptions = {}): PatternHandle {
  const scope = createScope();
  if (!options.force && !finePointer()) return scope;
  const vars = ['--sb-x', '--sb-y', '--sb-spot-r', '--sb-spot-color', '--sb-spot-opacity'];
  const prev = vars.map((v) => el.style.getPropertyValue(v));
  el.style.setProperty('--sb-spot-r', `${options.radius ?? 320}px`);
  if (options.color) el.style.setProperty('--sb-spot-color', options.color);
  el.style.setProperty('--sb-spot-opacity', '0');
  let rect: DOMRect | null = null;

  scope.listen(
    window,
    'scroll',
    () => {
      rect = null;
    },
    { passive: true },
  );
  scope.listen(el, 'pointerenter', () => {
    rect = el.getBoundingClientRect();
    el.style.setProperty('--sb-spot-opacity', '1');
  });
  scope.listen(el, 'pointermove', (e) => {
    rect ??= el.getBoundingClientRect();
    el.style.setProperty('--sb-x', `${round3(e.clientX - rect.left)}px`);
    el.style.setProperty('--sb-y', `${round3(e.clientY - rect.top)}px`);
  });
  scope.listen(el, 'pointerleave', () => {
    el.style.setProperty('--sb-spot-opacity', '0');
  });

  scope.add(() => {
    vars.forEach((v, i) => {
      const old = prev[i];
      if (old) el.style.setProperty(v, old);
      else el.style.removeProperty(v);
    });
  });
  return { dispose: () => scope.dispose() };
}
