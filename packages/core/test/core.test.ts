import { describe, expect, it, vi } from 'vitest';
import {
  clamp,
  createScope,
  createSignal,
  createSpringValue,
  createTicker,
  cubicBezier,
  damp,
  derive,
  eases,
  mapRange,
  resolveEase,
  segment,
  springDuration,
  springEase,
  springPosition,
  toCssLinear,
  wrap,
} from '../src/index.js';

describe('math', () => {
  it('clamps and maps', () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(mapRange(5, 0, 10, 100, 200)).toBe(150);
    expect(mapRange(20, 0, 10, 0, 1)).toBe(1);
    expect(mapRange(20, 0, 10, 0, 1, false)).toBe(2);
  });

  it('wraps negative values', () => {
    expect(wrap(-1, 0, 10)).toBe(9);
    expect(wrap(25, 0, 10)).toBe(5);
  });

  it('damp is frame-rate independent', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 5, 1 / 60);
    let b = 0;
    for (let i = 0; i < 144; i++) b = damp(b, 1, 5, 1 / 144);
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
  });

  it('segment splits progress into sub-ranges', () => {
    expect(segment(0.1, 0.2, 0.4)).toBe(0);
    expect(segment(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.2, 0.4)).toBe(1);
  });
});

describe('easing', () => {
  it('cubicBezier matches endpoints and is monotonic for standard curves', () => {
    const ease = cubicBezier(0.4, 0, 0.2, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const v = ease(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('cubicBezier(0.25,0.1,0.25,1) approximates CSS ease at midpoint', () => {
    // Reference value for CSS `ease` at x=0.5 is ≈0.8024.
    expect(eases.css(0.5)).toBeCloseTo(0.8024, 3);
  });

  it('resolves names, functions and bezier strings', () => {
    expect(resolveEase('linear')(0.3)).toBe(0.3);
    const fn = (t: number) => t * t;
    expect(resolveEase(fn)).toBe(fn);
    expect(resolveEase('cubic-bezier(0, 0, 1, 1)')(0.5)).toBeCloseTo(0.5);
    // biome-ignore lint/suspicious/noExplicitAny: testing unknown input fallback
    expect(resolveEase('nope' as any)(0.5)).toBe(eases.outCubic(0.5));
  });

  it('exports CSS linear() strings', () => {
    const css = toCssLinear(eases.linear, 4);
    expect(css).toBe('linear(0, 0.25, 0.5, 0.75, 1)');
  });

  it('every named ease starts at 0 and ends at 1', () => {
    for (const [name, fn] of Object.entries(eases)) {
      expect(fn(0), name).toBeCloseTo(0, 6);
      expect(fn(1), name).toBeCloseTo(1, 6);
    }
  });
});

describe('springs', () => {
  it('starts at 0 and settles at 1', () => {
    expect(springPosition({}, 0)).toBeCloseTo(0);
    expect(springPosition({}, 5)).toBeCloseTo(1, 4);
  });

  it('bouncy springs overshoot, smooth ones barely do', () => {
    let maxBouncy = 0;
    let maxSmooth = 0;
    for (let t = 0; t < 2; t += 0.005) {
      maxBouncy = Math.max(maxBouncy, springPosition({ stiffness: 260, damping: 14 }, t));
      maxSmooth = Math.max(maxSmooth, springPosition({ stiffness: 170, damping: 26 }, t));
    }
    expect(maxBouncy).toBeGreaterThan(1.1);
    expect(maxSmooth).toBeLessThan(1.02);
  });

  it('positive initial velocity moves faster at the start', () => {
    const still = springPosition({ velocity: 0 }, 0.05);
    const moving = springPosition({ velocity: 10 }, 0.05);
    expect(moving).toBeGreaterThan(still);
  });

  it('handles critically and over-damped springs', () => {
    const k = 100;
    const critical = 2 * Math.sqrt(k);
    expect(springPosition({ stiffness: k, damping: critical }, 3)).toBeCloseTo(1, 3);
    expect(springPosition({ stiffness: k, damping: critical * 3 }, 6)).toBeCloseTo(1, 2);
  });

  it('springEase produces a normalised ease with a finite duration', () => {
    const { ease, duration } = springEase('snappy');
    expect(duration).toBeGreaterThan(0.1);
    expect(duration).toBeLessThan(2);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(springDuration({ stiffness: 60, damping: 15 })).toBeGreaterThan(duration);
  });

  it('spring value retargets while keeping velocity', () => {
    const s = createSpringValue(0, 'smooth');
    s.set(100);
    for (let i = 0; i < 10; i++) s.step(1 / 60);
    const v = s.velocity;
    expect(v).toBeGreaterThan(0);
    s.set(0);
    s.step(1 / 60);
    // Still moving forward for a moment: momentum is preserved, no snap.
    expect(s.velocity).toBeGreaterThan(0);
    for (let i = 0; i < 600; i++) s.step(1 / 60);
    expect(s.settled).toBe(true);
    expect(s.value).toBe(0);
  });
});

describe('ticker', () => {
  it('runs callbacks in priority order with clamped delta', () => {
    const t = createTicker();
    const stop = t.useExternalClock();
    const order: string[] = [];
    const deltas: number[] = [];
    t.add(() => order.push('render'), 100);
    t.add(() => order.push('input'), -100);
    t.add((f) => {
      order.push('update');
      deltas.push(f.delta);
    });
    t.tick(1000);
    t.tick(1016);
    t.tick(5000);
    expect(order.slice(0, 3)).toEqual(['input', 'update', 'render']);
    expect(deltas[0]).toBe(0);
    expect(deltas[1]).toBeCloseTo(0.016);
    expect(deltas[2]).toBe(t.maxDelta);
    stop();
  });

  it('once callbacks run a single time and removal is safe mid-frame', () => {
    const t = createTicker();
    t.useExternalClock();
    const once = vi.fn();
    t.once(once);
    let off: () => void = () => {};
    const self = vi.fn(() => off());
    off = t.add(self);
    t.tick(0);
    t.tick(16);
    expect(once).toHaveBeenCalledTimes(1);
    expect(self).toHaveBeenCalledTimes(1);
    expect(t.size).toBe(0);
  });

  it('applies timeScale', () => {
    const t = createTicker();
    t.useExternalClock();
    t.timeScale = 0.5;
    let d = 0;
    t.add((f) => {
      d = f.delta;
    });
    t.tick(0);
    t.tick(20);
    expect(d).toBeCloseTo(0.01);
  });
});

describe('scope', () => {
  it('disposes in reverse order, once, and survives failures', () => {
    const scope = createScope();
    const calls: string[] = [];
    scope.add(() => calls.push('a'));
    scope.add({ dispose: () => calls.push('b') });
    scope.add(() => {
      throw new Error('boom');
    });
    scope.add({ kill: () => calls.push('c') });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    scope.dispose();
    scope.dispose();
    expect(calls).toEqual(['c', 'b', 'a']);
    expect(err).toHaveBeenCalledOnce();
    err.mockRestore();
  });

  it('disposes late registrations immediately and aborts its signal', () => {
    const scope = createScope();
    scope.dispose();
    const late = vi.fn();
    scope.add(late);
    expect(late).toHaveBeenCalledOnce();
    expect(scope.signal.aborted).toBe(true);
  });

  it('removes listeners on dispose', () => {
    const scope = createScope();
    const handler = vi.fn();
    const el = document.createElement('button');
    scope.listen(el, 'click', handler);
    el.click();
    scope.dispose();
    el.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('child scopes detach when disposed early', () => {
    const parent = createScope();
    const childCleanup = vi.fn();
    const child = parent.child();
    child.add(childCleanup);
    child.dispose();
    parent.dispose();
    expect(childCleanup).toHaveBeenCalledOnce();
  });
});

describe('signal', () => {
  it('notifies on change only and derives values', () => {
    const s = createSignal(1);
    const d = derive(s, (v) => v * 2);
    const seen: number[] = [];
    const off = d.subscribe((v) => seen.push(v));
    s.set(1);
    s.set(3);
    off();
    s.set(4);
    expect(seen).toEqual([6]);
    expect(d.get()).toBe(8);
  });
});
