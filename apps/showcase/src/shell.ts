/**
 * Shared page shell: header hide-on-scroll, accessible mobile menu, motion toggle.
 * Every page calls `initShell()` once.
 */
import {
  createScope,
  motionPreference,
  type Scope,
  setMotionPreference,
} from '@snowbros/core';
import { animate } from '@snowbros/motion';

const MOTION_KEY = 'sb-motion';

export function initShell(): Scope {
  const scope = createScope();
  restoreMotionChoice();
  initHeader(scope);
  initMenu(scope);
  initMotionToggles(scope);
  return scope;
}

function restoreMotionChoice() {
  try {
    if (localStorage.getItem(MOTION_KEY) === 'reduced') setMotionPreference('reduced');
  } catch {
    // Storage blocked (private mode): follow the system setting.
  }
}

/** Hide the header while scrolling down, reveal on scroll up. Never hides while focused. */
function initHeader(scope: Scope) {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;
  let last = window.scrollY;
  let queued = false;
  scope.listen(
    window,
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY;
        const down = y > last && y > 240;
        const focused = header.contains(document.activeElement);
        header.dataset.hidden = String(down && !focused);
        last = y;
      });
    },
    { passive: true },
  );
  scope.listen(header, 'focusin', () => {
    header.dataset.hidden = 'false';
  });
}

/** Full-screen menu: focus moves in, Tab is contained, Escape closes, focus returns. */
function initMenu(scope: Scope) {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.getElementById('menu');
  if (!toggle || !panel) return;
  const close = panel.querySelector<HTMLButtonElement>('[data-menu-close]');
  const links = Array.from(panel.querySelectorAll<HTMLAnchorElement>('a'));

  const focusables = () =>
    Array.from(panel.querySelectorAll<HTMLElement>('a, button')).filter((el) => !el.hasAttribute('disabled'));

  const setOpen = (open: boolean) => {
    panel.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    panel.toggleAttribute('inert', !open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      animate(links, { y: ['105%', '0%'] }, { duration: 0.7, stagger: 0.05, delay: 0.12, ease: 'editorial', reducedMotion: 'skip' });
      (links[0] ?? close)?.focus({ preventScroll: true });
    } else {
      toggle.focus({ preventScroll: true });
    }
  };
  panel.toggleAttribute('inert', true);

  scope.listen(toggle, 'click', () => setOpen(true));
  if (close) scope.listen(close, 'click', () => setOpen(false));
  for (const a of links) scope.listen(a, 'click', () => setOpen(false));
  scope.listen(document, 'keydown', (e) => {
    if (panel.dataset.open !== 'true') return;
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const list = focusables();
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  });
}

/** `<button data-motion-toggle>` switches reduced motion for this site and remembers it. */
function initMotionToggles(scope: Scope) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]'));
  const render = () => {
    const reduced = motionPreference.get() === 'reduced';
    for (const b of buttons) {
      b.setAttribute('aria-pressed', String(reduced));
      const label = b.querySelector('[data-motion-label]');
      if (label) label.textContent = reduced ? 'Motion: reduced' : 'Motion: full';
    }
  };
  for (const b of buttons) {
    scope.listen(b, 'click', () => {
      const next = motionPreference.get() === 'reduced' ? null : 'reduced';
      setMotionPreference(next);
      try {
        if (next) localStorage.setItem(MOTION_KEY, next);
        else localStorage.removeItem(MOTION_KEY);
      } catch {
        // ignore storage failures
      }
    });
  }
  scope.add(motionPreference.subscribe(render));
  render();
}

/** Inline SNOWBROS mark: a six-fold snow crystal drawn from hairlines. */
export const brandMark = `<svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7"/><path d="m9.5 3.8 2.5 2 2.5-2M9.5 20.2l2.5-2 2.5 2M4 10.2l3 .8-1 3M20 13.8l-3-.8 1-3M4 13.8l3-.8-1-3M20 10.2l-3 .8 1 3"/></svg>`;
