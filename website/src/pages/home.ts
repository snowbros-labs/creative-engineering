/**
 * Flagship page. Built following the snowbros-creative skill:
 * - Direction: precise, calm, credible; one memorable idea — "one clock": every scene is driven by
 *   a single progress value from native scroll.
 * - Reduced-motion policy per pattern (skill hard rule 4) is noted next to each pattern below.
 */
import '../styles/base.css';
import '../styles/home.css';
import {
  createMediaContext,
  createSignal,
  motionPreference,
  prefersReducedMotion,
  segment,
} from '@snowbros/core';
import { flowField, imageReveal, magnetic, marquee } from '@snowbros/fx';
import {
  flip,
  horizontalScroll,
  pin,
  revealText,
  scrollProgress,
  scrollVelocity,
  scrub,
  splitText,
} from '@snowbros/motion';
import { brandMark, initShell } from '../shell.js';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const shell = initShell();
const brand = $('[data-brand]');
if (brand) brand.insertAdjacentHTML('afterbegin', brandMark);

// ----------------------------------------------------------------- 01 hero
// Title: masked line rise on load. Reduced motion → short fade (reveal default policy `fade`).
const heroTitle = $('.hero-title');
if (heroTitle)
  shell.add(revealText(heroTitle, { by: 'lines', preset: 'rise', trigger: 'load', delay: 0.15 }));

// Snow-drift flow field. Reduced motion → one static frame (fx policy).
const heroField = $<HTMLCanvasElement>('.hero-field');
if (heroField) {
  shell.add(
    flowField(heroField, {
      color: 'rgba(11, 12, 14, 0.07)',
      density: 0.6,
      speed: 0.5,
      lineWidth: 1,
      fade: 0.035,
      seed: 7,
    }),
  );
}

// Magnetic CTAs on fine pointers only (fx no-ops on touch).
for (const el of $$('[data-magnetic]')) shell.add(magnetic(el, { strength: 0.25, radius: 40 }));

// ----------------------------------------------------------------- 02 manifesto
// Words light up as the paragraph passes through the viewport. Reduced motion → keep (text fully
// visible, no scroll coupling) — the effect is decorative.
const manifesto = $('[data-scroll-words]');
if (manifesto) {
  shell.add(
    createMediaContext({
      'full-motion': (scope) => {
        const split = splitText(manifesto, { by: ['words'] });
        scope.add(() => split.revert());
        const words = split.words;
        const p = scrollProgress(manifesto, { start: 'top 85%', end: 'bottom 45%' });
        scope.add(p);
        const n = words.length;
        const paint = (v: number) => {
          words.forEach((w, i) => {
            const t = segment(v, i / n - 0.04, (i + 1) / n + 0.04);
            w.style.opacity = String(0.16 + t * 0.84);
          });
        };
        paint(p.get());
        scope.add(p.subscribe(paint));
      },
    }),
  );
}

// ----------------------------------------------------------------- 03 pinned story
const story = $('#story');
const storyCanvas = $('.story-canvas');
const chapters = $$('.chapter');
const progressBar = $('.story-progress span');
const readout = $('[data-readout]');

/** The one clock for the story: everything below reads this value. */
const storyClock = createSignal(0);

function paintStory(v: number) {
  chapters.forEach((ch, i) => {
    // Each chapter owns a third; crossfade with a short overlap so text never jumps.
    const enter = segment(v, i / 3 - 0.06, i / 3 + 0.04);
    const exit = i === chapters.length - 1 ? 0 : segment(v, (i + 1) / 3 - 0.06, (i + 1) / 3 + 0.02);
    const o = i === 0 ? 1 - exit : enter * (1 - exit);
    ch.style.opacity = String(o);
    ch.style.transform = `translate3d(0, ${(1 - enter) * 24 * (i === 0 ? 0 : 1) - exit * 24}px, 0)`;
    ch.toggleAttribute('data-active', o > 0.5);
  });
  if (progressBar) progressBar.style.transform = `scaleY(${v})`;
  if (readout) readout.textContent = v.toFixed(3);
}

if (story) {
  shell.add(
    createMediaContext({
      // Desktop + full motion: pin for 260vh and scrub everything from one progress.
      '(min-width: 800px) and full-motion': (scope) => {
        story.dataset.mode = 'pinned';
        const p = pin(story, { distance: '260vh' });
        scope.add(p);
        scope.add(
          scrub({ duration: 0, seek: (v) => storyClock.set(v) }, p.progress, { smooth: 9 }),
        );
        scope.add(() => {
          delete story.dataset.mode;
          for (const ch of chapters) {
            ch.style.opacity = '';
            ch.style.transform = '';
            ch.removeAttribute('data-active');
          }
        });
      },
    }),
  );
  shell.add(storyClock.subscribe(paintStory));
}

