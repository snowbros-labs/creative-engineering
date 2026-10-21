import { createScope, type PatternHandle, prefersReducedMotion } from '@snowbros/core';
import { inView } from '@snowbros/motion';
import { createLoop, SR_ONLY_STYLE } from './internal.js';

export interface ScrambleOptions {
  /** Final text. Default: the element's current text. */
  text?: string;
  /** Glyph pool used while scrambling. */
  chars?: string;
  /** Seconds. Default 0.9. */
  duration?: number;
  /** How often glyphs change, in seconds. Default 0.045 (avoids strobing). */
  rate?: number;
  /** `load` (default), `inview`, `hover` (replays on pointerenter / focus), or `manual`. */
  trigger?: 'load' | 'inview' | 'hover' | 'manual';
}

export interface ScrambleHandle extends PatternHandle {
  /** (Re)play the effect. Resolves when the final text is shown. */
  play(): Promise<void>;
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';

/**
 * Text scramble/decode. Characters resolve left-to-right with slight randomness.
 *
 * Accessibility: the final text lives in a visually-hidden span; the scrambling glyphs are in an
 * `aria-hidden` span, so screen readers only ever announce the real text.
 * Reduced motion: shows the final text immediately.
 */
export function scramble(el: HTMLElement, options: ScrambleOptions = {}): ScrambleHandle {
  const scope = createScope();
  const original = el.innerHTML;
  const text = options.text ?? el.textContent ?? '';
  const chars = options.chars ?? DEFAULT_CHARS;
  const duration = Math.max(0.01, options.duration ?? 0.9);
  const rate = options.rate ?? 0.045;

  const sr = document.createElement('span');
  sr.setAttribute('style', SR_ONLY_STYLE);
  sr.textContent = text;
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  visual.textContent = text;
  el.replaceChildren(sr, visual);

  const glyphs = Array.from(text);
  // Each glyph resolves at a time spread across the duration, with jitter.
  const resolveAt = glyphs.map((_, i) =>
    Math.min(1, (i / Math.max(1, glyphs.length)) * 0.7 + Math.random() * 0.3),
  );
  let elapsed = 0;
  let sinceSwap = Number.POSITIVE_INFINITY;
  let resolve: (() => void) | null = null;

  const randomGlyph = () => chars[Math.floor(Math.random() * chars.length)] ?? '';
  const loop = createLoop((frame) => {
    elapsed += frame.delta;
    sinceSwap += frame.delta;
    const p = elapsed / duration;
    if (p >= 1) {
      visual.textContent = text;
      resolve?.();
      resolve = null;
      return true;
    }
    if (sinceSwap >= rate) {
      sinceSwap = 0;
      let out = '';
      glyphs.forEach((g, i) => {
        out += p >= resolveAt[i]! || /\s/.test(g) ? g : randomGlyph();
      });
      visual.textContent = out;
    }
    return false;
  });

  const play = (): Promise<void> => {
    if (scope.disposed) return Promise.resolve();
    if (prefersReducedMotion()) {
      loop.stop();
      visual.textContent = text;
      return Promise.resolve();
    }
    resolve?.();
    elapsed = 0;
    sinceSwap = Number.POSITIVE_INFINITY;
    loop.kick();
    return new Promise((r) => {
      resolve = r;
    });
  };

  const trigger = options.trigger ?? 'load';
  if (trigger === 'load') void play();
  else if (trigger === 'inview') scope.add(inView(el, () => void play()));
  else if (trigger === 'hover') {
    scope.listen(el, 'pointerenter', () => void play());
    scope.listen(el, 'focus', () => void play());
  }

  scope.add(() => {
    loop.stop();
    resolve?.();
    el.innerHTML = original;
  });
  return { play, dispose: () => scope.dispose() };
}
