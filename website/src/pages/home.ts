/**
 * Flagship page orchestrator. Built with the snowbros-creative skill workflow:
 * direction + plan in docs/briefs/FLAGSHIP_DIRECTION.md. Every effect is registered on the shell
 * scope (or a child) so HMR and media-query changes never duplicate work (skill hard rule 8).
 */
import '../styles/base.css';
import '../styles/home.css';
import {
  createMediaContext,
  createSignal,
  motionPreference,
  prefersReducedMotion,
  type Scope,
  segment,
} from '@snowbros/core';
import { magnetic, marquee } from '@snowbros/fx';
import { inView, scrollProgress, scrollVelocity, splitText } from '@snowbros/motion';
import { initInstrument } from '../sections/instrument.js';
import { initSystem } from '../sections/system.js';
import { brandMark, initShell } from '../shell.js';
import { initCopyButtons } from '../ui/copy.js';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const syncMotionAttr = () => {
  document.documentElement.dataset.motion = prefersReducedMotion() ? 'reduced' : 'full';
};
syncMotionAttr();

const shell = initShell();
shell.add(motionPreference.subscribe(syncMotionAttr));
const brand = $('[data-brand]');
if (brand) brand.insertAdjacentHTML('afterbegin', brandMark);

// ----------------------------------------------------------------- page clock + nav state
// One passive progress source for the whole document; the hairline reads it directly.
const bar = $('[data-page-progress]');
const page = scrollProgress(document.documentElement, { start: 'top top', end: 'bottom bottom' });
shell.add(page);
if (bar) shell.add(page.subscribe((v) => (bar.style.transform = `scaleX(${v})`)));

const header = $('.site-header');
if (header) {
  shell.listen(
    window,
    'scroll',
    () => {
      header.dataset.scrolled = String(window.scrollY > 8);
    },
    { passive: true },
  );
}

// Current-section marker in the nav (aria-current would mislabel in-page anchors).
const navLinks = $$<HTMLAnchorElement>('[data-nav]');
for (const link of navLinks) {
  const target = $(link.hash);
  if (!target) continue;
  shell.add(
    inView(
      target,
      () => {
        for (const l of navLinks) l.dataset.active = String(l === link);
        return () => {
          link.dataset.active = 'false';
        };
      },
      // A thin band at mid-viewport: works for 6-viewport pinned sections and short ones alike.
      { amount: 0, margin: '-50% 0px -50% 0px', once: false },
    ),
  );
}

// Magnetic CTAs on fine pointers only (fx no-ops on touch and under reduced motion).
for (const el of $$('[data-magnetic]')) shell.add(magnetic(el, { strength: 0.25, radius: 40 }));

// ----------------------------------------------------------------- 01 instrument
const clock = createSignal(0);
initInstrument(shell, clock);

// ----------------------------------------------------------------- 02 thesis
// Words ink in as the paragraph crosses the viewport. Reduced motion → keep (fully legible).
const thesis = $('[data-scroll-words]');
if (thesis) {
  shell.add(
    createMediaContext({
      'full-motion': (scope) => {
        const split = splitText(thesis, { by: ['words'] });
        scope.add(() => split.revert());
        const p = scrollProgress(thesis, { start: 'top 85%', end: 'bottom 50%' });
        scope.add(p);
        const n = split.words.length;
        const paint = (v: number) => {
          split.words.forEach((w, i) => {
            w.style.opacity = String(0.18 + segment(v, i / n - 0.04, (i + 1) / n + 0.04) * 0.82);
          });
        };
        paint(p.get());
        scope.add(p.subscribe(paint));
      },
    }),
  );
}

// ----------------------------------------------------------------- 03 labs (lazy)
// Each lab loads its code when it approaches the viewport; heavy 3D stays out of first paint.
const labs: Record<string, () => Promise<{ init(root: HTMLElement, scope: Scope): void }>> = {
  motion: () => import('../labs/motion-lab.js'),
  interaction: () => import('../labs/interaction-lab.js'),
  space: () => import('../labs/space-lab.js'),
  interface: () => import('../labs/interface-lab.js'),
  effects: () => import('../labs/effects-lab.js'),
};
for (const root of $$('[data-lab]')) {
  const load = labs[root.dataset.lab ?? ''];
  if (!load) continue;
  const labScope = shell.child();
  let started = false;
  labScope.add(
    inView(
      root,
      () => {
        if (started) return;
        started = true;
        load()
          .then((m) => m.init(root, labScope))
          .catch((error) => {
            console.error(`[site] ${root.dataset.lab} lab failed to load`, error);
            root.dataset.labError = 'true';
          });
      },
      { amount: 0, margin: '400px 0px' },
    ),
  );
}

// ----------------------------------------------------------------- 04 system, 05 start
initSystem(shell);
initCopyButtons(shell);

// ----------------------------------------------------------------- footer marquee
// Speed boosted by scroll velocity. Reduced motion → static (fx policy); pauses on hover/focus.
const marqueeEl = $('[data-marquee]');
if (marqueeEl) {
  const velocity = scrollVelocity();
  shell.add(velocity);
  shell.add(marquee(marqueeEl, { speed: 40, pauseOnHover: true, velocityBoost: velocity }));
}

// Dev aid: dispose everything on HMR so effects never duplicate.
if (import.meta.hot) import.meta.hot.dispose(() => shell.dispose());
