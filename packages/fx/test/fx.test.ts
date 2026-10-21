import { setMotionPreference, ticker } from '@snowbros/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createCursor,
  createNoise,
  drawPath,
  imageReveal,
  magnetic,
  marquee,
  revealClipPath,
  scramble,
  spotlight,
  tilt,
} from '../src/index.js';

let now = 0;
const run = (seconds: number) => {
  const frames = Math.ceil((seconds * 1000) / 16);
  for (let i = 0; i < frames; i++) {
    now += 16;
    ticker.tick(now);
  }
};

const originalMatchMedia = window.matchMedia;
/** Pretend the device has (or lacks) a fine hovering pointer. */
const stubPointer = (fine: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('hover: hover') ? fine : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
};

const pointer = (type: string, x: number, y: number) =>
  new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });

beforeAll(() => {
  ticker.useExternalClock();
  ticker.maxDelta = 1;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  setMotionPreference(null);
});

describe('noise', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = createNoise(42);
    const b = createNoise(42);
    const c = createNoise(43);
    const pts = [
      [0.3, 1.7],
      [12.1, -4.4],
      [100.5, 33.3],
    ] as const;
    for (const [x, y] of pts) expect(a.noise2D(x, y)).toBe(b.noise2D(x, y));
    expect(pts.some(([x, y]) => a.noise2D(x, y) !== c.noise2D(x, y))).toBe(true);
  });

  it('stays within [-1, 1] and is zero at lattice points', () => {
    const n = createNoise(3);
    let min = 0;
    let max = 0;
    for (let i = 0; i < 4000; i++) {
      const x = (i * 0.137) % 50;
      const y = (i * 0.291) % 50;
      const v2 = n.noise2D(x, y);
      const v3 = n.noise3D(x, y, i * 0.01);
      min = Math.min(min, v2, v3);
      max = Math.max(max, v2, v3);
      expect(Math.abs(n.fbm2D(x, y))).toBeLessThanOrEqual(1);
    }
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    expect(max - min).toBeGreaterThan(0.5); // not degenerate
    expect(n.noise2D(3, 4)).toBe(0);
  });

  it('is continuous', () => {
    const n = createNoise(9);
    for (let i = 0; i < 200; i++) {
      const x = i * 0.173;
      expect(Math.abs(n.noise2D(x, 1.3) - n.noise2D(x + 1e-4, 1.3))).toBeLessThan(1e-2);
      expect(Math.abs(n.noise3D(x, 1.3, 2.2) - n.noise3D(x, 1.3, 2.2 + 1e-4))).toBeLessThan(1e-2);
    }
  });
});

describe('drawPath', () => {
  it('sets dasharray and seeks dashoffset; dispose restores', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path') as SVGPathElement;
    (path as unknown as { getTotalLength: () => number }).getTotalLength = () => 200;
    svg.appendChild(path);
    const d = drawPath(path);
    expect(d.lengths).toEqual([200]);
    expect(path.style.strokeDasharray).toMatch(/200(px)?,? 200/);
    expect(path.style.strokeDashoffset).toMatch(/^200/);
    d.seek(0.25);
    expect(path.style.strokeDashoffset).toMatch(/^150/);
    d.seek(1);
    expect(path.style.strokeDashoffset).toMatch(/^0/);
    d.dispose();
    expect(path.style.strokeDasharray).toBe('');
  });

  it('follows a progress source', () => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path') as SVGPathElement;
    (path as unknown as { getTotalLength: () => number }).getTotalLength = () => 100;
    let l: (p: number) => void = () => {};
    const d = drawPath(path, {
      get: () => 0,
      subscribe: (fn) => {
        l = fn;
        return () => {};
      },
    });
    l(0.5);
    expect(path.style.strokeDashoffset).toMatch(/^50/);
    d.dispose();
  });
});

