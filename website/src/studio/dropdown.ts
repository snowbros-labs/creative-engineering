/**
 * SNOWBROS dropdowns: every native <select> upgraded to a select-only combobox (WAI-ARIA APG).
 *
 * The native select stays in the DOM, visually hidden, and remains the source of truth: forms
 * submit it, scripts read `.value`, and without JavaScript it is simply the select. The custom
 * control mirrors it and writes back with real `input` + `change` events.
 *
 * Keyboard: Enter / Space / ↓ / ↑ open; ↑ ↓ Home End move; letters jump (typeahead); Enter or
 * Space picks; Esc closes and returns focus; Tab picks the highlighted option and moves on.
 * Motion: the list grows from its trigger (scale 0.96 → 1 + fade, 180 ms ease-out) and leaves
 * faster (120 ms) — it opens tens of times a session, so it stays quick and never bounces.
 */
let uid = 0;

export function enhanceSelects(root: ParentNode = document): () => void {
  const cleanups: (() => void)[] = [];
  for (const select of Array.from(
    root.querySelectorAll<HTMLSelectElement>('select:not([multiple])'),
  )) {
    if (select.dataset.dropdown === 'native') continue;
    if (select.closest('.dd')) continue;
    cleanups.push(enhance(select));
  }
  return () => {
    for (const c of cleanups) c();
  };
}

function enhance(select: HTMLSelectElement): () => void {
  const id = `dd-${++uid}`;
  const label = select.id
    ? document.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`)
    : null;
  const variant = select.classList.contains('brief-sel') ? 'dd-inline' : 'dd-field';

  const wrap = document.createElement('span');
  wrap.className = `dd ${variant}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dd-trigger';
  button.id = `${id}-trigger`;
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `${id}-list`);
  if (label) {
    if (!label.id) label.id = `${id}-label`;
    button.setAttribute('aria-labelledby', `${label.id} ${button.id}`);
  }
  const value = document.createElement('span');
  value.className = 'dd-value';
  const caret = document.createElement('span');
  caret.className = 'dd-caret';
  caret.setAttribute('aria-hidden', 'true');
  button.append(value, caret);

  const list = document.createElement('ul');
  list.className = 'dd-list';
  list.id = `${id}-list`;
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  if (label) list.setAttribute('aria-labelledby', label.id);

  const opts = Array.from(select.options);
  const items = opts.map((o, i) => {
    const li = document.createElement('li');
    li.className = 'dd-opt';
    li.id = `${id}-o${i}`;
    li.setAttribute('role', 'option');
    li.textContent = o.textContent;
    if (o.disabled) li.setAttribute('aria-disabled', 'true');
    return li;
  });
  list.append(...items);

  select.parentNode?.insertBefore(wrap, select);
  wrap.append(select, button, list);
  select.classList.add('dd-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  label?.setAttribute('for', button.id);

  let open = false;
  let active = select.selectedIndex;
  let typed = '';
  let typedAt = 0;

  const sync = (): void => {
    const o = select.options[select.selectedIndex];
    value.textContent = o?.textContent ?? '';
    value.classList.toggle('is-placeholder', !o?.value);
    items.forEach((li, i) => {
      li.setAttribute('aria-selected', String(i === select.selectedIndex));
    });
  };
  const highlight = (i: number): void => {
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, j) => {
      li.classList.toggle('is-active', j === active);
    });
    button.setAttribute('aria-activedescendant', items[active]?.id ?? '');
    items[active]?.scrollIntoView({ block: 'nearest' });
  };
  const pick = (i: number): void => {
    if (opts[i]?.disabled) return;
    if (select.selectedIndex !== i) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync();
  };
  const show = (): void => {
    if (open) return;
    open = true;
    // Open toward the room there is: up when the trigger sits low in the viewport.
    const r = button.getBoundingClientRect();
    wrap.classList.toggle('dd-up', r.bottom > innerHeight * 0.62 && r.top > 260);
    wrap.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    highlight(select.selectedIndex < 0 ? 0 : select.selectedIndex);
    document.addEventListener('pointerdown', onOutside, true);
  };
  const hide = (refocus = false): void => {
    if (!open) return;
    open = false;
    wrap.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
    document.removeEventListener('pointerdown', onOutside, true);
    if (refocus) button.focus();
  };
  const onOutside = (e: Event): void => {
    if (!wrap.contains(e.target as Node)) hide();
  };

  const onKey = (e: KeyboardEvent): void => {
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
        e.preventDefault();
        show();
        if (k === 'ArrowUp') highlight(active - 1);
      } else if (k.length === 1 && /\S/.test(k)) {
        typeahead(k, true);
      }
      return;
    }
    switch (k) {
      case 'ArrowDown':
        e.preventDefault();
        highlight(active + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlight(active - 1);
        break;
      case 'Home':
        e.preventDefault();
        highlight(0);
        break;
      case 'End':
        e.preventDefault();
        highlight(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(active);
        hide(true);
        break;
      case 'Escape':
        e.preventDefault();
        hide(true);
        break;
      case 'Tab':
        pick(active);
        hide();
        break;
      default:
        if (k.length === 1 && /\S/.test(k)) typeahead(k, false);
    }
  };
  const typeahead = (ch: string, commit: boolean): void => {
    const now = performance.now();
    typed = now - typedAt > 700 ? ch : typed + ch;
    typedAt = now;
    const q = typed.toLowerCase();
    const start = (open ? active : select.selectedIndex) + (typed.length === 1 ? 1 : 0);
    for (let n = 0; n < items.length; n++) {
      const i = (start + n) % items.length;
      if (
        (items[i]?.textContent ?? '')
          .toLowerCase()
          .replace(/^(a|an) /, '')
          .startsWith(q) ||
        (items[i]?.textContent ?? '').toLowerCase().startsWith(q)
      ) {
        if (commit) pick(i);
        else highlight(i);
        return;
      }
    }
  };

  const onClick = (): void => (open ? hide() : show());
  const onListPointer = (e: PointerEvent): void => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('.dd-opt');
    if (!li) return;
    e.preventDefault(); // keep focus on the trigger
    pick(items.indexOf(li as HTMLLIElement));
    hide(true);
  };
  const onListMove = (e: PointerEvent): void => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('.dd-opt');
    if (li) highlight(items.indexOf(li as HTMLLIElement));
  };
  const onBlur = (e: FocusEvent): void => {
    if (!wrap.contains(e.relatedTarget as Node)) hide();
  };
  // Keep the mirror honest when scripts or form.reset() change the native select.
  const onNativeChange = (): void => sync();
  const form = select.form;
  const onReset = (): void => {
    requestAnimationFrame(sync);
  };

  // Scripts that focus the native select (e.g. after a validation error) land on the trigger.
  const onNativeFocus = (): void => button.focus();
  select.addEventListener('focus', onNativeFocus);
  button.addEventListener('click', onClick);
  button.addEventListener('keydown', onKey);
  button.addEventListener('blur', onBlur);
  list.addEventListener('pointerdown', onListPointer);
  list.addEventListener('pointermove', onListMove);
  select.addEventListener('change', onNativeChange);
  form?.addEventListener('reset', onReset);
  sync();

  return () => {
    hide();
    button.removeEventListener('click', onClick);
    button.removeEventListener('keydown', onKey);
    button.removeEventListener('blur', onBlur);
    list.removeEventListener('pointerdown', onListPointer);
    list.removeEventListener('pointermove', onListMove);
    select.removeEventListener('change', onNativeChange);
    select.removeEventListener('focus', onNativeFocus);
    form?.removeEventListener('reset', onReset);
  };
}
