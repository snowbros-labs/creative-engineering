/**
 * Lab C — Space. The lattice in its own stage: drag/keys to rotate (createOrbitInertia),
 * rebuild geometry from controls, optional particles. Renders on demand — the "frames drawn"
 * readout only moves while something changes. `withFallback` gives no-WebGL and reduced-motion
 * visitors the SVG drawing instead. "Unmount + remount" exercises full GPU cleanup.
 */
import type { Scope } from '@snowbros/core';
import { withFallback } from '@snowbros/scene';
import { buildLattice } from '../lattice/geometry.js';
import { latticeSvg } from '../lattice/svg.js';

export function init(root: HTMLElement, scope: Scope): void {
  const host = root.querySelector<HTMLElement>('[data-space-host]');
  const form = root.querySelector<HTMLFormElement>('[data-space-form]');
  const log = root.querySelector('[data-space-log]');
  const sr = (k: string) => root.querySelector(`[data-sr="${k}"]`);
  if (!host || !form) return;

  const values = () => {
    const f = new FormData(form);
    return {
      growth: Number(f.get('growth')),
      detail: Number(f.get('detail')),
      relief: Number(f.get('relief')),
      seed: Number(f.get('seed')),
      snow: f.get('snow') === 'on',
      spin: f.get('spin') === 'on',
    };
  };
  for (const out of root.querySelectorAll<HTMLOutputElement>('[data-out]')) {
    const input = form.elements.namedItem(out.dataset.out!) as HTMLInputElement | null;
    if (!input) continue;
    const fmt = () => {
      out.textContent = input.name === 'seed' ? input.value : Number(input.value).toFixed(2);
    };
    fmt();
    scope.listen(input, 'input', fmt);
  }

  let api: import('./space-scene.js').SpaceApi | null = null;
  let mount: { dispose(): void } | null = null;

  const start = () => {
    mount = withFallback(host, {
      respectReducedMotion: true,
      rootMargin: '200px',
      onDecision: (mode, reason) => {
        const m = sr('mode');
        if (m) m.textContent = mode === '3d' ? 'webgl' : `svg (${reason})`;
      },
      fallback: (el) => {
        const v = values();
        el.replaceChildren(
          latticeSvg(buildLattice({ seed: v.seed, detail: v.detail, relief: v.relief }), {
            label: 'Snow crystal lattice drawing (static fallback)',
          }),
        );
      },
      render: async (el, renderScope) => {
        const { mountSpace } = await import('./space-scene.js');
        if (renderScope.disposed) return;
        api = mountSpace(el, renderScope, values(), (s) => {
          const set = (k: string, v: string) => {
            const n = sr(k);
            if (n) n.textContent = v;
          };
          set('frames', String(s.frames));
          set('calls', String(s.calls));
          set('geo', String(s.geometries));
          set('dpr', s.dpr.toFixed(2));
        });
        renderScope.add(() => {
          api = null;
        });
      },
    });
  };
  start();
  scope.add(() => mount?.dispose());

  scope.listen(form, 'input', () => {
    const v = values();
    if (api) api.update(v);
    else if (host.dataset.sbRender === 'fallback') {
      host.replaceChildren(
        latticeSvg(buildLattice({ seed: v.seed, detail: v.detail, relief: v.relief }), {
          label: 'Snow crystal lattice drawing (static fallback)',
        }),
      );
    }
  });
  const regrow = root.querySelector('[data-space-regrow]');
  if (regrow) scope.listen(regrow, 'click', () => api?.regrow());
  const remount = root.querySelector('[data-space-remount]');
  if (remount)
    scope.listen(remount, 'click', () => {
      const before = api?.memory();
      mount?.dispose();
      host.replaceChildren();
      delete host.dataset.sbRender;
      start();
      if (log)
        log.textContent = before
          ? `Disposed stage (${before.geometries} geometries, ${before.textures} textures, WebGL context released) and mounted a new one.`
          : 'Remounted.';
    });
}
