import { ticker } from '@snowbros/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { defineElements } from '../src/index.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => {
  ticker.useExternalClock();
  defineElements();
});

describe('@snowbros/elements', () => {
  it('registers idempotently', () => {
    defineElements();
    expect(customElements.get('sb-pin')).toBeDefined();
    expect(customElements.get('sb-reveal-text')).toBeDefined();
  });

  it('sb-pin sticks its first child, publishes --sb-progress, and restores on removal', async () => {
    document.body.innerHTML = '<sb-pin distance="200vh"><div id="stage">x</div></sb-pin>';
    await flush();
    const host = document.querySelector('sb-pin') as HTMLElement;
    const stage = document.getElementById('stage')!;
    expect(stage.style.position).toBe('sticky');
    expect(host.style.getPropertyValue('--sb-progress')).toMatch(/^\d\.\d{4}$/);
    host.remove();
    expect(stage.style.position).toBe('');
  });

  it('sb-reveal-text splits its child accessibly', async () => {
    document.body.innerHTML = '<sb-reveal-text by="words"><h2>Cold precision</h2></sb-reveal-text>';
    await flush();
    const h2 = document.querySelector('h2')!;
    expect(h2.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(h2.textContent).toContain('Cold precision');
  });
});
