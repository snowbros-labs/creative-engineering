/**
 * Lab D — Interface. Functional motion only: FLIP reorder (240 ms), a keyboard-first bar chart
 * with real package sizes, and a validated form that composes real install commands.
 * Reduced motion: FLIP and bar growth skip to the end state.
 */
import { haptic, type Scope } from '@snowbros/core';
import { animate, flip } from '@snowbros/motion';

// Sum of gzipped dist/*.js per package (unminified), measured 2026-10-21 from this repo.
const SIZES: Array<[string, number]> = [
  ['core', 8.9],
  ['motion', 17.0],
  ['fx', 13.9],
  ['scene', 11.9],
  ['react', 3.4],
  ['elements', 2.5],
  ['adapters', 1.2],
  ['tokens', 1.5],
];

const FUNCTIONAL = 'cubic-bezier(0.2, 0, 0, 1)';

export function init(root: HTMLElement, scope: Scope): void {
  // ------------------------------------------------------------ FLIP queue
  const sortBtn = root.querySelector<HTMLButtonElement>('[data-sort]');
  const list = root.querySelector<HTMLElement>('[data-queue]');
  const qStatus = root.querySelector('[data-queue-status]');
  if (sortBtn && list) {
    let ascending = false;
    scope.listen(sortBtn, 'click', async () => {
      ascending = !ascending;
      haptic('select');
      const items = Array.from(list.querySelectorAll<HTMLLIElement>('li'));
      await flip(
        items,
        () => {
          const sorted = items.sort(
            (a, b) => (Number(a.dataset.p) - Number(b.dataset.p)) * (ascending ? 1 : -1),
          );
          for (const li of sorted) list.appendChild(li);
        },
        { duration: 0.24, ease: FUNCTIONAL },
      );
      sortBtn.textContent = ascending ? 'Sort: lowest first' : 'Sort by priority';
      if (qStatus)
        qStatus.textContent = ascending
          ? 'Sorted lowest priority first.'
          : 'Sorted highest priority first.';
    });
  }

  // ------------------------------------------------------------ chart
  const bars = root.querySelector<HTMLElement>('[data-bars]');
  const readout = root.querySelector('[data-bar-readout]');
  if (bars) {
    const max = Math.max(...SIZES.map(([, v]) => v));
    bars.innerHTML = SIZES.map(
      ([name, kb], i) =>
        `<button type="button" class="bar" data-i="${i}" aria-pressed="false" tabindex="${i === 0 ? 0 : -1}" aria-label="${name}: ${kb} kilobytes"><span class="bar-fill" style="--h:${(kb / max) * 100}%"></span><span class="bar-name">${name}</span></button>`,
    ).join('');
    const buttons = Array.from(bars.querySelectorAll<HTMLButtonElement>('.bar'));
    const total = SIZES.reduce((s, [, v]) => s + v, 0);
    const select = (i: number, focus = false) => {
      buttons.forEach((b, j) => {
        b.setAttribute('aria-pressed', String(i === j));
        b.tabIndex = i === j ? 0 : -1;
      });
      if (focus) buttons[i]?.focus();
      const [name, kb] = SIZES[i]!;
      if (readout)
        readout.textContent = `@snowbros/${name} — ${kb.toFixed(1)} KB · ${Math.round((kb / total) * 100)}% of the whole toolkit`;
    };
    buttons.forEach((b, i) => {
      scope.listen(b, 'click', () => select(i));
      scope.listen(b, 'keydown', (e: KeyboardEvent) => {
        const k = e.key;
        const next =
          k === 'ArrowRight' || k === 'ArrowUp'
            ? i + 1
            : k === 'ArrowLeft' || k === 'ArrowDown'
              ? i - 1
              : k === 'Home'
                ? 0
                : k === 'End'
                  ? buttons.length - 1
                  : null;
        if (next === null) return;
        e.preventDefault();
        select((next + buttons.length) % buttons.length, true);
      });
    });
    // Bars grow once on first view (expressive-lite, 600 ms).
    scope.add(
      animate(
        Array.from(bars.querySelectorAll('.bar-fill')),
        { scaleY: [0, 1] },
        { duration: 0.6, stagger: 0.04, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      ),
    );
  }

  // ------------------------------------------------------------ compose form
  const form = root.querySelector<HTMLFormElement>('[data-compose]');
  const out = root.querySelector<HTMLElement>('[data-compose-out]');
  const code = root.querySelector('[data-code="compose"]');
  if (form && out && code) {
    const err = (k: string) => form.querySelector(`[data-error="${k}"]`);
    scope.listen(form, 'submit', (e: Event) => {
      e.preventDefault();
      const f = new FormData(form);
      const stack = String(f.get('stack') ?? '');
      const needs = f.getAll('need').map(String);
      const pm = String(f.get('pm') ?? 'npm');
      const stackEl = form.elements.namedItem('stack') as HTMLSelectElement;
      let ok = true;
      stackEl.setAttribute('aria-invalid', String(!stack));
      stackEl.setAttribute('aria-describedby', 'c-stack-err');
      const se = err('stack');
      if (se) {
        se.id = 'c-stack-err';
        se.textContent = stack ? '' : 'Choose your stack so we pick the right adapter.';
      }
      if (!stack) ok = false;
      const ne = err('need');
      if (ne) ne.textContent = needs.length ? '' : 'Pick at least one capability.';
      if (!needs.length) ok = false;
      if (!ok) {
        haptic('error');
        (stack ? form.querySelector<HTMLInputElement>('input[name="need"]') : stackEl)?.focus();
        return;
      }
      const pkgs = new Set<string>(['@snowbros/core']);
      if (needs.includes('motion')) pkgs.add('@snowbros/motion');
      if (needs.includes('fx')) pkgs.add('@snowbros/fx');
      if (needs.includes('scene')) {
        pkgs.add('@snowbros/scene');
        pkgs.add('three');
      }
      if (stack === 'react') pkgs.add('@snowbros/react');
      if (stack === 'wc') pkgs.add('@snowbros/elements');
      const cmd = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn add' : `${pm} add`;
      code.textContent = `${cmd} ${[...pkgs].join(' ')}\n\n# and give your agent the skill\ngit clone https://github.com/snowbros-labs/creative-engineering\ncp -r creative-engineering/skills/snowbros-creative ~/.claude/skills/`;
      out.hidden = false;
      haptic('success');
      animate(out, { opacity: [0, 1], y: [8, 0] }, { duration: 0.2, ease: FUNCTIONAL });
    });
    const edit = root.querySelector('[data-compose-edit]');
    if (edit)
      scope.listen(edit, 'click', () => {
        out.hidden = true;
        (form.elements.namedItem('stack') as HTMLSelectElement).focus();
      });
  }
}
