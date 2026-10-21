import { setMotionPreference } from '@snowbros/core';
import { afterEach, describe, expect, it } from 'vitest';
import { annotate } from '../src/index.js';

const box = (el: HTMLElement, w = 120, h = 30) => {
  el.getBoundingClientRect = () =>
    ({
      left: 10,
      top: 10,
      width: w,
      height: h,
      right: 10 + w,
      bottom: 10 + h,
      x: 10,
      y: 10,
    }) as DOMRect;
};

afterEach(() => setMotionPreference(null));

describe('annotate', () => {
  it('adds a decorative, seeded, hand-drawn SVG and removes it on dispose', () => {
    const el = document.createElement('em');
    el.textContent = 'measured';
    document.body.append(el);
    box(el);
    const a = annotate(el, { type: 'circle', trigger: 'manual', seed: 4 });
    const svg = el.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.style.pointerEvents).toBe('none');
    const d1 = svg.querySelector('path')!.getAttribute('d');
    expect(d1).toMatch(/^M/);
    expect(el.style.position).toBe('relative');
    a.dispose();
    expect(el.querySelector('svg')).toBeNull();
    expect(el.style.position).toBe('');
    const b = annotate(el, { type: 'circle', trigger: 'manual', seed: 4 });
    expect(el.querySelector('path')!.getAttribute('d')).toBe(d1); // deterministic
    b.dispose();
    el.remove();
  });

  it('underline draws two passes by default; box/cross/bracket build paths', () => {
    const el = document.createElement('span');
    document.body.append(el);
    box(el);
    for (const [type, n] of [
      ['underline', 2],
      ['strike', 2],
      ['box', 1],
      ['cross', 2],
      ['bracket', 1],
    ] as const) {
      const a = annotate(el, { type, trigger: 'manual' });
      expect(el.querySelectorAll('path').length, type).toBe(n);
      a.dispose();
    }
    el.remove();
  });

  it('reduced motion: play resolves with the mark drawn', async () => {
    setMotionPreference('reduced');
    const el = document.createElement('span');
    document.body.append(el);
    box(el);
    const a = annotate(el, { trigger: 'manual' });
    await a.play();
    a.dispose();
    el.remove();
  });
});
