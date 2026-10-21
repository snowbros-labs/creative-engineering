/**
 * Copy buttons: `<button data-copy="key">` copies `[data-code="key"]`. Delegated, so code blocks
 * rendered later (labs) work too. Clipboard blocked → selects the text and says so.
 */
import type { Scope } from '@snowbros/core';

export function initCopyButtons(scope: Scope): void {
  const announce = (msg: string) => {
    const status = document.querySelector('[data-copy-status]');
    if (status) status.textContent = msg;
  };
  scope.listen(document, 'click', async (e: Event) => {
    const btn = (e.target as Element | null)?.closest<HTMLButtonElement>('button[data-copy]');
    if (!btn) return;
    const target = document.querySelector(`[data-code="${btn.dataset.copy}"]`);
    const text = target?.textContent ?? '';
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    announce(
      ok ? 'Copied to clipboard.' : 'Copy blocked by the browser. Text selected: press Ctrl/⌘ + C.',
    );
    btn.textContent = ok ? 'Copied' : 'Selected';
    window.setTimeout(() => {
      btn.textContent = 'Copy';
    }, 1600);
  });
}
