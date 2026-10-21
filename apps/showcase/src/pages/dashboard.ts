/**
 * Toolkit Ops — functional product UI built on the SNOWBROS toolkit.
 * Motion here is feedback only: FLIP for reordering, short palette entrance, no flourishes.
 */
import {
  capabilities,
  createScope,
  deviceTier,
  motionPreference,
  Priority,
  type Scope,
  setMotionPreference,
  ticker,
} from '@snowbros/core';
import { spotlight } from '@snowbros/fx';
import { animate, flip, inView } from '@snowbros/motion';
import { brandMark, initShell } from '../shell.js';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode / blocked): state stays in memory.
    }
  },
};

const scope = initShell();
for (const slot of $$('[data-brand-mark]')) slot.outerHTML = brandMark;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
for (const k of $$('[data-kbd]')) k.textContent = isMac ? '⌘K' : 'Ctrl K';

// ------------------------------------------------------------------ toasts
function toast(message: string, ms = 5000) {
  const region = $('[data-toasts]');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'ops-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = '<p></p><button class="ops-toast-dismiss" type="button">Dismiss</button>';
  el.querySelector('p')!.textContent = message;
  region.appendChild(el);
  animate(
    el,
    { y: [8, 0], opacity: [0, 1] },
    { duration: 0.16, ease: 'cubic-bezier(0, 0, 0.38, 0.9)' },
  );
  let remaining = ms;
  let started = performance.now();
  let timer = window.setTimeout(remove, remaining);
  function remove() {
    window.clearTimeout(timer);
    el.remove();
  }
  const pause = () => {
    window.clearTimeout(timer);
    remaining -= performance.now() - started;
  };
  const resume = () => {
    started = performance.now();
    timer = window.setTimeout(remove, Math.max(remaining, 1500));
  };
  el.addEventListener('mouseenter', pause);
  el.addEventListener('mouseleave', resume);
  el.addEventListener('focusin', pause);
  el.addEventListener('focusout', resume);
  el.querySelector('button')!.addEventListener('click', remove);
}

// ------------------------------------------------------------------ onboarding
type Task = 'palette' | 'sort' | 'registry';
const TASKS_KEY = 'sb-ops-tasks';
const done = new Set<Task>(storage.get<Task[]>(TASKS_KEY, []));
function renderTasks() {
  for (const li of $$('[data-task]')) {
    const isDone = done.has(li.dataset.task as Task);
    li.dataset.done = String(isDone);
    const state = $('[data-task-state]', li);
    if (state) state.textContent = isDone ? 'done' : 'not done';
  }
}
function completeTask(task: Task) {
  if (done.has(task)) return;
  done.add(task);
  storage.set(TASKS_KEY, [...done]);
  renderTasks();
  if (done.size === 3) toast('All three tried. The checklist is yours to dismiss.');
}
function initOnboarding(s: Scope) {
  const card = $('[data-onboarding]');
  if (!card) return;
  if (storage.get('sb-ops-onboarding-dismissed', false)) card.hidden = true;
  renderTasks();
  const btn = $<HTMLButtonElement>('[data-onboarding-dismiss]', card);
  if (btn)
    s.listen(btn, 'click', () => {
      card.hidden = true;
      storage.set('sb-ops-onboarding-dismissed', true);
      ($('#packages-title') as HTMLElement | null)?.focus?.();
      toast('Tips dismissed.');
    });
}

