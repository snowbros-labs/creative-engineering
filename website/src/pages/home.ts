/**
 * Flagship page orchestrator. Built with the snowbros-creative skill workflow:
 * direction + plan in docs/briefs/FLAGSHIP_DIRECTION.md. Every effect is registered on the shell
 * scope (or a child) so HMR and media-query changes never duplicate work (skill hard rule 8).
 */
import 'lenis/dist/lenis.css';
import '../styles/base.css';
import '../styles/home.css';
import {
  canVibrate,
  createMediaContext,
  createSignal,
  createSpringValue,
  haptic,
  motionPreference,
  prefersReducedMotion,
  type Scope,
  segment,
  setHapticsEnabled,
  ticker,
} from '@snowbros/core';
import {
  type AnnotationType,
  annotate,
  magnetic,
  marquee,
  pressable,
  proximity,
  scramble,
} from '@snowbros/fx';
import { inView, scrollProgress, scrollVelocity, scrub } from '@snowbros/motion';
import { smoothScroll } from '@snowbros/adapters';
import Lenis from 'lenis';
import { buildLattice } from '../lattice/geometry.js';
import { latticeSvg } from '../lattice/svg.js';
import { initHeroPlay } from '../sections/hero-play.js';
import { initInstrument } from '../sections/instrument.js';
import { createInstrument } from '../sound/instrument.js';
import { initSystem } from '../sections/system.js';
import { initShell } from '../shell.js';
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
// Brand mark: a live mini-lattice. Its lit arm follows the section in view (set by the nav
// tracker below), so the header speaks the same visual language as the hero and the menu.
const brand = $('[data-brand]');
const brandGlyph = latticeSvg(buildLattice({ seed: 11, detail: 0.35 }), { nodes: false });
if (brand) {
  const holder = document.createElement('span');
  holder.className = 'brand-glyph';
  holder.append(brandGlyph);
  brand.prepend(holder);
}
const SECTION_ARM: Record<string, number> = {
  '#instrument': 0,
  '#labs': 1,
  '#system': 3,
  '#start': 5,
  '#contact': 2,
};
const SECTION_NAME: Record<string, string> = {
  '#instrument': '01 / Instrument',
  '#labs': '02 / Labs',
  '#system': '03 / System',
  '#start': '04 / Start',
  '#contact': '05 / Contact',
};
const readout = $('[data-readout]');
let readoutFx: { dispose(): void } | null = null;
// Brand rotor: rest angle points the current section's arm up; scroll speed spins it, a spring
// brings it home. One spring, ticked only while it moves.
const rotor = createSpringValue(0, { stiffness: 90, damping: 14, mass: 1 });
let rotorOff: (() => void) | null = null;
const spinRotor = () => {
  if (rotorOff) return;
  rotorOff = ticker.add(({ delta }) => {
    brandGlyph.style.rotate = `${rotor.step(delta).toFixed(2)}deg`;
    if (rotor.settled) {
      rotorOff?.();
      rotorOff = null;
    }
  });
};
shell.add(() => rotorOff?.());
const lightBrand = (hash: string | null) => {
  const arm = hash ? SECTION_ARM[hash] : undefined;
  brandGlyph.classList.toggle('has-focus', arm !== undefined);
  for (const el of $$<SVGElement>('[data-arm]', brandGlyph))
    el.classList.toggle('is-focus', arm !== undefined && Number(el.dataset.arm) === arm);
  rotor.set(arm === undefined ? 0 : -60 * arm);
  if (prefersReducedMotion()) {
    rotor.jump(rotor.target);
    brandGlyph.style.rotate = `${rotor.target}deg`;
  } else spinRotor();
  // Section readout decodes into its new name.
  const name = hash ? SECTION_NAME[hash] : '00 / Top';
  if (readout && name && readout.dataset.name !== name) {
    readout.dataset.name = name;
    readoutFx?.dispose();
    readoutFx = scramble(readout, {
      text: name,
      trigger: 'load',
      duration: 0.5,
      chars: '0123456789/',
    });
  }
};
shell.add(() => readoutFx?.dispose());

// ----------------------------------------------------------------- smooth wheel (desktop)
// Lenis smooths wheel steps through the long pinned instrument. Native scroll position is kept,
// so sticky pins, scrollProgress and find-in-page keep working. Off on touch and reduced motion
// (adapter policy); paused while the menu is open; in-page anchors glide via Lenis.
{
  const smooth = smoothScroll({
    create: () => new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, anchors: { offset: -72 } }),
  });
  shell.add(smooth);
  const menuEl = $('[data-menu]');
  if (menuEl) {
    const mo = new MutationObserver(() => {
      if (menuEl.dataset.open === 'true') smooth.instance?.stop();
      else {
        smooth.instance?.start();
        smooth.wake();
      }
    });
    mo.observe(menuEl, { attributes: true, attributeFilter: ['data-open'] });
    shell.add(() => mo.disconnect());
  }
}