// 3D crystal: lazy-loaded when near the viewport, static SVG fallback without WebGL.
// Reduced motion → still renders (static, render-on-demand), camera holds chapter 1 pose.
if (storyCanvas) {
  import('./home-scene.js').then(({ mountCrystal }) => {
    shell.add(mountCrystal(storyCanvas, storyClock));
  });
}

// ----------------------------------------------------------------- 04 package rail
// Desktop + full motion → vertical scroll drives the rail. Otherwise → native horizontal
// scroll-snap list (CSS default), which is the better touch pattern anyway.
const packages = $('#packages');
const rail = $('[data-rail]');
if (packages && rail) {
  shell.add(
    createMediaContext({
      '(min-width: 900px) and full-motion': (scope) => {
        packages.dataset.mode = 'horizontal';
        scope.add(horizontalScroll(packages, rail, { smooth: 10 }));
        scope.add(() => delete packages.dataset.mode);
      },
    }),
  );
}

// ----------------------------------------------------------------- 05 functional vs expressive
// Functional: FLIP sort in 240 ms with the emphasized curve. Reduced motion → instant (flip policy).
const sortBtn = $<HTMLButtonElement>('[data-sort]');
const list = $('[data-mini-list]');
if (sortBtn && list) {
  let ascending = false;
  shell.listen(sortBtn, 'click', async () => {
    ascending = !ascending;
    const items = $$<HTMLLIElement>('li', list);
    await flip(
      items,
      () => {
        const sorted = items.sort(
          (a, b) => (Number(a.dataset.p) - Number(b.dataset.p)) * (ascending ? 1 : -1),
        );
        for (const li of sorted) list.appendChild(li);
      },
      { duration: 0.24, ease: 'cubic-bezier(0.2, 0, 0, 1)' },
    );
    sortBtn.textContent = ascending ? 'Sort: lowest first' : 'Sort by priority';
  });
}

// Expressive: clip-path reveal + counter-scale scrubbed by scroll; live procedural "image".
// Reduced motion → final state (fully revealed).
const figure = $('[data-image-reveal]');
const media = $('.reveal-media');
const drift = $<HTMLCanvasElement>('.drift-canvas');
if (drift) {
  shell.add(
    flowField(drift, {
      color: 'rgba(243, 242, 238, 0.12)',
      density: 1,
      speed: 0.8,
      fade: 0.05,
      seed: 21,
    }),
  );
}
if (figure && media) {
  const reveal = imageReveal(media, { from: 'bottom', scale: 1.25 });
  shell.add(reveal);
  shell.add(
    createMediaContext({
      'full-motion': (scope) => {
        const p = scrollProgress(figure, { start: 'top 90%', end: 'center 55%' });
        scope.add(p);
        scope.add(scrub(reveal, p, { smooth: 8 }));
      },
      'reduced-motion': () => reveal.seek(1),
    }),
  );
}

// ----------------------------------------------------------------- 06 install: copy buttons
const status = $('[data-copy-status]');
for (const btn of $$<HTMLButtonElement>('[data-copy]')) {
  shell.listen(btn, 'click', async () => {
    const code = $(`[data-code="${btn.dataset.copy}"]`)?.textContent ?? '';
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      // Clipboard blocked: select the text so the user can copy manually.
      const target = $(`[data-code="${btn.dataset.copy}"]`);
      if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    if (status)
      status.textContent = ok
        ? 'Copied to clipboard.'
        : 'Copy blocked — text selected, press Ctrl/⌘ + C.';
    btn.textContent = ok ? 'Copied' : 'Select';
    window.setTimeout(() => {
      btn.textContent = 'Copy';
    }, 1600);
  });
}

// ----------------------------------------------------------------- 07 footer marquee
// Speed boosted by scroll velocity. Reduced motion → static (fx policy), with a pause on hover.
const marqueeEl = $('[data-marquee]');
if (marqueeEl) {
  const velocity = scrollVelocity();
  shell.add(velocity);
  shell.add(marquee(marqueeEl, { speed: 40, pauseOnHover: true, velocityBoost: velocity }));
}

// Keep the static fallback honest if preference flips at runtime.
shell.add(
  motionPreference.subscribe(() => {
    document.documentElement.dataset.motion = prefersReducedMotion() ? 'reduced' : 'full';
  }),
);
document.documentElement.dataset.motion = prefersReducedMotion() ? 'reduced' : 'full';

// Dev aid: dispose everything on HMR so effects never duplicate (skill hard rule 8).
if (import.meta.hot) import.meta.hot.dispose(() => shell.dispose());
