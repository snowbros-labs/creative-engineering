/**
 * 04 — System map. Packages as layered nodes; wires drawn from measured positions. Selecting a
 * node lights everything it pulls in (transitively) and shows real metadata. Hover previews,
 * click/Enter pins. Reduced motion: identical (only colour transitions are used).
 */
import type { Scope } from '@snowbros/core';

interface PkgInfo {
  title: string;
  about: string;
  deps: string[];
  peers?: string;
  size?: string;
  install: string;
}

// Mirrors packages/*/package.json (dependencies) and measured dist sizes (gzip, unminified).
const PKGS: Record<string, PkgInfo> = {
  skill: {
    title: 'snowbros-creative',
    about:
      'The agent skill: recon → direction → plan → build → verify. Uses the packages when they fit, the project’s own stack when they don’t.',
    deps: ['motion', 'fx', 'scene', 'react', 'elements', 'adapters', 'tokens'],
    install: 'cp -r skills/snowbros-creative ~/.claude/skills/',
  },
  react: {
    title: '@snowbros/react',
    about: 'Hooks and components with StrictMode-safe cleanup; per-frame values never re-render.',
    deps: ['core', 'motion', 'fx'],
    peers: 'react ≥ 18.2',
    size: '3.4 KB',
    install: 'npm install @snowbros/react',
  },
  elements: {
    title: '@snowbros/elements',
    about: 'Light-DOM Web Components for Vue, Svelte, Astro and plain HTML.',
    deps: ['core', 'motion', 'fx'],
    size: '2.5 KB',
    install: 'npm install @snowbros/elements',
  },
  adapters: {
    title: '@snowbros/adapters',
    about:
      'Share one frame loop with Lenis, GSAP or Motion and scrub their timelines — without bundling them.',
    deps: ['core'],
    peers: 'lenis, gsap, motion (all optional)',
    size: '1.2 KB',
    install: 'npm install @snowbros/adapters',
  },
  motion: {
    title: '@snowbros/motion',
    about:
      'Timelines, scroll progress, scrubbing, sticky pins, accessible split text, FLIP, view transitions.',
    deps: ['core'],
    size: '17.0 KB',
    install: 'npm install @snowbros/motion',
  },
  fx: {
    title: '@snowbros/fx',
    about:
      'Magnetic, tilt, spotlight, cursor, image reveals, scramble, path drawing, marquee, flow fields.',
    deps: ['core', 'motion'],
    size: '13.9 KB',
    install: 'npm install @snowbros/fx',
  },
  scene: {
    title: '@snowbros/scene',
    about:
      'Managed three.js stages: on-demand rendering, DPR caps, quality governor, camera rigs, fallbacks.',
    deps: ['core'],
    peers: 'three ≥ 0.159',
    size: '11.9 KB',
    install: 'npm install @snowbros/scene three',
  },
  core: {
    title: '@snowbros/core',
    about:
      'One ticker, easing, springs, lifecycle scopes, signals, capability and motion-preference detection. Zero dependencies.',
    deps: [],
    size: '8.9 KB',
    install: 'npm install @snowbros/core',
  },
  tokens: {
    title: '@snowbros/tokens',
    about:
      'Functional and expressive motion scales, type, spacing and colour as DTCG JSON, CSS variables and TS.',
    deps: [],
    size: '1.5 KB',
    install: 'npm install @snowbros/tokens',
  },
};

const closure = (id: string, seen = new Set<string>()): Set<string> => {
  for (const d of PKGS[id]?.deps ?? []) {
    if (!seen.has(d)) {
      seen.add(d);
      closure(d, seen);
    }
  }
  return seen;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function initSystem(scope: Scope): void {
  const map = document.querySelector<HTMLElement>('[data-system]');
  const wires = document.querySelector<SVGSVGElement>('[data-system-wires]');
  const detail = document.querySelector<HTMLElement>('[data-system-detail]');
  if (!map || !wires || !detail) return;
  const nodes = new Map<string, HTMLButtonElement>();
  for (const n of map.querySelectorAll<HTMLButtonElement>('[data-node]'))
    nodes.set(n.dataset.node!, n);

  const draw = () => {
    const box = map.getBoundingClientRect();
    let html = '';
    for (const [id, info] of Object.entries(PKGS)) {
      const from = nodes.get(id)?.getBoundingClientRect();
      if (!from) continue;
      for (const dep of info.deps) {
        // The skill's wires would be noise; it is shown as using everything when selected.
        if (id === 'skill') continue;
        const to = nodes.get(dep)?.getBoundingClientRect();
        if (!to) continue;
        const x1 = from.left + from.width / 2 - box.left;
        const y1 = from.bottom - box.top;
        const x2 = to.left + to.width / 2 - box.left;
        const y2 = to.top - box.top;
        const my = (y1 + y2) / 2;
        html += `<path data-from="${id}" data-to="${dep}" d="M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}"/>`;
      }
    }
    wires.innerHTML = html;
    paint();
  };

  let pinned: string | null = null;
  let hover: string | null = null;
  const paint = () => {
    const id = hover ?? pinned;
    const lit = id ? closure(id) : new Set<string>();
    if (id) map.dataset.focus = id;
    else delete map.dataset.focus;
    for (const [nid, el] of nodes) {
      el.dataset.on = String(lit.has(nid));
      el.setAttribute('aria-pressed', String(nid === pinned));
    }
    for (const w of wires.querySelectorAll<SVGPathElement>('path')) {
      const on =
        !!id && (w.dataset.from === id || lit.has(w.dataset.from!)) && lit.has(w.dataset.to!);
      w.dataset.on = String(on);
    }
    const show = pinned ?? hover ?? 'core';
    const info = PKGS[show]!;
    const brings =
      [...closure(show)].map((d) => PKGS[d]!.title).join(', ') || 'nothing — zero dependencies';
    detail.innerHTML = `
      <div><p class="label">${show === 'skill' ? 'Agent skill' : 'Package'}</p><h3>${esc(info.title)}</h3></div>
      <div>
        <p>${esc(info.about)}</p>
        <dl style="margin-top:16px">
          <dt>Brings</dt><dd>${esc(brings)}</dd>
          ${info.peers ? `<dt>Peers</dt><dd>${esc(info.peers)}</dd>` : ''}
          ${info.size ? `<dt>Size</dt><dd>${info.size} gzip (dist, unminified)</dd>` : ''}
          <dt>Install</dt><dd class="mono">${esc(info.install)}</dd>
        </dl>
      </div>`;
  };

  for (const [id, el] of nodes) {
    scope.listen(el, 'click', () => {
      pinned = pinned === id ? null : id;
      paint();
    });
    scope.listen(el, 'pointerenter', () => {
      hover = id;
      paint();
    });
    scope.listen(el, 'pointerleave', () => {
      hover = null;
      paint();
    });
  }

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(draw);
    ro.observe(map);
    scope.add(() => ro.disconnect());
  }
  draw();
  // Fonts change node widths; redraw once they settle.
  void document.fonts?.ready.then(() => !scope.disposed && draw());
}