describe('imageReveal', () => {
  it('produces clip paths for each origin', () => {
    expect(revealClipPath('bottom', 0.5)).toBe('inset(50% 0% 0% 0%)');
    expect(revealClipPath('top', 0.5)).toBe('inset(0% 0% 50% 0%)');
    expect(revealClipPath('left', 0.25)).toBe('inset(0% 75% 0% 0%)');
    expect(revealClipPath('right', 0.25)).toBe('inset(0% 0% 0% 75%)');
    expect(revealClipPath('center', 0)).toBe('inset(50% 50% 50% 50%)');
    expect(revealClipPath('bottom', 1)).toBe('inset(0% 0% 0% 0%)');
  });

  it('seeks clip and inner scale, and restores on dispose', () => {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    fig.appendChild(img);
    const r = imageReveal(fig, { from: 'left' });
    r.seek(0.5);
    expect(fig.style.clipPath).toBe('inset(0% 50% 0% 0%)');
    expect(img.style.transform).toBe('scale(1.1)');
    r.dispose();
    expect(fig.style.clipPath).toBe('');
    expect(img.style.transform).toBe('');
  });

  it('play() jumps to the end under reduced motion', async () => {
    setMotionPreference('reduced');
    const fig = document.createElement('figure');
    const r = imageReveal(fig);
    await r.play();
    expect(fig.style.clipPath).toBe('inset(0% 0% 0% 0%)');
    r.dispose();
  });
});

describe('marquee', () => {
  it('clones content as aria-hidden + inert and restores on dispose', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span>One</span><span>Two</span>';
    document.body.appendChild(el);
    const m = marquee(el);
    const groups = el.querySelectorAll('.sb-marquee-group');
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const clones = Array.from(groups).slice(1);
    for (const c of clones) {
      expect(c.getAttribute('aria-hidden')).toBe('true');
      expect(c.hasAttribute('inert')).toBe(true);
    }
    expect(groups[0]!.hasAttribute('aria-hidden')).toBe(false);
    m.dispose();
    expect(el.innerHTML).toBe('<span>One</span><span>Two</span>');
    el.remove();
  });

  it('moves while running and stops when paused', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span>x</span>';
    document.body.appendChild(el);
    const m = marquee(el, { speed: 100 });
    const track = el.querySelector<HTMLElement>('.sb-marquee-track')!;
    run(0.2);
    const moved = track.style.transform;
    expect(moved).toMatch(/translate3d\(-\d/);
    m.pause();
    expect(m.paused).toBe(true);
    run(0.2);
    expect(track.style.transform).toBe(moved);
    m.dispose();
    el.remove();
  });

  it('is static under reduced motion', () => {
    setMotionPreference('reduced');
    const el = document.createElement('div');
    el.textContent = 'static';
    const m = marquee(el);
    expect(m.paused).toBe(true);
    m.play();
    expect(m.paused).toBe(true);
    m.dispose();
  });
});

describe('scramble', () => {
  it('keeps real text for assistive tech and ends on the exact final text', async () => {
    const h = document.createElement('h2');
    h.textContent = 'SNOW BROS';
    const s = scramble(h, { duration: 0.3, trigger: 'manual' });
    const [sr, visual] = Array.from(h.children) as HTMLElement[];
    expect(sr!.textContent).toBe('SNOW BROS');
    expect(sr!.getAttribute('style')).toContain('clip');
    expect(visual!.getAttribute('aria-hidden')).toBe('true');
    const done = s.play();
    run(0.1);
    run(0.4);
    await done;
    expect(visual!.textContent).toBe('SNOW BROS');
    s.dispose();
    expect(h.innerHTML).toBe('SNOW BROS');
  });

  it('is instant under reduced motion', async () => {
    setMotionPreference('reduced');
    const p = document.createElement('p');
    p.textContent = 'Hello';
    const s = scramble(p, { trigger: 'manual' });
    await s.play();
    expect(p.querySelector('[aria-hidden]')!.textContent).toBe('Hello');
    s.dispose();
  });
});

