import { setMotionPreference, ticker } from '@snowbros/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  animate,
  interpolate,
  pin,
  scrollProgress,
  scrub,
  splitText,
  stagger,
  timeline,
} from '../src/index.js';

let now = 0;
const frame = (ms = 16) => {
  now += ms;
  ticker.tick(now);
};
const run = (seconds: number) => {
  const frames = Math.ceil((seconds * 1000) / 16);
  for (let i = 0; i < frames; i++) frame();
};

beforeAll(() => {
  ticker.useExternalClock();
  ticker.maxDelta = 1;
});

afterEach(() => setMotionPreference(null));

describe('interpolate', () => {
  it('handles numbers, units, colors and complex strings', () => {
    expect(interpolate(0, 10)(0.5)).toBe(5);
    expect(interpolate('0px', '100px')(0.25)).toBe('25px');
    expect(interpolate('#000', '#ffffff')(0.5)).toBe('rgba(128, 128, 128, 1)');
    expect(interpolate('inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)')(0.5)).toBe(
      'inset(50% 0% 0% 0%)',
    );
    expect(interpolate('block', 'none')(0.5)).toBe('block');
    expect(interpolate('block', 'none')(1)).toBe('none');
  });
});

describe('animate', () => {
  it('animates transform components and opacity on elements', async () => {
    const el = document.createElement('div');
    const tl = animate(el, { x: [0, 100], opacity: [0, 1] }, { duration: 0.5, ease: 'linear' });
    expect(el.style.opacity).toBe('0');
    frame();
    run(0.25);
    expect(el.style.transform).toMatch(/translate3d\((\d+(\.\d+)?)px, 0px, 0px\)/);
    run(0.5);
    expect(tl.state).toBe('finished');
    expect(el.style.transform).toBe('translate3d(100px, 0px, 0px)');
    expect(el.style.opacity).toBe('1');
    await tl.finished;
  });

  it('composes independent transform components', () => {
    const el = document.createElement('div');
    animate(el, { x: [0, 10] }, { duration: 0.1 });
    animate(el, { scale: [1, 2] }, { duration: 0.1 });
    frame();
    run(0.2);
    expect(el.style.transform).toBe('translate3d(10px, 0px, 0px) scale(2)');
  });

  it('animates plain objects (e.g. Three.js vectors, uniforms)', () => {
    const v = { x: 0, y: 5 };
    animate(v, { x: 10 }, { duration: 0.2, ease: 'linear' });
    frame();
    run(0.3);
    expect(v).toEqual({ x: 10, y: 5 });
  });

  it('skips to the end state under reduced motion', () => {
    setMotionPreference('reduced');
    const el = document.createElement('div');
    const tl = animate(el, { y: [40, 0], opacity: [0, 1] }, { duration: 2 });
    expect(tl.state).toBe('finished');
    expect(el.style.opacity).toBe('1');
  });

  it('fade policy drops spatial props under reduced motion', () => {
    setMotionPreference('reduced');
    const el = document.createElement('div');
    const tl = animate(el, { y: [40, 0], opacity: [0, 1] }, { duration: 2, reducedMotion: 'fade' });
    expect(tl.duration).toBeCloseTo(0.2);
    frame();
    run(0.3);
    expect(el.style.transform).toBe('');
    expect(el.style.opacity).toBe('1');
  });

  it('supports repeat with yoyo', () => {
    const v = { a: 0 };
    const tl = animate(
      v,
      { a: [0, 1] },
      { duration: 1, ease: 'linear', repeat: 1, yoyo: true, autoplay: false },
    );
    tl.seek(0.25);
    expect(v.a).toBeCloseTo(0.5);
    tl.seek(0.75);
    expect(v.a).toBeCloseTo(0.5);
    tl.seek(1);
    expect(v.a).toBeCloseTo(0);
  });
});

