/**
 * Everything the studio pages share: the frost field, living buttons, reveals, the header with
 * its travelling section indicator, and the full-screen menu.
 */
import { prefersReducedMotion } from '@snowbros/core';
import { reveal, revealText } from '@snowbros/motion';
import { enhanceButtons } from './buttons';
import { enhanceSelects } from './dropdown';
import { createFrost, type Frost } from './frost';

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

export interface StudioShell {
  frost: Frost | null;
  dispose(): void;
}

/** `sections`: ids whose header link should light up while that section is centred. */
export function initStudioShell(sections: string[]): StudioShell {
  const cleanups: (() => void)[] = [];

  // ---- frost
  const canvas = $<HTMLCanvasElement>('[data-frost-canvas]');
  const frost = canvas ? createFrost(canvas) : null;
  if (frost) cleanups.push(() => frost.dispose());
  cleanups.push(enhanceButtons(document, frost));
  cleanups.push(enhanceSelects(document));
  for (const el of $$('[data-strike]')) {
    el.addEventListener('pointerdown', (e) =>
      frost?.strike(e.clientX, e.clientY, e.pointerType === 'touch' ? 0.7 : 0.9),
    );
  }

  // ---- reveals: headings rise line by line once; copy fades up a little behind them
  for (const el of $$('[data-reveal]'))
    revealText(el, { by: 'lines', stagger: 0.07, duration: 0.85 });
  reveal($$('[data-reveal-fade]'), {
    preset: 'fade-up',
    duration: 0.7,
    stagger: 0.06,
    delay: 0.12,
  });

  // ---- header
  const head = $('[data-head]');
  const onScroll = () => head?.classList.toggle('is-solid', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  cleanups.push(() => removeEventListener('scroll', onScroll));

  // Current-section indicator: one bar that travels between links (transform only).
  const ind = $('[data-ind]');
  const navLinks = $$<HTMLAnchorElement>('[data-nav]');
  const place = (link: HTMLAnchorElement | null): void => {
    if (!ind) return;
    if (!link) {
      ind.style.opacity = '0';
      for (const l of navLinks) l.removeAttribute('aria-current');
      return;
    }
    ind.style.opacity = '1';
    ind.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth / 100})`;
    for (const l of navLinks) {
      if (l === link) l.setAttribute('aria-current', 'location');
      else l.removeAttribute('aria-current');
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        place(navLinks.find((l) => l.dataset.nav === e.target.id) ?? null);
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const id of [...sections, 'top']) {
    const s = document.getElementById(id);
    if (s) io.observe(s);
  }
  cleanups.push(() => io.disconnect());

  // ---- menu
  const menu = $<HTMLDialogElement>('[data-menu]');
  const menuOpen = $<HTMLButtonElement>('[data-menu-open]');
  const closeMenu = (): void => {
    if (!menu?.open) return;
    if (prefersReducedMotion()) {
      menu.close();
      return;
    }
    menu.classList.add('is-closing');
    afterTransition(menu, () => {
      menu.classList.remove('is-closing');
      menu.close();
    });
  };
  menuOpen?.addEventListener('click', () => {
    if (!menu) return;
    menu.showModal();
    menuOpen.setAttribute('aria-expanded', 'true');
  });
  menu?.addEventListener('close', () => {
    menuOpen?.setAttribute('aria-expanded', 'false');
    menuOpen?.focus();
  });
  menu?.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeMenu();
  });
  $('[data-menu-close]')?.addEventListener('click', closeMenu);
  for (const a of $$<HTMLAnchorElement>('[data-menu-link]')) {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('#')) return; // links to the other page navigate normally
      e.preventDefault();
      menu?.close();
      document
        .querySelector(href)
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      history.replaceState(null, '', href);
    });
  }
  menu?.addEventListener('click', (e) => {
    if (e.target === menu) closeMenu(); // backdrop
  });

  return {
    frost,
    dispose() {
      for (const c of cleanups) c();
    },
  };
}

/** Run `done` after the element's own transition ends (with a safety cap), never a guessed delay. */
function afterTransition(el: HTMLElement, done: () => void): void {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.removeEventListener('transitionend', onEnd);
    done();
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.target === el || (e.target as Element).closest?.('li')) finish();
  };
  el.addEventListener('transitionend', onEnd);
  window.setTimeout(finish, 400);
}
