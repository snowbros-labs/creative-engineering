/**
 * The founder's name boots into his portfolio's name. On hover or focus, "Ved Chauhan" decodes
 * left to right into "VED.EXE" (ved.exe.snowbros.me is a retro-game portfolio), with a block
 * cursor; leaving decodes it back. The accessible name never changes; the glyphs are aria-hidden.
 * Touch has no hover, so on coarse pointers the link simply reads VED.EXE after the name.
 */
import { prefersReducedMotion, ticker } from '@snowbros/core';

const GLYPHS = '░▒▓█<>/_01#';

export function exeLinks(root: ParentNode = document): () => void {
  const offs: (() => void)[] = [];
  for (const a of Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-exe]'))) {
    const from = a.textContent?.trim() ?? '';
    const to = a.dataset.exe ?? 'VED.EXE';
    a.setAttribute('aria-label', `${from} — portfolio, ${to}`);
    const view = document.createElement('span');
    view.className = 'exe-view';
    view.setAttribute('aria-hidden', 'true');
    view.textContent = from;
    a.replaceChildren(view);

    let stop: (() => void) | null = null;
    const decode = (target: string) => {
      stop?.();
      if (prefersReducedMotion()) {
        view.textContent = target;
        return;
      }
      const start = view.textContent ?? '';
      const len = Math.max(start.length, target.length);
      const dur = 0.42;
      let t = 0;
      stop = ticker.add(({ delta }) => {
        t += delta;
        const p = Math.min(1, t / dur);
        let out = '';
        for (let i = 0; i < len; i++) {
          const settle = (i + 1) / len;
          if (p >= settle) out += target[i] ?? '';
          else if (p >= settle - 0.35) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          else out += start[i] ?? '';
        }
        view.textContent = out.trimEnd();
        if (p >= 1) {
          view.textContent = target;
          stop?.();
          stop = null;
        }
      });
    };
    const on = () => {
      a.classList.add('is-exe');
      decode(to);
    };
    const off = () => {
      a.classList.remove('is-exe');
      decode(from);
    };
    a.addEventListener('pointerenter', on);
    a.addEventListener('pointerleave', off);
    a.addEventListener('focus', on);
    a.addEventListener('blur', off);
    offs.push(() => {
      stop?.();
      a.removeEventListener('pointerenter', on);
      a.removeEventListener('pointerleave', off);
      a.removeEventListener('focus', on);
      a.removeEventListener('blur', off);
    });
  }
  return () => {
    for (const o of offs) o();
  };
}
