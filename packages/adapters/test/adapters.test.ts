import { setMotionPreference, ticker } from '@snowbros/core';
import { describe, expect, it, vi } from 'vitest';
import { fromGsap, fromMotion, shareGsapTicker, smoothScroll } from '../src/index.js';

describe('adapters', () => {
  it('smoothScroll creates Lenis only with full motion and tears down on reduce', () => {
    ticker.useExternalClock();
    const raf = vi.fn();
    const destroy = vi.fn();
    const create = vi.fn(() => ({ raf, destroy }));
    const handle = smoothScroll({ create });
    expect(create).toHaveBeenCalledOnce();
    ticker.tick(100);
    expect(raf).toHaveBeenCalledWith(100);
    setMotionPreference('reduced');
    expect(destroy).toHaveBeenCalledOnce();
    expect(handle.instance).toBeNull();
    setMotionPreference(null);
    expect(create).toHaveBeenCalledTimes(2);
    handle.dispose();
    expect(destroy).toHaveBeenCalledTimes(2);
  });

  it('shareGsapTicker drives the SNOWBROS ticker from GSAP time (seconds → ms)', () => {
    let registered: ((t: number, d: number, f: number) => void) | null = null;
    const gsapTicker = {
      add: (cb: typeof registered) => {
        registered = cb;
      },
      remove: vi.fn(),
    };
    const seen: number[] = [];
    const off = ticker.add((f) => seen.push(f.time));
    const handle = shareGsapTicker(gsapTicker);
    registered!(1.5, 16, 1);
    expect(seen.at(-1)).toBe(1500);
    handle.dispose();
    off();
    expect(gsapTicker.remove).toHaveBeenCalled();
  });

  it('fromGsap / fromMotion map progress onto the foreign playhead', () => {
    const gsapAnim = { progress: vi.fn(), duration: () => 2, pause: vi.fn() };
    fromGsap(gsapAnim).seek(0.25);
    expect(gsapAnim.progress).toHaveBeenCalledWith(0.25);
    const motionAnim = { time: 0, duration: 4, pause: vi.fn() };
    fromMotion(motionAnim).seek(0.5);
    expect(motionAnim.time).toBe(2);
  });
});