// ------------------------------------------------------------------ section tracking
function initSectionNav(s: Scope) {
  const links = $$<HTMLAnchorElement>('[data-section-link]');
  const set = (id: string) => {
    for (const a of links) {
      if (a.dataset.sectionLink === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  set('overview');
  s.add(
    inView(
      $$('[data-section]'),
      (el) => {
        set((el as HTMLElement).dataset.section ?? 'overview');
      },
      { once: false, amount: 0, margin: '-35% 0px -60% 0px' },
    ),
  );
}

// ------------------------------------------------------------------ packages table
type Status = 'stable' | 'beta' | 'experimental';
interface Pkg {
  name: string;
  description: string;
  version: string;
  status: Status;
  tests: number | null;
  license: string;
}
const PACKAGES: Pkg[] = [
  {
    name: 'core',
    description: 'Shared ticker, easing, springs, scopes, capability detection.',
    version: '0.1.0',
    status: 'beta',
    tests: 23,
    license: 'MIT OR Apache-2.0',
  },
  {
    name: 'motion',
    description: 'Timelines, scroll progress, sticky pins, split text, FLIP.',
    version: '0.1.0',
    status: 'beta',
    tests: 18,
    license: 'MIT OR Apache-2.0',
  },
  {
    name: 'fx',
    description: 'Magnetic, tilt, cursor, marquee, noise and flow fields.',
    version: '0.1.0',
    status: 'experimental',
    tests: 20,
    license: 'MIT OR Apache-2.0',
  },
  {
    name: 'scene',
    description: 'Three.js stages, camera rigs, fallbacks, adaptive quality.',
    version: '0.1.0',
    status: 'experimental',
    tests: 13,
    license: 'MIT OR Apache-2.0',
  },
  {
    name: 'react',
    description: 'Hooks and components with correct effect cleanup.',
    version: '0.1.0',
    status: 'beta',
    tests: 4,
    license: 'MIT OR Apache-2.0',
  },
  {
    name: 'elements',
    description: 'Light-DOM Web Components for any framework.',
    version: '0.1.0',
    status: 'beta',
    tests: 3,
    license: 'MIT OR Apache-2.0',
  },
  {
    name: 'tokens',
    description: 'DTCG tokens: functional and expressive motion scales.',
    version: '0.1.0',
    status: 'stable',
    tests: null,
    license: 'MIT OR Apache-2.0',
  },
  {
    name: 'adapters',
    description: 'Interop with Lenis, GSAP and Motion via structural types.',
    version: '0.1.0',
    status: 'experimental',
    tests: 3,
    license: 'MIT OR Apache-2.0',
  },
];
const STATUS_ORDER: Record<Status, number> = { stable: 0, beta: 1, experimental: 2 };

type SortKey = 'name' | 'version' | 'status' | 'tests';
const tableState = {
  sort: null as null | { key: SortKey; dir: 'ascending' | 'descending' },
  query: '',
  status: 'all' as 'all' | Status,
};

function compare(a: Pkg, b: Pkg, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'version':
      return a.version.localeCompare(b.version, undefined, { numeric: true });
    case 'status':
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case 'tests':
      return (a.tests ?? -1) - (b.tests ?? -1);
  }
}

function initTable(s: Scope) {
  const body = $('[data-pkg-body]');
  const empty = $('[data-empty]');
  const count = $('[data-result-count]');
  const filter = $<HTMLInputElement>('#pkg-filter');
  if (!body || !empty || !count || !filter) return;

  const rows = new Map<string, HTMLTableRowElement>();
  for (const p of PACKAGES) {
    const tr = document.createElement('tr');
    tr.dataset.pkg = p.name;
    tr.innerHTML = `
      <th scope="row" class="ops-pkg"><span class="ops-pkg-scope">@snowbros/</span>${p.name}</th>
      <td class="ops-desc"></td>
      <td class="ops-version">${p.version}</td>
      <td><span class="ops-status" data-status="${p.status}">${p.status}</span></td>
      <td class="ops-num">${p.tests ?? '<span aria-label="No unit tests">—</span>'}</td>
      <td class="ops-license">${p.license}</td>`;
    tr.querySelector('.ops-desc')!.textContent = p.description;
    rows.set(p.name, tr);
    body.appendChild(tr);
  }

  const apply = (animated = true) => {
    const q = tableState.query.trim().toLowerCase();
    let list = PACKAGES.filter(
      (p) =>
        (tableState.status === 'all' || p.status === tableState.status) &&
        (!q ||
          p.name.includes(q) ||
          `@snowbros/${p.name}`.includes(q) ||
          p.description.toLowerCase().includes(q)),
    );
    if (tableState.sort) {
      const { key, dir } = tableState.sort;
      list = [...list].sort((a, b) => compare(a, b, key) * (dir === 'ascending' ? 1 : -1));
    }
    const mutate = () => {
      const visible = new Set(list.map((p) => p.name));
      for (const [name, tr] of rows) tr.hidden = !visible.has(name);
      for (const p of list) body.appendChild(rows.get(p.name)!);
      empty.hidden = list.length > 0;
      count.textContent = `${list.length} ${list.length === 1 ? 'package' : 'packages'}`;
    };
    if (animated) void flip([...rows.values()], mutate, { duration: 0.24 });
    else mutate();
  };

  for (const th of $$<HTMLTableCellElement>('th[data-sort-key]')) {
    const btn = $<HTMLButtonElement>('button', th)!;
    s.listen(btn, 'click', () => {
      const key = th.dataset.sortKey as SortKey;
      const dir =
        tableState.sort?.key === key && tableState.sort.dir === 'ascending'
          ? 'descending'
          : 'ascending';
      tableState.sort = { key, dir };
      for (const other of $$('th[data-sort-key]')) other.setAttribute('aria-sort', 'none');
      th.setAttribute('aria-sort', dir);
      apply();
      completeTask('sort');
    });
  }

  s.listen(filter, 'input', () => {
    tableState.query = filter.value;
    apply();
  });

  // Native radios: arrow-key roving, focus and checked state come from the browser.
  const radios = $$<HTMLInputElement>('.ops-segmented input[type="radio"]');
  const selectStatus = (radio: HTMLInputElement) => {
    radio.checked = true;
    tableState.status = radio.value as typeof tableState.status;
    apply();
  };
  for (const r of radios) s.listen(r, 'change', () => r.checked && selectStatus(r));

  const reset = $<HTMLButtonElement>('[data-reset-filters]');
  if (reset)
    s.listen(reset, 'click', () => {
      filter.value = '';
      tableState.query = '';
      selectStatus(radios[0]!);
      filter.focus();
    });

  apply(false);
  return {
    sortBy(key: SortKey, dir: 'ascending' | 'descending') {
      tableState.sort = { key, dir };
      for (const th of $$('th[data-sort-key]'))
        th.setAttribute('aria-sort', th.dataset.sortKey === key ? dir : 'none');
      apply();
      completeTask('sort');
    },
  };
}

// ------------------------------------------------------------------ performance
const settings = storage.get('sb-ops-settings', { budget: 16.7, window: 240, email: '' });

const perf = {
  samples: [] as number[],
  over: 0,
  paused: false,
  /** Sampling runs while any live readout (overview stat or chart) is on screen. */
  visibleCount: 0,
  stop: null as null | (() => void),
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
};

function initPerformance(s: Scope) {
  const panel = $('.ops-chart-panel');
  const line = $<SVGPathElement>('[data-chart-line]');
  const area = $<SVGPathElement>('[data-chart-area]');
  const budgetLine = $<SVGLineElement>('[data-budget-line]');
  const axisMax = $('[data-axis-max]');
  const summary = $('[data-chart-summary]');
  const toggle = $<HTMLButtonElement>('[data-sampling-toggle]');
  const out = {
    p50: $('[data-readout="p50"]'),
    p95: $('[data-readout="p95"]'),
    dropped: $('[data-readout="dropped"]'),
    state: $('[data-readout="state"]'),
    stat: $('[data-stat="p95"]'),
  };
  if (!panel || !line || !area || !budgetLine || !toggle) return { toggle: () => {} };

  const W = 600;
  const H = 180;
  let frameCount = 0;

  const draw = () => {
    const max = Math.max(settings.budget * 2, 8);
    if (axisMax) axisMax.textContent = `${Math.round(max)} ms`;
    const by = H - Math.min(settings.budget / max, 1) * H;
    budgetLine.setAttribute('y1', String(by));
    budgetLine.setAttribute('y2', String(by));
    const n = settings.window;
    const data = perf.samples;
    if (data.length < 2) return;
    const dx = W / (n - 1);
    const offset = n - data.length;
    let d = '';
    for (let i = 0; i < data.length; i++) {
      const x = (offset + i) * dx;
      const y = H - Math.min(data[i]! / max, 1) * H;
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    line.setAttribute('d', d);
    area.setAttribute('d', `${d}L${W} ${H}L${(offset * dx).toFixed(1)} ${H}Z`);
  };

  const readouts = () => {
    const p50 = percentile(perf.samples, 50);
    const p95 = percentile(perf.samples, 95);
    const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
    if (out.p50) out.p50.textContent = fmt(p50);
    if (out.p95) out.p95.textContent = fmt(p95);
    if (out.stat) out.stat.textContent = fmt(p95);
    if (out.dropped) out.dropped.textContent = String(perf.over);
    return { p50, p95 };
  };

  const sample = (f: { delta: number }) => {
    // Raw delta: undo timeScale is unnecessary (1); clamp from maxDelta keeps spikes bounded.
    const ms = f.delta * 1000;
    if (ms <= 0) return;
    perf.samples.push(ms);
    if (ms > settings.budget * 1.5) perf.over++;
    while (perf.samples.length > settings.window) perf.samples.shift();
    if (++frameCount % 3 === 0) {
      draw();
      readouts();
    }
  };

  const sync = () => {
    const visible = perf.visibleCount > 0;
    const run = !perf.paused && visible;
    if (run && !perf.stop) perf.stop = ticker.add(sample, Priority.render);
    if (!run && perf.stop) {
      perf.stop();
      perf.stop = null;
    }
    const state = perf.paused ? 'paused' : visible ? 'sampling' : 'offscreen';
    if (out.state) out.state.textContent = state;
    toggle.textContent = perf.paused ? 'Resume sampling' : 'Pause sampling';
    toggle.setAttribute('aria-pressed', String(perf.paused));
  };

  const live = [panel, out.stat?.closest('.ops-stat')].filter(Boolean) as Element[];
  s.add(
    inView(
      live,
      () => {
        perf.visibleCount++;
        sync();
        return () => {
          perf.visibleCount = Math.max(0, perf.visibleCount - 1);
          sync();
        };
      },
      { once: false, amount: 0, margin: '0px' },
    ),
  );
  sync();
  s.add(() => perf.stop?.());

  const toggleSampling = () => {
    perf.paused = !perf.paused;
    sync();
  };
  s.listen(toggle, 'click', toggleSampling);

  // Text alternative for the chart, refreshed every 2 s (not announced live).
  const interval = window.setInterval(() => {
    if (!summary) return;
    const { p50, p95 } = readouts();
    summary.textContent = Number.isFinite(p50)
      ? `Frame time over the last ${perf.samples.length} frames: median ${p50.toFixed(1)} ms, 95th percentile ${p95.toFixed(1)} ms, ${perf.over} frames over budget of ${settings.budget} ms.`
      : 'Collecting frame samples.';
  }, 2000);
  s.add(() => window.clearInterval(interval));

  draw();
  return { toggle: toggleSampling, redraw: draw };
}

function initCapabilities() {
  const dl = $('[data-caps]');
  if (!dl) return;
  const caps = capabilities();
  const entries: Array<[string, string | boolean]> = [
    ['Device tier', deviceTier()],
    ['WebGL 2', caps.webgl2],
    ['WebGPU (navigator.gpu)', caps.webgpu],
    ['CSS scroll timelines', caps.scrollTimeline],
    ['View Transitions', caps.viewTransitions],
    ['Hover-capable pointer', caps.hover],
    ['Save-Data', caps.saveData],
  ];
  const render = () => {
    dl.replaceChildren();
    const all: Array<[string, string | boolean]> = [
      ...entries,
      ['Motion preference', motionPreference.get()],
    ];
    for (const [k, v] of all) {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = typeof v === 'boolean' ? (v ? 'yes' : 'no') : v;
      if (typeof v === 'boolean') dd.dataset.value = v ? 'yes' : 'no';
      row.append(dt, dd);
      dl.appendChild(row);
    }
  };
  render();
  scope.add(motionPreference.subscribe(render));
}

// ------------------------------------------------------------------ registry check
const REGISTRY_URL = 'https://registry.npmjs.org/@snowbros%2Fatlas';

function initRegistry(s: Scope) {
  const btn = $<HTMLButtonElement>('[data-registry-check]');
  const body = $('[data-registry-state]');
  if (!btn || !body) return { run: async () => {} };
  let controller: AbortController | null = null;

  const run = async () => {
    controller?.abort();
    const c = new AbortController();
    controller = c;
    const timeout = window.setTimeout(
      () => c.abort(new DOMException('Timed out', 'TimeoutError')),
      8000,
    );
    s.add(() => c.abort());
    body.dataset.registryState = 'loading';
    body.setAttribute('aria-busy', 'true');
    body.innerHTML =
      '<div class="ops-skeleton" aria-hidden="true"><span></span><span></span></div><p class="visually-hidden">Checking the npm registry…</p>';
    btn.disabled = true;
    try {
      const res = await fetch(REGISTRY_URL, {
        signal: c.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Registry responded ${res.status}`);
      const data = (await res.json()) as {
        'dist-tags'?: { latest?: string };
        time?: Record<string, string>;
      };
      const latest = data['dist-tags']?.latest ?? 'unknown';
      const when = data.time?.[latest];
      body.dataset.registryState = 'success';
      body.innerHTML = `<div class="ops-registry-result"><dl>
        <div><dt class="label">Package</dt><dd>@snowbros/atlas</dd></div>
        <div><dt class="label">Latest</dt><dd data-registry-version></dd></div>
        <div><dt class="label">Published</dt><dd data-registry-time></dd></div>
        <div><dt class="label">Scope</dt><dd style="color:var(--ok)">reachable</dd></div></dl></div>`;
      $('[data-registry-version]', body)!.textContent = latest;
      $('[data-registry-time]', body)!.textContent = when
        ? new Date(when).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        : 'unknown';
      completeTask('registry');
    } catch (error) {
      if (controller !== c) return; // superseded by a newer request
      const reason =
        (error as DOMException)?.name === 'TimeoutError' || c.signal.reason?.name === 'TimeoutError'
          ? 'The request timed out after 8 seconds.'
          : !navigator.onLine
            ? 'You appear to be offline.'
            : (error as Error)?.message || 'The request failed.';
      body.dataset.registryState = 'error';
      body.innerHTML = `<div class="ops-registry-error" role="alert"><p><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v4M8 11v.5" stroke-linecap="round"/></svg><span data-registry-reason></span></p><button class="btn btn-ghost btn-sm" type="button" data-registry-retry>Retry</button></div>`;
      $('[data-registry-reason]', body)!.textContent = `Couldn't reach the registry. ${reason}`;
      $<HTMLButtonElement>('[data-registry-retry]', body)!.addEventListener(
        'click',
        () => void run(),
      );
    } finally {
      window.clearTimeout(timeout);
      if (controller === c) {
        btn.disabled = false;
        body.setAttribute('aria-busy', 'false');
      }
    }
  };
  s.listen(btn, 'click', () => void run());
  return { run };
}

// ------------------------------------------------------------------ settings
const MOTION_KEY = 'sb-motion';
const DRAFT_KEY = 'sb-ops-settings-draft';

function initSettings(s: Scope, onBudget: () => void) {
  const form = $<HTMLFormElement>('[data-settings]');
  const sw = $<HTMLButtonElement>('[data-motion-switch]');
  if (!form || !sw) return;
  const budget = form.elements.namedItem('budget') as HTMLInputElement;
  const windowSel = form.elements.namedItem('window') as HTMLSelectElement;
  const email = form.elements.namedItem('email') as HTMLInputElement;
  const status = $('[data-form-status]', form);

  // Restore saved values, then any unsaved draft (input is never lost on reload).
  budget.value = String(settings.budget);
  windowSel.value = String(settings.window);
  email.value = settings.email;
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as null | Record<
      string,
      string
    >;
    if (draft) {
      budget.value = draft.budget ?? budget.value;
      windowSel.value = draft.window ?? windowSel.value;
      email.value = draft.email ?? email.value;
      if (status) status.textContent = 'Unsaved changes restored.';
    }
  } catch {
    // ignore
  }
  s.listen(form, 'input', () => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ budget: budget.value, window: windowSel.value, email: email.value }),
      );
    } catch {
      // ignore
    }
    if (status) status.textContent = 'Unsaved changes.';
  });

  const setError = (field: HTMLInputElement, message: string) => {
    const out = $(`[data-error-for="${field.name}"]`, form);
    if (out) out.textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  };

  const validate = () => {
    const errors: HTMLInputElement[] = [];
    const b = Number(budget.value);
    if (budget.value.trim() === '' || !Number.isFinite(b)) {
      setError(budget, 'Enter a frame budget in milliseconds.');
      errors.push(budget);
    } else if (b < 4 || b > 50) {
      setError(budget, 'Frame budget must be between 4 and 50 ms.');
      errors.push(budget);
    } else setError(budget, '');
    const e = email.value.trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError(email, 'Enter an email like name@example.com, or leave it empty.');
      errors.push(email);
    } else setError(email, '');
    return errors;
  };

  s.listen(form, 'submit', (ev) => {
    ev.preventDefault();
    const errors = validate();
    if (errors.length) {
      errors[0]!.focus();
      if (status)
        status.textContent = `${errors.length} ${errors.length === 1 ? 'field needs' : 'fields need'} attention.`;
      return;
    }
    settings.budget = Number(budget.value);
    settings.window = Number(windowSel.value);
    settings.email = email.value.trim();
    storage.set('sb-ops-settings', settings);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    while (perf.samples.length > settings.window) perf.samples.shift();
    onBudget();
    if (status) status.textContent = 'All changes saved.';
    toast('Settings saved.');
  });
  // Clear an error as soon as the field becomes valid again.
  for (const f of [budget, email])
    s.listen(f, 'blur', () => f.hasAttribute('aria-invalid') && validate());

  const renderSwitch = () =>
    sw.setAttribute('aria-checked', String(motionPreference.get() === 'reduced'));
  s.listen(sw, 'click', () => {
    const next = motionPreference.get() === 'reduced' ? null : 'reduced';
    setMotionPreference(next);
    try {
      if (next) localStorage.setItem(MOTION_KEY, next);
      else localStorage.removeItem(MOTION_KEY);
    } catch {
      // ignore
    }
  });
  s.add(motionPreference.subscribe(renderSwitch));
  renderSwitch();
}

