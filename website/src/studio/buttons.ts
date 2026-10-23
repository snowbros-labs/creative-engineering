/**
 * Living buttons. Same material as the frost field, at control scale:
 *
 * - The fill thaws in from the exact point the pointer (or finger) entered, and drains out
 *   toward the point it left — a circle clip whose origin follows input, never a fixed sweep.
 * - The label rolls over letter by letter (30 ms stagger), a duplicate rising from below.
 * - Pressing it strikes the frost: the crystals near the button thaw outward.
 *
 * The real label stays in the DOM for assistive tech; the rolling copy is aria-hidden.
 * Hover-only parts are gated by (hover: hover) and (pointer: fine) in CSS; reduced motion keeps
 * the colour change and drops the travel.
 */
import type { Frost } from './frost';

export function enhanceButtons(root: ParentNode, frost: Frost | null): () => void {
  const cleanups: (() => void)[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('.btn, .doc-close, .head-menu'))) {
    if ('alive' in el.dataset) continue;
    el.dataset.alive = '';
    const text = el.textContent?.trim() ?? '';
    const extra = Array.from(el.children).filter((c) => c.classList.contains('visually-hidden'));

    const fill = document.createElement('span');
    fill.className = 'btn-fill';
    fill.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'btn-label';
    const real = document.createElement('span');
    real.className = 'visually-hidden';
    real.textContent = extra.length ? (el.childNodes[0]?.textContent?.trim() ?? text) : text;
    const roll = document.createElement('span');
    roll.className = 'btn-roll';
    roll.setAttribute('aria-hidden', 'true');
    const visible = real.textContent ?? '';
    Array.from(visible).forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'btn-ch';
      s.style.setProperty('--i', String(i));
      s.dataset.ch = ch === ' ' ? ' ' : ch;
      s.textContent = ch === ' ' ? ' ' : ch;
      roll.append(s);
    });
    label.append(real, roll);
    el.replaceChildren(fill, label, ...extra);

    const setOrigin = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--fx', `${e.clientX - r.left}px`);
      el.style.setProperty('--fy', `${e.clientY - r.top}px`);
    };
    const onEnter = (e: PointerEvent) => setOrigin(e);
    const onLeave = (e: PointerEvent) => setOrigin(e);
    const onDown = (e: PointerEvent) => {
      setOrigin(e);
      el.classList.add('is-pressed');
      const r = el.getBoundingClientRect();
      frost?.strike(
        r.left + r.width / 2,
        r.top + r.height / 2,
        e.pointerType === 'touch' ? 0.55 : 0.7,
      );
    };
    const onUp = () => el.classList.remove('is-pressed');
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
    cleanups.push(() => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onUp);
    });
  }
  return () => {
    for (const c of cleanups) c();
  };
}