describe('timeline', () => {
  it('resolves positions, labels and keeps the right tween in control when seeking', () => {
    const v = { x: 0 };
    const tl = timeline()
      .to(v, { x: [0, 10] }, { duration: 1, ease: 'linear' })
      .label('second')
      .to(v, { x: [10, 20] }, { duration: 1, ease: 'linear' }, 'second');
    expect(tl.duration).toBe(2);
    tl.seek(0.75);
    expect(v.x).toBeCloseTo(15);
    tl.seek(0.25);
    expect(v.x).toBeCloseTo(5);
    tl.seek(1);
    expect(v.x).toBeCloseTo(20);
    tl.seek(0);
    expect(v.x).toBeCloseTo(0);
  });

  it('supports relative and overlap positions', () => {
    const a = { v: 0 };
    const tl = timeline()
      .to(a, { v: 1 }, { duration: 1 })
      .to(a, { v: 2 }, { duration: 1 }, '-=0.5')
      .to(a, { v: 3 }, { duration: 1 }, '<');
    // '-=0.5' → 0.5 (relative to timeline end), '<' → start of previous (0.5).
    expect(tl.duration).toBeCloseTo(1.5);
  });

  it('fires callbacks when the playhead crosses them', () => {
    const fn = vi.fn();
    const tl = timeline().to({ v: 0 }, { v: 1 }, { duration: 1 }).call(fn, 0.5);
    tl.seek(0.2);
    expect(fn).not.toHaveBeenCalled();
    tl.seek(0.6);
    tl.seek(0.9);
    expect(fn).toHaveBeenCalledTimes(1);
    tl.seek(0.1);
    tl.seek(0.8);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('plays, reverses and resolves finished', async () => {
    const v = { x: 0 };
    const tl = timeline().to(v, { x: [0, 1] }, { duration: 0.2 });
    tl.play();
    frame();
    run(0.3);
    expect(v.x).toBe(1);
    await tl.finished;
    tl.reverse();
    frame();
    run(0.3);
    expect(v.x).toBe(0);
  });
});

describe('stagger', () => {
  it('distributes from center', () => {
    const s = stagger(0.1, { from: 'center' });
    expect([0, 1, 2, 3, 4].map((i) => Number(s(i, 5).toFixed(2)))).toEqual([0.2, 0.1, 0, 0.1, 0.2]);
  });

  it('distributes over a grid', () => {
    const s = stagger(1, { grid: [3, 3], from: 'center' });
    expect(s(4, 9)).toBe(0);
    expect(s(0, 9)).toBeCloseTo(Math.SQRT2);
  });
});

describe('splitText', () => {
  it('splits words and chars accessibly and reverts', () => {
    const h = document.createElement('h1');
    h.innerHTML = 'Snow <em>bros</em> 👋🏽';
    document.body.appendChild(h);
    const split = splitText(h, { by: ['words', 'chars'] });
    expect(split.words).toHaveLength(3);
    expect(split.chars.map((c) => c.textContent)).toEqual([
      'S',
      'n',
      'o',
      'w',
      'b',
      'r',
      'o',
      's',
      '👋🏽',
    ]);
    const hidden = h.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
    expect(h.textContent).toContain('Snow bros');
    expect(h.querySelector('em')).not.toBeNull();
    split.revert();
    expect(h.innerHTML).toBe('Snow <em>bros</em> 👋🏽');
    h.remove();
  });

  it('never hides interactive content and refuses chars', () => {
    const p = document.createElement('p');
    p.innerHTML = 'Read <a href="#">the docs</a>';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const split = splitText(p, { by: ['chars'] });
    expect(p.querySelector('[aria-hidden]')).toBeNull();
    expect(split.chars).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('scroll', () => {
  const layout = (el: HTMLElement, top: number, height: number) => {
    Object.defineProperty(el, 'offsetTop', { configurable: true, get: () => top });
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => height });
    Object.defineProperty(el, 'offsetParent', { configurable: true, get: () => null });
  };
  const setScroll = (y: number) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
    window.dispatchEvent(new Event('scroll'));
    frame();
  };

  it('computes progress from cached layout and updates on scroll', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    const el = document.createElement('section');
    document.body.appendChild(el);
    layout(el, 2000, 1000);
    setScroll(0);
    const p = scrollProgress(el, { start: 'top bottom', end: 'bottom top' });
    expect(p.range).toEqual({ start: 1000, end: 3000 });
    setScroll(2000);
    expect(p.get()).toBeCloseTo(0.5);
    setScroll(5000);
    expect(p.get()).toBe(1);
    const q = scrollProgress(el, { start: 'top 80%', end: 'center center' });
    expect(q.range).toEqual({ start: 1200, end: 2000 });
    p.dispose();
    q.dispose();
    el.remove();
  });

  it('pin() applies sticky styles and restores them', () => {
    const section = document.createElement('section');
    const stage = document.createElement('div');
    section.appendChild(stage);
    document.body.appendChild(section);
    const p = pin(section, { distance: '200vh' });
    expect(stage.style.position).toBe('sticky');
    expect(section.style.height).toContain('200vh');
    p.dispose();
    expect(stage.style.position).toBe('');
    expect(section.style.height).toBe('');
    section.remove();
  });

  it('scrub() seeks a timeline from a progress source', () => {
    let listener: (p: number) => void = () => {};
    let value = 0;
    const source = {
      get: () => value,
      subscribe: (l: (p: number) => void) => {
        listener = l;
        return () => {};
      },
    };
    const v = { x: 0 };
    const tl = timeline().to(v, { x: [0, 100] }, { duration: 1, ease: 'linear' });
    const handle = scrub(tl, source);
    value = 0.4;
    listener(0.4);
    expect(v.x).toBeCloseTo(40);
    handle.dispose();
  });
});
