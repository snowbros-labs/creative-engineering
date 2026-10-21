/**
 * Flagship page orchestrator. Built with the snowbros-creative skill workflow:
 * direction + plan in docs/briefs/FLAGSHIP_DIRECTION.md. Every effect is registered on the shell
 * scope (or a child) so HMR and media-query changes never duplicate work (skill hard rule 8).
 */
import '../styles/base.css';
import '../styles/home.css';
import {
  canVibrate,
  createMediaContext,
  createSignal,
  motionPreference,
  prefersReducedMotion,
  type Scope,
  segment,
  setHapticsEnabled,
} from '@snowbros/core';
import { createCursor, magnetic, marquee, pressable, proximity } from '@snowbros/fx';
import { inView, scrollProgress, scrollVelocity } from '@snowbros/motion';
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

// Every control has physical press depth (+ an optional haptic tick on supporting phones).
// Armed lazily on hover/focus (which always precede press), so controls that labs render later
// are covered without a MutationObserver.
const pressed = new WeakSet<Element>();
const PRESSABLE = '.btn, .node, .lab-index a, .bar';
const armPress = (e: Event) => {
  const el = (e.target as Element | null)?.closest<HTMLElement>(PRESSABLE);
  if (!el || pressed.has(el)) return;
  pressed.add(el);
  shell.add(pressable(el, { haptic: el.matches('.bar') ? 'select' : 'press' }));
};
shell.listen(document, 'pointerover', armPress, { passive: true });
shell.listen(document, 'focusin', armPress);

// Haptics are opt-out and only offered where the device can vibrate. Never essential.
const hapticsBtn = $<HTMLButtonElement>('[data-haptics-toggle]');
if (hapticsBtn && canVibrate()) {
  let on = true;
  try {
    on = localStorage.getItem('sb-haptics') !== 'off';
  } catch {
    // storage blocked: default on
  }
  const sync = () => {
    setHapticsEnabled(on);
    hapticsBtn.setAttribute('aria-pressed', String(on));
    hapticsBtn.textContent = `Haptics: ${on ? 'on' : 'off'}`;
  };
  hapticsBtn.hidden = false;
  sync();
  shell.listen(hapticsBtn, 'click', () => {
    on = !on;
    try {
      localStorage.setItem('sb-haptics', on ? 'on' : 'off');
    } catch {
      // ignore
    }
    sync();
  });
}

// Cursor follower names what the pointer can do here. Augments, never hides, the native cursor.
shell.add(
  createCursor({
    size: 10,
    states: {
      strum: { scale: 6.4, label: 'Strum' },
      drag: { scale: 5.6, label: 'Drag' },
      open: { scale: 5.6, label: 'Open' },
      play: { scale: 5.6, label: 'Play' },
    },
  }),
);

// ----------------------------------------------------------------- 01 instrument
const clock = createSignal(0);
initInstrument(shell, clock);

// ----------------------------------------------------------------- 02 thesis
// Two voices: grotesk words thicken toward the pointer (proximity → variable weight), serif words
// lift. Words also ink in with scroll. Reduced motion → keep (fully legible, static weight).
const manifesto = $('[data-manifesto]');
if (manifesto) {
  const words = wrapWords(manifesto);
  shell.add(proximity(words, { radius: 220, rate: 9 }));
  shell.add(
    createMediaContext({
      'full-motion': (scope) => {
        const p = scrollProgress(manifesto, { start: 'top 85%', end: 'bottom 50%' });
        scope.add(p);
        const n = words.length;
        const paint = (v: number) => {
          words.forEach((w, i) => {
            w.style.opacity = String(0.16 + segment(v, i / n - 0.04, (i + 1) / n + 0.04) * 0.84);
          });
        };
        paint(p.get());
        scope.add(p.subscribe(paint));
        scope.add(() => {
          for (const w of words) w.style.opacity = '';
        });
      },
    }),
  );
}

/** Wrap each word in `.w` (and each `<em>` as one `.w-em` unit) without changing the text. */
function wrapWords(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const part of (node.textContent ?? '').split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) frag.append(' ');
        else {
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          frag.append(span);
          out.push(span);
        }
      }
      node.replaceWith(frag);
    } else if (node instanceof HTMLElement) {
      node.classList.add('w', 'w-em');
      out.push(node);
    }
  }
  return out;
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
