import {
  createScope,
  type Ease,
  type PatternHandle,
  prefersReducedMotion,
  type Seekable,
} from '@snowbros/core';
import { animate } from '@snowbros/motion';
import { round3 } from './internal.js';

export type RevealOrigin = 'bottom' | 'top' | 'left' | 'right' | 'center';

export interface ImageRevealOptions {
  /** Edge the reveal grows from. Default `bottom`. */
  from?: RevealOrigin;
  /** Media element counter-scaled during the reveal. Default: first img/video/picture/canvas. */
  inner?: HTMLElement | null;
  /** Starting scale of the inner media. Default 1.2. Set 1 to disable. */
  scale?: number;
}

export interface ImageRevealHandle extends Seekable, PatternHandle {
  /** Play 0 → 1 over time. Reduced motion: jumps to fully revealed. */
  play(options?: { duration?: number; ease?: Ease }): Promise<void>;
}

const pct = (v: number) => `${round3(v)}%`;

/** The `clip-path` for a reveal at progress `p` (0 hidden → 1 fully visible). */
export function revealClipPath(from: RevealOrigin, p: number): string {
  const hidden = (1 - Math.min(1, Math.max(0, p))) * 100;
  switch (from) {
    case 'bottom':
      return `inset(${pct(hidden)} 0% 0% 0%)`;
    case 'top':
      return `inset(0% 0% ${pct(hidden)} 0%)`;
    case 'left':
      return `inset(0% ${pct(hidden)} 0% 0%)`;
    case 'right':
      return `inset(0% 0% 0% ${pct(hidden)})`;
    case 'center': {
      const h = pct(hidden / 2);
      return `inset(${h} ${h} ${h} ${h})`;
    }
  }
}

/**
 * Clip-path image reveal with an inner counter-scale (media settles from `scale` to 1 as the
 * mask opens) — the editorial "window opening" effect.
 *
 * Seekable: scrub it with scroll (`scrub(handle, progress)`) or call `play()`.
 * Reduced motion: `play()` jumps to the end; when scrubbed, the clip still follows the user's
 * scrolling but the inner scale is not applied.
 */
export function imageReveal(el: HTMLElement, options: ImageRevealOptions = {}): ImageRevealHandle {
  const scope = createScope();
  const from = options.from ?? 'bottom';
  const inner =
    options.inner === undefined
      ? el.querySelector<HTMLElement>('img, video, picture, canvas')
      : options.inner;
  const startScale = options.scale ?? 1.2;
  const prev = { clip: el.style.clipPath, innerTransform: inner?.style.transform ?? '' };

  const seek = (p: number) => {
    el.style.clipPath = revealClipPath(from, p);
    if (inner && startScale !== 1 && !prefersReducedMotion()) {
      const s = startScale + (1 - startScale) * Math.min(1, Math.max(0, p));
      inner.style.transform = `scale(${round3(s)})`;
    }
  };
  seek(0);

  const proxy = { p: 0 };
  const play = (opts: { duration?: number; ease?: Ease } = {}): Promise<void> => {
    if (prefersReducedMotion()) {
      seek(1);
      return Promise.resolve();
    }
    proxy.p = 0;
    const tl = animate(
      proxy,
      { p: 1 },
      {
        duration: opts.duration ?? 1.2,
        ease: opts.ease ?? 'editorial',
        onUpdate: () => seek(proxy.p),
      },
    );
    scope.add(() => tl.kill());
    return tl.finished;
  };

  scope.add(() => {
    el.style.clipPath = prev.clip;
    if (inner) inner.style.transform = prev.innerTransform;
  });
  return { duration: 0, seek, play, dispose: () => scope.dispose() };
}
