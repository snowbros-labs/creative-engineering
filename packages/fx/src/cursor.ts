import {
  createScope,
  createSpringValue,
  type PatternHandle,
  prefersReducedMotion,
  type SpringConfig,
  type SpringName,
} from '@snowbros/core';
import { createLoop, finePointer, round3 } from './internal.js';

export interface CursorState {
  /** Scale relative to `size`. */
  scale?: number;
  /** Short text shown inside the follower (e.g. "View", "Drag"). Decorative only. */
  label?: string;
  /** Extra class added to the follower while active. */
  className?: string;
}

export interface CursorOptions {
  /** Diameter in px. Default 14. */
  size?: number;
  /** CSS `mix-blend-mode` for the follower (e.g. `difference`). */
  mix?: string;
  /** Named states activated by hovering `[data-cursor="name"]`. */
  states?: Record<string, CursorState>;
  /** Container the follower is appended to and events are delegated from. Default `document.body`. */
  target?: HTMLElement;
  /**
   * Hide the native cursor inside `target`. Default false — the native cursor carries OS-level
   * accessibility settings (size, contrast); only hide it for contained, pointer-only canvases.
   */
  hideNative?: boolean;
  spring?: SpringConfig | SpringName;
  /** Class for the follower element. Default `sb-cursor`. */
  className?: string;
  /** Run on touch / no-hover devices. Default false. */
  force?: boolean;
}

export interface CursorHandle extends PatternHandle {
  /** Activate a named state manually, or `null` for the default. */
  setState(name: string | null): void;
  /** The follower element (null on touch devices where the cursor is not created). */
  readonly element: HTMLElement | null;
}

/**
 * Custom cursor follower that augments — never replaces — the native cursor.
 *
 * Hovering any `[data-cursor="name"]` element switches to `states[name]` (event delegation; one
 * listener). The follower is `aria-hidden` and `pointer-events: none`, so it never intercepts input.
 * Touch / no-hover devices: not created. Reduced motion: follows the pointer without lag or scaling
 * transitions.
 */
export function createCursor(options: CursorOptions = {}): CursorHandle {
  const scope = createScope();
  if (!options.force && !finePointer()) {
    return { element: null, setState() {}, dispose: () => scope.dispose() };
  }
  const target = options.target ?? document.body;
  const size = options.size ?? 14;
  const states = options.states ?? {};
  const el = document.createElement('div');
  el.className = options.className ?? 'sb-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${size}px`,
    `height:${size}px`,
    `margin:${-size / 2}px 0 0 ${-size / 2}px`,
    'border-radius:999px',
    'pointer-events:none',
    'z-index:2147483646',
    'display:grid',
    'place-items:center',
    'opacity:0',
    'transition:opacity .2s',
    'background:currentColor',
    'will-change:transform',
    options.mix ? `mix-blend-mode:${options.mix}` : '',
  ]
    .filter(Boolean)
    .join(';');
  const label = document.createElement('span');
  label.style.cssText = 'font-size:3px;line-height:1;white-space:nowrap;color:Canvas';
  el.appendChild(label);
  target.appendChild(el);

  const prevCursor = target.style.cursor;
  if (options.hideNative) target.style.cursor = 'none';

  const spring = options.spring ?? 'snappy';
  const x = createSpringValue(0, spring);
  const y = createSpringValue(0, spring);
  const scale = createSpringValue(1, 'smooth');
  let active: string | null = null;
  let activeClass: string | undefined;

  const render = () => {
    el.style.transform = `translate3d(${round3(x.value)}px, ${round3(y.value)}px, 0) scale(${round3(scale.value)})`;
  };
  const loop = createLoop((frame) => {
    x.step(frame.delta);
    y.step(frame.delta);
    scale.step(frame.delta);
    render();
    return x.settled && y.settled && scale.settled;
  });

  const setState = (name: string | null) => {
    if (name === active) return;
    active = name;
    const s = name ? states[name] : undefined;
    if (activeClass) el.classList.remove(activeClass);
    activeClass = s?.className;
    if (activeClass) el.classList.add(activeClass);
    label.textContent = s?.label ?? '';
    const next = s?.scale ?? 1;
    // The label is laid out at 1/size scale so it reads at the expanded size.
    label.style.fontSize = `${Math.max(3, 12 / next)}px`;
    if (prefersReducedMotion()) scale.jump(next);
    else scale.set(next);
    render();
    loop.kick();
  };

  let first = true;
  scope.listen(
    target,
    'pointermove',
    (e) => {
      if (first || prefersReducedMotion()) {
        x.jump(e.clientX);
        y.jump(e.clientY);
        first = false;
        render();
      } else {
        x.set(e.clientX);
        y.set(e.clientY);
      }
      el.style.opacity = '1';
      loop.kick();
    },
    { passive: true },
  );
  scope.listen(target, 'pointerover', (e) => {
    const hit = (e.target as Element | null)?.closest?.('[data-cursor]');
    setState(hit?.getAttribute('data-cursor') ?? null);
  });
  scope.listen(document, 'pointerleave', () => {
    el.style.opacity = '0';
  });

  scope.add(() => {
    loop.stop();
    el.remove();
    target.style.cursor = prevCursor;
  });
  return { element: el, setState, dispose: () => scope.dispose() };
}
