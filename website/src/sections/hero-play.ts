/**
 * The playable headline. "Design and engineering, played as one instrument" — so the headline is
 * one: every letter is a key.
 *
 * - Fine pointers: letters lift toward the cursor like hammers rising under a hand (proximity →
 *   `translate`, compositor-only).
 * - Click / tap a letter: it plays a note (if sound is on) and a wave runs out through the words
 *   from that letter. Plucking the crystal sends the same wave, from its side.
 * - Keyboard: the heading is focusable as one control; Space/Enter plays a chord and a wave.
 *
 * Text is split with `splitText` (screen readers get the original sentence once). Reduced motion:
 * no split, no lift, no waves — the static headline. Every effect is owned by `scope`.
 */
import { createMediaContext, haptic, type Scope } from '@snowbros/core';
import { proximity } from '@snowbros/fx';
import { animate, splitText } from '@snowbros/motion';

export interface HeroPlay {
  /** Send a wave through the headline from a horizontal position 0 (left) … 1 (right). */
  wave(from: number, strength?: number): void;
}

export function initHeroPlay(
  shell: Scope,
  title: HTMLElement,
  onNote: (key: number, strength: number) => void,
): HeroPlay {
  let chars: HTMLElement[] = [];
  let live = false;

  const wave = (from: number, strength = 0.7) => {
    if (!live || !chars.length) return;
    const origin = Math.round(from * (chars.length - 1));
    const amp = (0.1 + strength * 0.22).toFixed(3);
    title.style.setProperty('--wave-amp', `${amp}em`);
    for (const [i, c] of chars.entries()) {
      c.style.setProperty('--d', String(Math.abs(i - origin)));
      c.classList.remove('is-wave');
    }
    // Restart the keyframe on every element in one reflow.
    void title.offsetWidth;
    for (const c of chars) c.classList.add('is-wave');
  };

  // Title card: every row is fitted to the column width exactly (measured at a reference size,
  // then scaled) — desktop fits two rows, phones fit three. Layout, not motion: always on.
  const fit = () => {
    const mode = matchMedia('(max-width: 799px)').matches ? 'm' : 'd';
    const box = title.clientWidth;
    for (const el of title.querySelectorAll<HTMLElement>('[data-fit]')) el.style.fontSize = '';
    for (const el of title.querySelectorAll<HTMLElement>('[data-fit]')) {
      if (!(el.dataset.fit ?? '').split(' ').includes(mode)) continue;
      el.style.fontSize = '100px';
      const natural = el.getBoundingClientRect().width;
      if (natural > 0 && box > 0)
        el.style.fontSize = `${((box / natural) * 100 * 0.995).toFixed(2)}px`;
    }
  };
  fit();
  void document.fonts.ready.then(fit);
  const ro = new ResizeObserver(fit);
  ro.observe(title);
  shell.add(() => ro.disconnect());

  // ---------------------------------------------------------------- keyboard strip
  // Real piano keys under the title (white keys + the 2-3 black-key pattern). A played letter
  // presses the key beneath it; pressing a key plays a note and sends a wave up into the letters.
  const keysEl = title.parentElement?.querySelector<HTMLElement>('[data-hero-keys]') ?? null;
  let whites: HTMLElement[] = [];
  let whiteW = 1;
  const buildKeys = () => {
    if (!keysEl) return;
    const width = keysEl.clientWidth;
    const target = matchMedia('(max-width: 799px)').matches ? 22 : 30;
    const n = Math.max(12, Math.round(width / target));
    whiteW = width / n;
    keysEl.replaceChildren();
    whites = [];
    for (let i = 0; i < n; i++) {
      const k = document.createElement('span');
      k.className = 'hk hk-w';
      keysEl.append(k);
      whites.push(k);
    }
    // Black keys sit after white keys 0,1 and 3,4,5 of every octave of seven.
    for (let i = 0; i < n - 1; i++) {
      if (![0, 1, 3, 4, 5].includes(i % 7)) continue;
      const b = document.createElement('span');
      b.className = 'hk hk-b';
      b.style.left = `${((i + 1) * whiteW - whiteW * 0.3).toFixed(1)}px`;
      b.style.width = `${(whiteW * 0.6).toFixed(1)}px`;
      keysEl.append(b);
    }
  };
  const pressKey = (i: number) => {
    const k = whites[Math.max(0, Math.min(whites.length - 1, i))];
    if (!k) return;
    k.classList.remove('is-down');
    void k.offsetWidth;
    k.classList.add('is-down');
  };
  const pressAt = (clientX: number) => {
    if (!keysEl) return;
    const r = keysEl.getBoundingClientRect();
    pressKey(Math.floor((clientX - r.left) / whiteW));
  };
  if (keysEl) {
    buildKeys();
    const kro = new ResizeObserver(buildKeys);
    kro.observe(keysEl);
    shell.add(() => kro.disconnect());
    shell.listen(keysEl, 'animationend', (e: Event) =>
      (e.target as Element).classList.remove('is-down'),
    );
    shell.listen(keysEl, 'pointerdown', (e: PointerEvent) => {
      const r = keysEl.getBoundingClientRect();
      const i = Math.floor((e.clientX - r.left) / whiteW);
      pressKey(i);
      onNote(i % 6, 0.7);
      wave((e.clientX - r.left) / r.width, 0.75);
      haptic('tick');
    });
  }

  // ---------------------------------------------------------------- tuning dial
  // An engineer's dial framing the crystal: 120 ticks, a long tick every 10.
  // Turns with the page; fades as the hero leaves. Decorative; static under reduced motion.
  const dial = document.querySelector<SVGSVGElement>('[data-hero-dial]');
  if (dial) {
    let d = '';
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const long = i % 10 === 0;
      const r1 = long ? 86 : 90;
      d += `M${(Math.cos(a) * r1).toFixed(2)} ${(Math.sin(a) * r1).toFixed(2)}L${(Math.cos(a) * 94).toFixed(2)} ${(Math.sin(a) * 94).toFixed(2)}`;
    }
    dial.innerHTML = `<circle r="97" class="dial-rim"/><circle r="70" class="dial-inner"/><path d="${d}" class="dial-ticks"/><path d="M0 -99 L-2.6 -104 L2.6 -104 Z" class="dial-needle"/>`;
    const spin = () => {
      const y = window.scrollY;
      const fade = Math.max(0, 1 - y / (innerHeight * 0.55));
      dial.style.opacity = String(fade);
      dial.style.setProperty('--spin', `${(y * 0.08).toFixed(2)}deg`);
    };
    spin();
    shell.listen(window, 'scroll', spin, { passive: true });
  }

  shell.add(
    createMediaContext({
      'full-motion': (scope) => {
        const split = splitText(title, { by: ['lines', 'words', 'chars'], mask: true });
        chars = split.chars;
        live = true;
        title.classList.add('is-playable');
        title.tabIndex = 0;
        title.setAttribute('aria-describedby', 'hero-play-help');
        chars.forEach((c, i) => c.style.setProperty('--i', String(i)));

        // Intro: letters rise out of their rows like hammers striking up, left to right, then
        // the rows unclip so lifts and waves can travel above the baseline.
        title.classList.add('is-intro');
        scope.add(
          animate(
            chars,
            { y: ['115%', '0%'] },
            {
              duration: 0.95,
              stagger: 0.016,
              delay: 0.2,
              ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
          ),
        );
        const unclip = window.setTimeout(
          () => {
            title.classList.remove('is-intro');
            wave(0, 0.3);
          },
          1300 + chars.length * 16,
        );
        scope.add(() => window.clearTimeout(unclip));

        scope.add(proximity(chars, { radius: 90, rate: 14 }));

        const play = (c: HTMLElement) => {
          const i = chars.indexOf(c);
          if (i < 0) return;
          const r = c.getBoundingClientRect();
          pressAt(r.left + r.width / 2);
          wave(i / Math.max(1, chars.length - 1), 0.8);
          onNote(i % 6, 0.75);
          haptic('tick');
        };
        scope.listen(title, 'pointerdown', (e: PointerEvent) => {
          const c = (e.target as Element).closest<HTMLElement>('.sb-char');
          if (c) play(c);
        });
        scope.listen(title, 'keydown', (e: KeyboardEvent) => {
          if (e.key !== ' ' && e.key !== 'Enter') return;
          e.preventDefault();
          wave(0, 0.8);
          for (const [k, d] of [
            [0, 0],
            [2, 80],
            [4, 160],
          ] as const)
            window.setTimeout(() => onNote(k, 0.6), d);
        });
        for (const c of chars) scope.listen(c, 'animationend', () => c.classList.remove('is-wave'));

        fit();
        scope.add(() => {
          live = false;
          chars = [];
          title.classList.remove('is-playable');
          title.removeAttribute('tabindex');
          title.removeAttribute('aria-describedby');
          split.revert();
          requestAnimationFrame(fit);
        });
      },
    }),
  );
  return { wave };
}