// ----------------------------------------------------------------- page clock + nav state
// One passive progress source for the whole document; the hairline reads it directly.
const bar = $('[data-page-progress]');
const page = scrollProgress(document.documentElement, { start: 'top top', end: 'bottom bottom' });
shell.add(page);
if (bar) shell.add(page.subscribe((v) => (bar.style.transform = `scaleX(${v})`)));
// The same clock rings the menu button: a quiet, always-visible "where am I" on every page.
const ring = $<SVGCircleElement>('[data-clock-ring]');
if (ring) shell.add(page.subscribe((v) => (ring.style.strokeDashoffset = String(1 - v))));

// Brand: wordmark letters thicken toward the pointer; the sub-label decodes on hover/focus.
const brandWord = $('[data-brand-word]');
if (brandWord) {
  const letters = Array.from(brandWord.textContent ?? '').map((ch) => {
    const span = document.createElement('span');
    span.textContent = ch;
    return span;
  });
  brandWord.replaceChildren(...letters);
  shell.add(proximity(letters, { radius: 140, rate: 12 }));
}
const brandSub = $('[data-brand-sub]');
if (brandSub) shell.add(scramble(brandSub, { trigger: 'hover', duration: 0.6, chars: '01/_—' }));
// Nav links lean a little toward a fine pointer (magnetic no-ops on touch / reduced motion).
for (const link of $$('[data-nav]')) shell.add(magnetic(link, { strength: 0.18, radius: 24 }));

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