describe('pointer effects', () => {
  it('magnetic moves toward the pointer and restores styles', () => {
    stubPointer(true);
    const btn = document.createElement('button');
    btn.style.transform = 'rotate(1deg)';
    document.body.appendChild(btn);
    const m = magnetic(btn, { strength: 0.5 });
    window.dispatchEvent(pointer('pointermove', 20, 10));
    run(1);
    expect(btn.style.transform).toBe('translate3d(10px, 5px, 0)');
    m.dispose();
    m.dispose();
    expect(btn.style.transform).toBe('rotate(1deg)');
    btn.remove();
  });

  it('magnetic and tilt are no-ops on coarse pointers', () => {
    stubPointer(false);
    const el = document.createElement('div');
    document.body.appendChild(el);
    const m = magnetic(el);
    const t = tilt(el);
    window.dispatchEvent(pointer('pointermove', 20, 10));
    el.dispatchEvent(pointer('pointermove', 20, 10));
    run(0.5);
    expect(el.style.transform).toBe('');
    m.dispose();
    t.dispose();
    el.remove();
  });

  it('tilt rotates and restores on dispose', () => {
    stubPointer(true);
    const card = document.createElement('div');
    document.body.appendChild(card);
    const t = tilt(card, { glare: true });
    expect(card.querySelector('[aria-hidden]')).not.toBeNull();
    card.dispatchEvent(pointer('pointermove', 10, 10));
    run(0.5);
    expect(card.style.transform).toContain('perspective(800px)');
    t.dispose();
    expect(card.style.transform).toBe('');
    expect(card.querySelector('[aria-hidden]')).toBeNull();
    card.remove();
  });

  it('spotlight sets CSS variables relative to the element', () => {
    stubPointer(true);
    const card = document.createElement('div');
    document.body.appendChild(card);
    const s = spotlight(card, { radius: 200, color: 'white' });
    expect(card.style.getPropertyValue('--sb-spot-r')).toBe('200px');
    card.dispatchEvent(pointer('pointerenter', 0, 0));
    card.dispatchEvent(pointer('pointermove', 30, 40));
    expect(card.style.getPropertyValue('--sb-x')).toBe('30px');
    expect(card.style.getPropertyValue('--sb-y')).toBe('40px');
    expect(card.style.getPropertyValue('--sb-spot-opacity')).toBe('1');
    s.dispose();
    expect(card.style.getPropertyValue('--sb-x')).toBe('');
    card.remove();
  });

  it('cursor follows, switches states via data-cursor and is removed on dispose', () => {
    stubPointer(true);
    const link = document.createElement('a');
    link.setAttribute('data-cursor', 'view');
    document.body.appendChild(link);
    const c = createCursor({ states: { view: { scale: 4, label: 'View' } } });
    expect(c.element?.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.style.cursor).toBe('');
    document.body.dispatchEvent(pointer('pointermove', 50, 60));
    link.dispatchEvent(pointer('pointerover', 50, 60));
    run(1);
    expect(c.element!.textContent).toBe('View');
    expect(c.element!.style.transform).toBe('translate3d(50px, 60px, 0) scale(4)');
    c.dispose();
    expect(document.querySelector('.sb-cursor')).toBeNull();
    link.remove();
  });

  it('cursor is not created on touch devices', () => {
    stubPointer(false);
    const c = createCursor();
    expect(c.element).toBeNull();
    c.dispose();
  });
});

describe('dispose idempotency', () => {
  it('all handles survive double dispose', () => {
    stubPointer(true);
    const el = document.createElement('div');
    el.textContent = 'x';
    const handles = [magnetic(el), tilt(el), spotlight(el), imageReveal(el), marquee(el)];
    for (const h of handles) {
      h.dispose();
      expect(() => h.dispose()).not.toThrow();
    }
    vi.restoreAllMocks();
  });
});
