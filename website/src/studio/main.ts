import '../styles/studio.css';
import { prefersReducedMotion } from '@snowbros/core';
import { inView, reveal } from '@snowbros/motion';
import { validateBrief } from './brief';
import { exeLinks } from './exe-link';
import { initScroll } from './scroll';
import { $, $$, initStudioShell } from './shell';

const shell = initStudioShell(['work', 'studio', 'build']);
const frost = shell.frost;
const disposeExe = exeLinks();
// GSAP arrives after first paint: nothing above the fold waits for it.
let disposeScroll: () => void = () => {};
const startScroll = () =>
  initScroll()
    .then((d) => (disposeScroll = d))
    .catch((e) => console.error('[scroll]', e));
if ('requestIdleCallback' in window) requestIdleCallback(startScroll, { timeout: 1500 });
else setTimeout(startScroll, 600);

// Hovering or focusing a project makes its emblem the form the crystals hold.
for (const row of $$('[data-case-row]')) {
  const zone = $('[data-frost]', row);
  if (!zone) continue;
  const on = () => frost?.prefer(zone);
  const off = () => frost?.prefer(null);
  row.addEventListener('pointerenter', on);
  row.addEventListener('pointerleave', off);
  row.addEventListener('focusin', on);
  row.addEventListener('focusout', off);
}

reveal($$('.case-row'), { preset: 'fade-up', duration: 0.8, inView: { amount: 0.15 } });
// Project media unmask from the bottom once, as each case enters.
inView($$('.case'), (el) => el.classList.add('is-in'), { amount: 0.2 });

// ------------------------------------------------------------------ case studies
const dialog = $<HTMLDialogElement>('[data-case-dialog]');
const docsHome = $('[data-docs]');
let openSlug: string | null = null;
let opener: HTMLElement | null = null;
let pushed = false;

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

function withTransition(names: [HTMLElement | null, HTMLElement | null], update: () => void): void {
  const doc = document as VTDoc;
  if (!doc.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  const [from, to] = names;
  if (from) from.style.viewTransitionName = 'case-media';
  const vt = doc.startViewTransition(() => {
    if (from) from.style.viewTransitionName = '';
    update();
    // Opening: the doc's media is the destination. Closing: the row's media is.
    const media = to ?? (openSlug ? $(`[data-doc="${openSlug}"] .doc-media`) : null);
    if (media) media.style.viewTransitionName = 'case-media';
  });
  const quiet = (x: Promise<unknown> | undefined) => x?.catch(() => {});
  quiet((vt as unknown as { ready?: Promise<unknown> }).ready);
  quiet((vt as unknown as { updateCallbackDone?: Promise<unknown> }).updateCallbackDone);
  vt.finished
    .catch(() => {})
    .finally(() => {
      for (const el of $$('.doc-media, .case-media')) el.style.viewTransitionName = '';
    });
}

function openCase(slug: string, push: boolean, from?: HTMLElement | null): void {
  const doc = document.getElementById(`case-${slug}`);
  if (!dialog || !doc) return;
  const rowMedia = from ? $(`#work-${slug} .case-media`) : null;
  withTransition([rowMedia, null], () => {
    if (openSlug && openSlug !== slug) {
      const prev = document.getElementById(`case-${openSlug}`);
      if (prev) docsHome?.append(prev);
    }
    openSlug = slug;
    dialog.replaceChildren(doc);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    document.documentElement.classList.add('case-open');
    $<HTMLElement>('.doc-title', doc)?.focus({ preventScroll: true });
  });
  if (push) {
    history.pushState({ case: slug }, '', `#case-${slug}`);
    pushed = true;
  }
}

function closeCase(fromHistory: boolean): void {
  if (!dialog?.open || !openSlug) return;
  const slug = openSlug;
  const doc = document.getElementById(`case-${slug}`);
  const docMedia = doc ? $('.doc-media', doc) : null;
  const rowMedia = $(`#work-${slug} .case-media`);
  withTransition([docMedia, rowMedia], () => {
    if (doc) docsHome?.append(doc);
    dialog.close();
    document.documentElement.classList.remove('case-open');
    openSlug = null;
  });
  (opener ?? $(`#work-${slug} [data-case-open]`))?.focus({ preventScroll: true });
  opener = null;
  if (!fromHistory) {
    if (pushed && history.state?.case) history.back();
    else history.replaceState(null, '', `#work-${slug}`);
  }
  pushed = false;
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const open = t.closest<HTMLElement>('[data-case-open]');
  if (open?.dataset.caseOpen) {
    e.preventDefault();
    if (!dialog?.open) opener = open;
    const inDialog = !!dialog?.contains(open);
    openCase(open.dataset.caseOpen, !inDialog, inDialog ? null : open);
    if (inDialog)
      history.replaceState({ case: open.dataset.caseOpen }, '', `#case-${open.dataset.caseOpen}`);
    return;
  }
  if (t.closest('[data-case-close]')) {
    e.preventDefault();
    closeCase(false);
  }
});
dialog?.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeCase(false);
});
addEventListener('popstate', () => {
  const m = location.hash.match(/^#case-([\w-]+)$/);
  if (m?.[1]) openCase(m[1], false);
  else closeCase(true);
});
const initial = location.hash.match(/^#case-([\w-]+)$/);
if (initial?.[1]) openCase(initial[1], false);

// ------------------------------------------------------------------ copy
const copyStatus = $('[data-copy-status]');
for (const btn of $$<HTMLButtonElement>('[data-copy-text]')) {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copyText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      if (copyStatus) copyStatus.textContent = 'Address copied';
    } catch {
      if (copyStatus) copyStatus.textContent = `Copy failed — the address is ${text}`;
    }
    window.setTimeout(() => {
      if (copyStatus) copyStatus.textContent = '';
    }, 2400);
  });
}

// ------------------------------------------------------------------ brief form
const form = $<HTMLFormElement>('[data-brief]');
const status = $('[data-brief-status]');
const send = $<HTMLButtonElement>('[data-brief-send]');
form?.addEventListener('input', (e) => {
  const el = e.target as HTMLElement;
  if (el.getAttribute('aria-invalid') === 'true') {
    el.removeAttribute('aria-invalid');
    if (status?.dataset.tone === 'error') status.textContent = '';
  }
});
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form || !status || !send) return;
  const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const check = validateBrief(data);
  for (const el of $$('[aria-invalid]', form)) el.removeAttribute('aria-invalid');
  if (!check.ok) {
    const field = form.elements.namedItem(check.field) as HTMLElement | null;
    field?.setAttribute('aria-invalid', 'true');
    field?.focus();
    status.textContent = check.error;
    status.dataset.tone = 'error';
    return;
  }
  send.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.dataset.tone = '';
  status.textContent = 'Sending…';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !out.ok) throw new Error(out.error || 'We could not send that just now.');
    const r = send.getBoundingClientRect();
    frost?.strike(r.left + r.width / 2, r.top + r.height / 2, 1);
    status.dataset.tone = 'ok';
    status.textContent = `Sent. We will reply to ${check.brief.email}.`;
    form.reset();
  } catch (err) {
    status.dataset.tone = 'error';
    status.textContent = `${err instanceof Error ? err.message : 'We could not send that just now.'} You can also email snowbros2107@gmail.com.`;
  } finally {
    send.disabled = false;
    form.removeAttribute('aria-busy');
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    shell.dispose();
    disposeExe();
    disposeScroll();
  });
}