// ------------------------------------------------------------------ command palette
interface Action {
  id: string;
  label: string;
  group: string;
  run: () => void;
}

function score(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx >= 0) return 100 - idx;
  // Subsequence match: every character in order.
  let ti = 0;
  let gaps = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    gaps += found - ti;
    ti = found + 1;
  }
  return Math.max(1, 50 - gaps);
}

function initPalette(s: Scope, actions: Action[]) {
  const backdrop = $('[data-palette]');
  const dialog = $('[data-palette-dialog]');
  const input = $<HTMLInputElement>('[data-palette-input]');
  const list = $('[data-palette-list]');
  const empty = $('[data-palette-empty]');
  const countEl = $('[data-palette-count]');
  if (!backdrop || !dialog || !input || !list || !empty) return;
  let open = false;
  let restore: HTMLElement | null = null;
  let filtered: Action[] = actions;
  let active = 0;

  const render = () => {
    const q = input.value.trim();
    filtered = actions
      .map((a) => ({ a, s: Math.max(score(q, a.label), score(q, `${a.group} ${a.label}`) - 10) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .map((x) => x.a);
    active = Math.min(active, Math.max(filtered.length - 1, 0));
    list.replaceChildren();
    filtered.forEach((a, i) => {
      const li = document.createElement('div');
      li.id = `pal-${a.id}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.innerHTML = '<span></span><span class="ops-palette-group"></span>';
      li.children[0]!.textContent = a.label;
      li.children[1]!.textContent = a.group;
      li.addEventListener('mousemove', () => {
        if (active !== i) {
          active = i;
          updateActive();
        }
      });
      li.addEventListener('click', () => choose(i));
      list.appendChild(li);
    });
    empty.hidden = filtered.length > 0;
    list.hidden = filtered.length === 0;
    if (countEl)
      countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'action' : 'actions'}`;
    updateActive();
  };

  const updateActive = () => {
    const items = Array.from(list.children) as HTMLElement[];
    items.forEach((li, i) => {
      li.setAttribute('aria-selected', String(i === active));
    });
    const current = items[active];
    if (current) {
      input.setAttribute('aria-activedescendant', current.id);
      current.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const show = () => {
    if (open) return;
    open = true;
    restore = document.activeElement as HTMLElement | null;
    input.value = '';
    active = 0;
    render();
    backdrop.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    animate(
      dialog,
      { opacity: [0, 1], scale: [0.98, 1] },
      { duration: 0.16, ease: 'cubic-bezier(0, 0, 0.38, 0.9)' },
    );
    animate(backdrop, { opacity: [0, 1] }, { duration: 0.16, ease: 'linear' });
    input.focus();
    completeTask('palette');
  };

  const hide = (focusBack = true) => {
    if (!open) return;
    open = false;
    backdrop.hidden = true;
    document.documentElement.style.overflow = '';
    if (focusBack) restore?.focus({ preventScroll: true });
  };

  const choose = (i: number) => {
    const action = filtered[i];
    if (!action) return;
    hide(true);
    action.run();
  };

  s.listen(input, 'input', () => {
    active = 0;
    render();
  });
  s.listen(input, 'keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!filtered.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length;
      updateActive();
    } else if (e.key === 'Home' && filtered.length) {
      active = 0;
      updateActive();
    } else if (e.key === 'End' && filtered.length) {
      active = filtered.length - 1;
      updateActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    }
  });
  s.listen(document, 'keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (open) hide();
      else show();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    } else if (e.key === 'Tab') {
      // The input is the only focusable control; keep focus inside the dialog.
      e.preventDefault();
      input.focus();
    }
  });
  s.listen(backdrop, 'mousedown', (e) => {
    if (e.target === backdrop) hide();
  });
  for (const trigger of $$<HTMLButtonElement>('[data-palette-open]'))
    s.listen(trigger, 'click', show);
}

// ------------------------------------------------------------------ boot
const jump = (id: string) => () => {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({
    behavior: motionPreference.get() === 'reduced' ? 'auto' : 'smooth',
    block: 'start',
  });
  const heading = target.querySelector<HTMLElement>('h1, h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
};

const page = createScope();
scope.add(page);
initOnboarding(page);
initSectionNav(page);
const table = initTable(page);
const perfCtl = initPerformance(page);
initCapabilities();
const registry = initRegistry(page);
initSettings(page, () => perfCtl.redraw?.());
initPalette(page, [
  { id: 'go-overview', label: 'Go to Overview', group: 'Navigate', run: jump('overview') },
  { id: 'go-packages', label: 'Go to Packages', group: 'Navigate', run: jump('packages') },
  { id: 'go-performance', label: 'Go to Performance', group: 'Navigate', run: jump('performance') },
  { id: 'go-settings', label: 'Go to Settings', group: 'Navigate', run: jump('settings') },
  {
    id: 'sort-tests',
    label: 'Sort packages by tests',
    group: 'Packages',
    run: () => {
      table?.sortBy('tests', 'descending');
      toast('Sorted by tests, most first.');
    },
  },
  {
    id: 'toggle-motion',
    label: 'Toggle reduced motion',
    group: 'Preferences',
    run: () => {
      const next = motionPreference.get() === 'reduced' ? null : 'reduced';
      setMotionPreference(next);
      try {
        if (next) localStorage.setItem(MOTION_KEY, next);
        else localStorage.removeItem(MOTION_KEY);
      } catch {
        // ignore
      }
      toast(next ? 'Reduced motion on.' : 'Reduced motion off.');
    },
  },
  {
    id: 'toggle-sampling',
    label: 'Pause or resume frame sampling',
    group: 'Performance',
    run: () => {
      perfCtl.toggle();
      toast(perf.paused ? 'Frame sampling paused.' : 'Frame sampling resumed.');
    },
  },
  {
    id: 'registry',
    label: 'Run npm registry check',
    group: 'Performance',
    run: () => {
      jump('performance')();
      void registry.run();
    },
  },
]);

for (const panel of $$('[data-spotlight]')) page.add(spotlight(panel, { radius: 360 }));
