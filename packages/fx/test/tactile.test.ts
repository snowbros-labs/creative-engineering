import { setMotionPreference, ticker } from '@snowbros/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { pressable, proximity } from '../src/index.js';

let now = 0;
const run = (seconds: number) => {
  const frames = Math.ceil((seconds * 1000) / 16);
  for (let i = 0; i < frames; i++) {
    now += 16;
    ticker.tick(now);
  }
};
const originalMatchMedia = window.matchMedia;
const stubPointer = (fine: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('hover: hover') ? fine : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
};
const place = (el: HTMLElement, left: number, top: number) => {
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      width: 20,
      height: 20,
      right: left + 20,
      bottom: top + 20,
      x: left,
      y: top,
    }) as DOMRect;
};

beforeAll(() => {
  ticker.useExternalClock();
  ticker.maxDelta = 1;
});
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  setMotionPreference(null);
  delete (navigator as { vibrate?: unknown }).vibrate;
});

describe('proximity', () => {
  it('writes eased 0..1 by distance, nearest highest, and cleans up', () => {
    stubPointer(true);
    const near = document.createElement('span');
    const far = document.createElement('span');
    document.body.append(near, far);
    place(near, 0, 0);
    place(far, 400, 0);
    const p = proximity([near, far], { radius: 200 });
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));
    run(1);
    expect(Number(near.style.getPropertyValue('--sb-proximity'))).toBeCloseTo(1, 2);
    expect(Number(far.style.getPropertyValue('--sb-proximity'))).toBe(0);
    p.dispose();
    expect(near.style.getPropertyValue('--sb-proximity')).toBe('');
    near.remove();
    far.remove();
  });

  it('is inactive on coarse pointers', () => {
    stubPointer(false);
    const el = document.createElement('span');
    document.body.append(el);
    place(el, 0, 0);
    const p = proximity(el);
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));
    run(0.5);
    expect(el.style.getPropertyValue('--sb-proximity')).toBe('');
    p.dispose();
    el.remove();
  });
});

describe('pressable', () => {
  it('snaps down on press, springs back on release, commits, vibrates if available', () => {
    const vibrate = vi.fn(() => true);
    (navigator as { vibrate?: unknown }).vibrate = vibrate;
    const btn = document.createElement('button');
    document.body.append(btn);
    const onPress = vi.fn();
    const p = pressable(btn, { onPress });
    btn.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    expect(btn.style.getPropertyValue('--sb-press')).toBe('1');
    expect(btn.dataset.pressed).toBe('true');
    expect(vibrate).toHaveBeenCalledTimes(1);
    btn.dispatchEvent(new MouseEvent('pointerup'));
    expect(onPress).toHaveBeenCalledTimes(1);
    run(1.5);
    expect(Math.abs(Number(btn.style.getPropertyValue('--sb-press')))).toBeLessThan(0.01);
    p.dispose();
    expect(btn.style.getPropertyValue('--sb-press')).toBe('');
    btn.remove();
  });

  it('works from the keyboard and cancels when the pointer leaves', () => {
    const btn = document.createElement('button');
    document.body.append(btn);
    const onPress = vi.fn();
    const p = pressable(btn, { onPress, haptic: null });
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    btn.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    btn.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    btn.dispatchEvent(new MouseEvent('pointerleave'));
    expect(onPress).toHaveBeenCalledTimes(1);
    setMotionPreference('reduced');
    btn.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    btn.dispatchEvent(new MouseEvent('pointerup'));
    expect(btn.style.getPropertyValue('--sb-press')).toBe('0');
    p.dispose();
    btn.remove();
  });
});
