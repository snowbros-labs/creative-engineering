/**
 * 06 — Contact + footer, and the phone hero's scroll exit. Authored as GSAP timelines (SplitText
 * masks, per-word staggers) but never played by GSAP's own clock or ScrollTrigger: each timeline
 * is paused and scrubbed by a SNOWBROS `scrollProgress` through `fromGsap` (@snowbros/adapters),
 * so the page keeps one scroll source and one frame loop (skill hard rule 2).
 *
 * Reduced motion: `skip` — nothing is split or moved; the static HTML is the final state.
 */
import { fromGsap } from '@snowbros/adapters';
import { createMediaContext, type Scope } from '@snowbros/core';
import { scrollProgress, scrub } from '@snowbros/motion';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

/** Scrub a paused GSAP timeline with a scroll range of `el`. Returns a disposer. */
function scrubbed(
  scope: Scope,
  el: HTMLElement,
  tl: gsap.core.Timeline,
  start: string,
  end: string,
) {
  tl.pause(0);
  const p = scrollProgress(el, { start, end });
  scope.add(p);
  scope.add(scrub(fromGsap(tl), p, { smooth: 10 }));
  scope.add(() => {
    tl.progress(0).kill();
  });
}

export function initClosing(shell: Scope): void {
  const closing = $('[data-closing]');
  const title = $('[data-closing-title]');
  const rows = $$('[data-closing-actions] li');
  const footer = $('.site-footer');
  const mark = $('[data-footer-mark]');
  const hero = $('[data-hero]');

  shell.add(
    createMediaContext({
      'full-motion': (scope) => {
        // Split only after the webfonts settle, so word boxes are measured in the final face.
        let cancelled = false;
        scope.add(() => {
          cancelled = true;
        });
        void document.fonts.ready.then(() => {
          if (cancelled) return;

          // Contact: the headline rises word by word out of its own masks; the italic clause
          // arrives a beat later and leans in. The action rows draw their rules, then type.
          if (closing && title) {
            const split = SplitText.create(title, { type: 'words', mask: 'words' });
            scope.add(() => split.revert());
            const em = title.querySelector('em');
            const plain = split.words.filter((w) => !em?.contains(w));
            const lead = split.words.filter((w) => em?.contains(w));
            const tl = gsap
              .timeline({ defaults: { ease: 'power3.out' } })
              .from(plain, { yPercent: 110, duration: 1, stagger: 0.08 })
              .from(lead, { yPercent: 110, rotate: 4, duration: 1, stagger: 0.08 }, '-=0.6');
            if (rows.length)
              tl.from(
                rows,
                { opacity: 0, y: 24, duration: 0.8, stagger: 0.12, ease: 'power2.out' },
                '-=0.7',
              );
            scrubbed(scope, closing, tl, 'top 85%', 'center 60%');
          }

          // Footer wordmark: letters surface from below the baseline as the page ends, each a
          // little later than the last, like keys pressed left to right.
          if (footer && mark) {
            const letters = Array.from(mark.children) as HTMLElement[];
            if (letters.length) {
              const tl = gsap.timeline().from(letters, {
                yPercent: 100,
                duration: 1,
                ease: 'power4.out',
                stagger: { each: 0.06 },
              });
              scrubbed(scope, footer, tl, 'top 95%', 'bottom bottom');
            }
          }
        });
      },
      // Phones have no pinned instrument: give the hero a scrubbed exit instead. Headline lines
      // drift at different rates (depth), the crystal falls back and the lede fades last.
      '(max-width: 799px) and full-motion': (scope) => {
        if (!hero) return;
        const lattice = $('[data-lattice]');
        const titleEl = $('[data-hero-title]', hero);
        const foot = $('.hero-foot', hero);
        const tl = gsap.timeline({ defaults: { ease: 'none' } });
        if (lattice) tl.to(lattice, { yPercent: -18, scale: 0.86, opacity: 0.25, duration: 1 }, 0);
        if (titleEl) tl.to(titleEl, { y: -70, duration: 1 }, 0);
        if (foot) tl.to(foot, { y: -24, opacity: 0.2, duration: 1 }, 0.15);
        scrubbed(scope, hero, tl, 'top top', 'bottom top');
        scope.add(() => {
          gsap.set([lattice, titleEl, foot].filter(Boolean), { clearProps: 'transform,opacity' });
        });
      },
    }),
  );
}
