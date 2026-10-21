import { type FrameInfo, Priority, ticker } from '@snowbros/core';

/**
 * True when the primary input can hover with a fine pointer (mouse, trackpad, stylus).
 * Read live on every call — pointer effects are decided at creation time.
 */
export function finePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Run `step` on the shared ticker until it reports it has settled, then sleep.
 * `kick()` wakes it again (e.g. when a spring target changes).
 */
export function createLoop(
  step: (frame: FrameInfo) => boolean,
  priority: number = Priority.update,
) {
  let off: (() => void) | null = null;
  return {
    kick() {
      if (off) return;
      off = ticker.add((frame) => {
        if (step(frame)) {
          off?.();
          off = null;
        }
      }, priority);
    },
    stop() {
      off?.();
      off = null;
    },
    get running() {
      return off !== null;
    },
  };
}

/** Visually hidden but available to assistive technology. */
export const SR_ONLY_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

export const round3 = (v: number) => Math.round(v * 1000) / 1000;