// Current-section marker in the nav (aria-current would mislabel in-page anchors). A pill glides
// between links on two springs (position + width), so the change of section is felt, not jumped.
const navLinks = $$<HTMLAnchorElement>('[data-nav]');
const pill = $('[data-nav-pill]');
const pillX = createSpringValue(0, { stiffness: 380, damping: 32, mass: 1 });
const pillW = createSpringValue(0, { stiffness: 380, damping: 32, mass: 1 });
let pillOff: (() => void) | null = null;
const movePill = (link: HTMLAnchorElement | null) => {
  if (!pill) return;
  pill.dataset.on = String(!!link);
  if (!link) return;
  const x = link.offsetLeft;
  const w = link.offsetWidth;
  const first = pillW.value === 0;
  if (first || prefersReducedMotion()) {
    pillX.jump(x);
    pillW.jump(w);
  } else {
    pillX.set(x);
    pillW.set(w);
  }
  const paint = () => {
    pill.style.transform = `translateX(${pillX.value.toFixed(2)}px)`;
    pill.style.width = `${pillW.value.toFixed(2)}px`;
  };
  paint();
  if (!pillOff)
    pillOff = ticker.add(({ delta }) => {
      pillX.step(delta);
      pillW.step(delta);
      paint();
      if (pillX.settled && pillW.settled) {
        pillOff?.();
        pillOff = null;
      }
    });
};
shell.add(() => pillOff?.());
const remeasurePill = () => {
  const active = navLinks.find((l) => l.dataset.active === 'true') ?? null;
  if (active) {
    pillX.jump(active.offsetLeft);
    pillW.jump(active.offsetWidth);
    movePill(active);
  }
};
shell.listen(window, 'resize', remeasurePill);
// Link widths change when the webfont swaps in; the pill must follow.
void document.fonts.ready.then(remeasurePill);
for (const link of navLinks) {
  const target = $(link.hash);
  if (!target) continue;
  shell.add(
    inView(
      target,
      () => {
        for (const l of navLinks) l.dataset.active = String(l === link);
        movePill(link);
        lightBrand(link.hash);
        return () => {
          link.dataset.active = 'false';
          // Between sections the readout keeps the last one; only the top of the page resets it.
          if (!navLinks.some((l) => l.dataset.active === 'true') && window.scrollY < innerHeight) {
            movePill(null);
            lightBrand(null);
          }
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

// ----------------------------------------------------------------- header timeline
// The nav is a transport bar: chapters are markers on a track, the playhead is the reader's
// position. Within the active chapter it advances by that section's own progress, so markers
// stay evenly spaced however long each section is. Measured on resize, computed on scroll.
{
  const tl = $('[data-tl]');
  const fill = $('[data-tl-fill]');
  const head = $('[data-tl-head]');
  const links = $$<HTMLAnchorElement>('[data-tl] [data-nav]');
  const targets = links.map((a) => $(a.hash));
  if (tl && fill && head && links.length) {
    let tops: number[] = [];
    let ends: number[] = [];
    const measure = () => {
      tops = targets.map((t) => (t ? t.getBoundingClientRect().top + window.scrollY : 0));
      ends = tops.map((t, i) => tops[i + 1] ?? document.documentElement.scrollHeight);
    };
    const paint = () => {
      const y = window.scrollY + innerHeight * 0.5;
      let i = tops.findIndex((t, k) => y >= t && y < ends[k]!);
      if (i < 0) i = y < (tops[0] ?? 0) ? -1 : tops.length - 1;
      const local = i < 0 ? 0 : Math.min(1, (y - tops[i]!) / Math.max(1, ends[i]! - tops[i]!));
      const p = i < 0 ? 0 : (i + local) / links.length;
      fill.style.transform = `scaleX(${p.toFixed(4)})`;
      head.style.transform = `translateX(${(p * tl.clientWidth).toFixed(1)}px)`;
    };
    measure();
    paint();
    shell.listen(window, 'scroll', paint, { passive: true });
    const ro = new ResizeObserver(() => {
      measure();
      paint();
    });
    ro.observe(document.body);
    shell.add(() => ro.disconnect());
  }
}

// ----------------------------------------------------------------- 01 instrument
const clock = createSignal(0);
// Sound is opt-in: the lattice is an instrument — six arms, six synthesised notes.
const instrument = createInstrument(shell);
const heroTitle = $('[data-hero-title]');
const heroPlay = heroTitle
  ? initHeroPlay(shell, heroTitle, (key, strength) => instrument.pluck(key, strength))
  : null;
initInstrument(shell, clock, {
  onPluck: (arm, strength) => {
    instrument.pluck(arm, strength);
    // The crystal sits to the right of the headline: its wave enters from that side.
    heroPlay?.wave(1, strength);
  },
});
{
  const buttons = $$<HTMLButtonElement>('[data-sound-toggle]');
  const render = (on: boolean) => {
    for (const b of buttons) {
      b.setAttribute('aria-pressed', String(on));
      const label = b.querySelector('[data-sound-label]');
      if (label) label.textContent = on ? 'Sound: on' : 'Sound: off';
    }
    document.documentElement.dataset.sound = on ? 'on' : 'off';
  };
  render(instrument.enabled);
  shell.add(instrument.subscribe(render));
  for (const b of buttons)
    shell.listen(b, 'click', () => instrument.setEnabled(!instrument.enabled));
}

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
  const caption = $('[data-menu-caption]', menu);
  const defaultCaption = caption?.textContent ?? '';
  // The engineer's pen underlines the entry you're on; leaving rewinds the stroke.
  const pens = items.map((a, i) =>
    annotate($('.mi-t', a)!, {
      type: 'underline',
      trigger: 'manual',
      color: 'var(--accent)',
      strokeWidth: 3,
      roughness: 0.6,
      seed: 31 + i * 7,
      duration: 0.45,
      double: false,
    }),
  );
  for (const pen of pens) shell.add(pen);
  const focusItem = (i: number | null) => {
    point(i === null ? null : Number(items[i]!.dataset.arm));
    if (caption)
      caption.textContent = i === null ? defaultCaption : (items[i]!.dataset.caption ?? '');
    pens.forEach((pen, j) => {
      if (j === i) void pen.play();
      else pen.seek(0);
    });
  };
  items.forEach((a, i) => {
    shell.listen(a, 'pointerenter', () => focusItem(i));
    shell.listen(a, 'focus', () => focusItem(i));
    shell.listen(a, 'pointerleave', () => {
      if (document.activeElement !== a) focusItem(null);
    });
  });
  // Keyboard: ↑/↓ walk the index, number keys jump straight to an entry.
  shell.listen(menu, 'keydown', (e: KeyboardEvent) => {
    if (menu.dataset.open !== 'true') return;
    const at = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
      haptic('tick');
    } else if (/^[1-9]$/.test(e.key) && !(e.target as Element).closest('input, textarea')) {
      items[Number(e.key) - 1]?.click();
    }
  });
  // "You are here": mark the section currently in view each time the menu opens.
  shell.listen(menuToggle, 'click', () => {
    const current = navLinks.find((l) => l.dataset.active === 'true')?.hash;
    for (const a of items) a.toggleAttribute('data-current', a.hash === current);
  });
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
type LabHooks = { onImpact?: (index: number, strength: number) => void };
const labs: Record<
  string,
  () => Promise<{ init(root: HTMLElement, scope: Scope, hooks?: LabHooks): void }>
> = {
  motion: () => import('../labs/motion-lab.js'),
  interaction: () => import('../labs/interaction-lab.js'),
  space: () => import('../labs/space-lab.js'),
  interface: () => import('../labs/interface-lab.js'),
  effects: () => import('../labs/effects-lab.js'),
  physics: () => import('../labs/physics-lab.js'),
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
          .then((m) => m.init(root, labScope, { onImpact: (i, v) => instrument.pluck(i, v * 0.8) }))
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

// ----------------------------------------------------------------- redlines
// An engineer's orange pen marks the few words that carry the argument, drawn as they arrive.
// Seeded per word so the wobble is stable; reduced motion shows them already drawn.
$$<HTMLElement>('[data-redline]').forEach((el, i) => {
  shell.add(
    annotate(el, {
      type: el.dataset.redline as AnnotationType,
      color: 'var(--accent)',
      strokeWidth: el.dataset.redline === 'circle' ? 2.25 : 2.5,
      roughness: 0.55,
      seed: 7 + i * 13,
      duration: el.dataset.redline === 'circle' ? 0.9 : 0.6,
      delay: 0.25,
    }),
  );
});

// ----------------------------------------------------------------- labs orbit
// Lab chips ride an ellipse around the Labs headline; scroll turns the ring (scrubbed, smoothed).
// Desktop + full motion only — otherwise they stay a plain, wrapping row of links.
const orbit = $('[data-orbit]');
if (orbit) {
  shell.add(
    createMediaContext({
      '(min-width: 1180px) and full-motion': (scope) => {
        orbit.dataset.orbit = 'on';
        const chips = $$<HTMLAnchorElement>('.lab-index a', orbit);
        const guide = $<SVGSVGElement>('[data-orbit-guide]', orbit);
        let w = 0;
        let h = 0;
        let spin = 0;
        const layout = () => {
          w = orbit.clientWidth;
          h = orbit.clientHeight;
          if (guide)
            guide.innerHTML = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.44}" ry="${h * 0.4}"/><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}"/><line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h}"/>`;
          place();
        };
        const place = () => {
          chips.forEach((chip, i) => {
            const a = (i / chips.length) * Math.PI * 2 - Math.PI / 2 + spin;
            const x = w / 2 + Math.cos(a) * w * 0.44 - chip.offsetWidth / 2;
            const y = h / 2 + Math.sin(a) * h * 0.4 - chip.offsetHeight / 2;
            chip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          });
        };
        const p = scrollProgress(orbit, { start: 'top bottom', end: 'bottom top' });
        scope.add(p);
        scope.add(
          scrub(
            {
              duration: 0,
              seek: (v) => {
                spin = (v - 0.5) * Math.PI * 0.9;
                place();
              },
            },
            p,
            { smooth: 8 },
          ),
        );
        layout();
        const ro = new ResizeObserver(layout);
        ro.observe(orbit);
        scope.add(() => {
          ro.disconnect();
          orbit.dataset.orbit = 'off';
          if (guide) guide.innerHTML = '';
          for (const c of chips) c.style.transform = '';
        });
      },
    }),
  );
}

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
  // Fit the wordmark to its column exactly: measured at its heaviest weight, so letters that
  // thicken under the pointer never push past the edge. Re-fits on resize and font swap.
  const fit = () => {
    mark.classList.add('is-measuring');
    mark.style.fontSize = '100px';
    const natural = letters.reduce((w, l) => w + l.getBoundingClientRect().width, 0);
    mark.classList.remove('is-measuring');
    const box = mark.clientWidth;
    if (natural > 0 && box > 0) mark.style.fontSize = `${((box / natural) * 100).toFixed(2)}px`;
  };
  const ro = new ResizeObserver(fit);
  ro.observe(mark);
  shell.add(() => ro.disconnect());
  void document.fonts.ready.then(fit);
}
// Footer tab: the crystal's last appearance, as the mark on the card's notch.
$('[data-footer-tab]')?.append(
  latticeSvg(buildLattice({ seed: 11, detail: 0.35 }), { nodes: true }),
);

const footerClock = $('[data-footer-clock]');
if (footerClock) shell.add(page.subscribe((v) => (footerClock.textContent = v.toFixed(3))));

// ----------------------------------------------------------------- 06 contact + footer (GSAP)
// GSAP + SplitText load after first paint (idle), so they never weigh on the hero.
{
  let gone = false;
  shell.add(() => {
    gone = true;
  });
  const loadClosing = () =>
    import('../sections/closing.js')
      .then((m) => {
        if (!gone) m.initClosing(shell);
      })
      .catch((error) => console.error('[site] closing choreography failed to load', error));
  if (typeof requestIdleCallback === 'function')
    requestIdleCallback(loadClosing, { timeout: 1500 });
  else setTimeout(loadClosing, 400);
}

// Scroll speed kicks the brand rotor (impulse), then its spring settles back on the section arm.
{
  const v = scrollVelocity();
  shell.add(v);
  shell.add(
    v.subscribe((speed) => {
      if (prefersReducedMotion() || Math.abs(speed) < 200) return;
      rotor.impulse(Math.max(-900, Math.min(900, speed * 0.25)));
      spinRotor();
    }),
  );
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
