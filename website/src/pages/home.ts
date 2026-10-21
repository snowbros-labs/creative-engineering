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
  haptic,
  motionPreference,
  prefersReducedMotion,
  type Scope,
  segment,
  setHapticsEnabled,
} from '@snowbros/core';
import { createCursor, magnetic, marquee, pressable, proximity } from '@snowbros/fx';
import { inView, scrollProgress, scrollVelocity, scrub } from '@snowbros/motion';
import { buildLattice } from '../lattice/geometry.js';
import { latticeSvg } from '../lattice/svg.js';
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
// Desktop Chrome exposes navigator.vibrate but has no motor: only offer it on touch devices.
const touchDevice = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
if (hapticsBtn && canVibrate() && touchDevice) {
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

// ----------------------------------------------------------------- menu: the index
// The panel opens as a circle grown from the menu button; the lattice glyph turns to point the
// hovered entry's arm at it; words thicken toward the pointer. Shell owns focus + Escape.
const menu = $('[data-menu]');
const menuToggle = $('[data-menu-toggle]');
if (menu && menuToggle) {
  shell.listen(menuToggle, 'click', () => {
    const r = menuToggle.getBoundingClientRect();
    menu.style.setProperty('--mx', `${r.left + r.width / 2}px`);
    menu.style.setProperty('--my', `${r.top + r.height / 2}px`);
    haptic('select');
  });
  const glyphHost = $('[data-menu-glyph]', menu);
  const glyph = latticeSvg(buildLattice({ seed: 11, detail: 0.55 }), { nodes: true });
  glyphHost?.append(glyph);
  const point = (arm: number | null) => {
    glyph.classList.toggle('has-focus', arm !== null);
    for (const el of $$<SVGElement>('[data-arm]', glyph))
      el.classList.toggle('is-focus', arm !== null && Number(el.dataset.arm) === arm);
    // Arm k points at 90° + 60k (CCW). Turn it to point left, toward the list.
    glyph.style.rotate = arm === null ? '0deg' : `${-(90 - 60 * arm)}deg`;
  };
  const items = $$<HTMLAnchorElement>('.menu-index a', menu);
  for (const a of items) {
    const arm = Number(a.dataset.arm);
    shell.listen(a, 'pointerenter', () => point(arm));
    shell.listen(a, 'focus', () => point(arm));
    shell.listen(a, 'pointerleave', () => point(null));
  }
  shell.add(proximity($$('.mi-t', menu), { radius: 260 }));
  const menuClock = $('[data-menu-clock]', menu);
  if (menuClock) shell.add(page.subscribe((v) => (menuClock.textContent = v.toFixed(3))));
}

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

// ----------------------------------------------------------------- rooms
// Dark sections arrive as rooms opening on the warm page: a rounded inset that widens to full
// bleed as the section enters (scrubbed, smoothed). Reduced motion → plain full-bleed sections.
for (const room of $$('.lab.theme-dark, .start')) {
  shell.add(
    createMediaContext({
      'full-motion': (scope) => {
        const p = scrollProgress(room, { start: 'top bottom', end: 'top 30%' });
        scope.add(p);
        const paint = (v: number) => {
          const e = 1 - v;
          room.style.clipPath = `inset(0px ${(e * 5).toFixed(3)}vw 0px ${(e * 5).toFixed(3)}vw round ${(e * 44).toFixed(1)}px)`;
        };
        scope.add(scrub({ duration: 0, seek: paint }, p, { smooth: 12 }));
        scope.add(() => {
          room.style.clipPath = '';
        });
      },
    }),
  );
}

// Footer wordmark: the same variable grotesk as the manifesto; letters thicken under the pointer.
const mark = $('.footer-mark');
if (mark) {
  const letters = Array.from(mark.textContent ?? '').map((ch) => {
    const span = document.createElement('span');
    span.textContent = ch;
    return span;
  });
  mark.replaceChildren(...letters);
  shell.add(proximity(letters, { radius: 320, rate: 8 }));
}

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
