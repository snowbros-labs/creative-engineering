import { afterEach, describe, expect, it, vi } from 'vitest';
import { haptic, hapticPatterns, setHapticsEnabled, setMotionPreference } from '../src/index.js';

const nav = navigator as unknown as { vibrate?: unknown };

afterEach(() => {
  setHapticsEnabled(true);
  setMotionPreference(null);
  delete nav.vibrate;
  vi.useRealTimers();
});

describe('haptic', () => {
  it('is a safe no-op without the Vibration API', () => {
    delete nav.vibrate;
    expect(haptic('tick')).toBe(false);
  });

  it('vibrates with the named pattern and throttles repeats', () => {
    const vibrate = vi.fn(() => true);
    nav.vibrate = vibrate;
    expect(haptic('success')).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(hapticPatterns.success);
    expect(haptic('success')).toBe(false); // within the throttle window
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('respects the app switch and reduced motion', () => {
    const vibrate = vi.fn(() => true);
    nav.vibrate = vibrate;
    setHapticsEnabled(false);
    expect(haptic('press')).toBe(false);
    setHapticsEnabled(true);
    setMotionPreference('reduced');
    expect(haptic('press')).toBe(false);
    expect(haptic('press', { ignoreReducedMotion: true })).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('accepts raw patterns and survives a throwing implementation', () => {
    nav.vibrate = vi.fn(() => {
      throw new Error('blocked');
    });
    expect(haptic([5, 5, 5])).toBe(false);
  });
});
