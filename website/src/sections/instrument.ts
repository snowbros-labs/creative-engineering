/**
 * 01 — The Instrument. Hero + six dimensions on one sticky stage, driven by one clock.
 *
 * Desktop + full motion: the section pins for ~5 viewports; scroll progress grows, turns and
 * labels the lattice until the hero headline has become a diagram of the toolkit.
 * Everything else (mobile, reduced motion, no JS): hero with a static SVG lattice, then the six
 * dimensions as a readable list, each with its own glyph. Reduced-motion policy: `minimal`.
 */
import {
  capabilities,
  clamp,
  createMediaContext,
  createSignal,
  type Scope,
  segment,
} from '@snowbros/core';
import { animate, pin, revealText, scrub } from '@snowbros/motion';
import { buildLattice, type Lattice, project } from '../lattice/geometry.js';
import type { LatticeView } from '../lattice/scene.js';
import { latticeSvg } from '../lattice/svg.js';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const DEG = Math.PI / 180;
/** Rotation that points arm `c` (fractional) at the chapter text on the left. */
const armToLeft = (c: number) => (90 - 60 * c) * DEG;

interface Renderer {
  setGrowth(v: number): void;
  setPose(p: { rotZ?: number; tilt?: number; x?: number; scale?: number }): void;
  setFocus(arm: number, amount: number, all?: number): void;
  onTips(cb: (tips: Array<[number, number]>) => void): void;
}

/** SVG renderer with the same interface as the WebGL one (pose via CSS transforms). */
function svgRenderer(host: HTMLElement, lattice: Lattice): Renderer {
  const svg = latticeSvg(lattice);
  host.append(svg);
  const pose = { rotZ: 0, tilt: 0, x: 0, scale: 1 };
  let tipsCb: ((t: Array<[number, number]>) => void) | null = null;
  const paint = () => {
    svg.style.transform = `translateX(${pose.x * 22}vw) rotate(${-pose.rotZ}rad) scale(${pose.scale})`;
    if (!tipsCb) return;
    const hostBox = host.getBoundingClientRect();
    const box = svg.getBoundingClientRect();
    // Bounding box of a rotated SVG grows; derive the centre and the unrotated radius instead.
    const cx = box.left + box.width / 2 - hostBox.left;
    const cy = box.top + box.height / 2 - hostBox.top;
    const r = (svg.clientWidth / 2.3) * pose.scale;
    tipsCb(
      lattice.tips.map((t) => {
        const [x, y] = project(t, pose.rotZ, 0);
        return [cx + x * r, cy - y * r];
      }),
    );
  };
  return {
    setGrowth: (v) => {
      svg.style.opacity = String(clamp(v * 1.4, 0, 1));
    },
    setPose: (p) => {
      Object.assign(pose, p);
      paint();
    },
    setFocus: (arm, amount, all = 0) => {
      const on = amount > 0.5 && all < 0.5;
      svg.classList.toggle('has-focus', on);
      for (const el of $$<SVGElement>('[data-arm]', svg)) {
        el.classList.toggle('is-focus', (on && Number(el.dataset.arm) === arm) || all > 0.5);
      }
    },
    onTips: (cb) => {
      tipsCb = cb;
      paint();
    },
  };
}

export function initInstrument(shell: Scope, clock = createSignal(0)): void {
  const section = $('[data-instrument]');
  const host = $('[data-lattice]');
  if (!section || !host) return;

  const lattice = buildLattice({ seed: 11, detail: 0.7, relief: 0.12 });
  const hero = $('[data-hero]', section)!;
  const stage = $('.instrument-stage', section)!;
  const dims = $$('.dim', section);
  const coda = $('[data-coda]', section);
  const callouts = $$('[data-callout]', section);
  const wires = $<SVGSVGElement>('[data-callout-lines]', section);
  const clockOut = $('[data-clock]');

  // Chapter glyphs (flow layout): each dimension highlights its own arm.
  for (const g of $$('[data-glyph]', section)) {
    g.replaceChildren(latticeSvg(lattice, { focus: Number(g.dataset.glyph), nodes: false }));
  }

  // Headline: masked line rise on load. Reduced motion → short fade (revealText policy).
  const title = $('[data-hero-title]', section);
  if (title)
    shell.add(revealText(title, { by: 'lines', preset: 'rise', trigger: 'load', delay: 0.1 }));
  const after = [$('[data-hero-lede]', section), $('[data-hero-ctas]', section)].filter(
    (el): el is HTMLElement => !!el,
  );
  shell.add(
    animate(
      after,
      { opacity: [0, 1], y: [16, 0] },
      {
        duration: 0.7,
        delay: 0.55,
        stagger: 0.08,
        ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
        reducedMotion: 'skip',
      },
    ),
  );

  // Phones: the crystal leaves the full-bleed stage and becomes a framed figure above the
  // headline (cropped off the right edge), so its branches never run behind the type.
  // Registered before the renderers so they mount straight into the plate.
  const plate = $('[data-hero-plate]', section);
  if (plate) {
    const home = { parent: host.parentElement, next: host.nextSibling };
    shell.add(
      createMediaContext({
        '(max-width: 799px)': (scope) => {
          plate.prepend(host);
          section.dataset.plate = 'on';
          scope.add(() => {
            delete section.dataset.plate;
            home.parent?.insertBefore(host, home.next);
          });
          // The figure opens like a shutter, then the crystal grows inside it.
          scope.add(
            animate(
              plate,
              { clipPath: ['inset(0% 0% 100% 0% round 20px)', 'inset(0% 0% 0% 0% round 20px)'] },
              {
                duration: 0.9,
                delay: 0.05,
                ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
                reducedMotion: 'skip',
              },
            ),
          );
          scope.add(() => {
            plate.style.clipPath = '';
          });
        },
      }),
    );
  }

  shell.add(
    createMediaContext({
      // ------------------------------------------------------------ pinned, full motion
      '(min-width: 800px) and full-motion': (scope) => {
        section.dataset.mode = 'pinned';
        scope.add(() => {
          delete section.dataset.mode;
          hero.style.cssText = '';
          for (const el of [...dims, ...callouts]) el.style.cssText = '';
          if (coda) coda.style.cssText = '';
          for (const d of dims) d.removeAttribute('data-active');
          wires?.replaceChildren();
        });

        let view: Renderer = svgRenderer(host, lattice);
        const svgEl = host.lastElementChild;
        scope.add(() => svgEl?.remove());
        let growth = 0;
        const intro = { g: 0 };

        const paint = (p: number) => {
          if (clockOut) clockOut.textContent = p.toFixed(3);
          // Hero leaves: rises and fades over the first 12 % of the pin.
          const h = segment(p, 0.02, 0.12);
          hero.style.opacity = String(1 - h);
          hero.style.transform = `translate3d(0, ${-h * 12}vh, 0)`;
          hero.style.visibility = h >= 1 ? 'hidden' : '';
          if (h < 0.5 && host.dataset.render === 'webgl') stage.dataset.cursor = 'strum';
          else delete stage.dataset.cursor;

          // Chapters: six equal slices of 12 %–90 %.
          const c = segment(p, 0.12, 0.9) * 6;
          const cc = clamp(c - 0.5, 0, 5);
          const inChapters = segment(p, 0.1, 0.14);
          dims.forEach((d, i) => {
            const enter = segment(c, i - 0.05, i + 0.25);
            const exit =
              i === dims.length - 1 ? segment(p, 0.9, 0.95) : segment(c, i + 0.8, i + 1.05);
            const o = enter * (1 - exit) * inChapters;
            d.style.opacity = String(o);
            d.style.transform = `translate3d(0, ${(1 - enter) * 28 - exit * 28}px, 0)`;
            d.toggleAttribute('data-active', o > 0.5);
          });
          const all = segment(p, 0.9, 0.97);
          if (coda) {
            coda.style.opacity = String(all);
            coda.style.transform = `translate3d(0, ${(1 - all) * 20}px, 0)`;
          }
          // Narrower desktops: shrink and push the crystal right so it never crosses the headline.
          const fitK = clamp((innerWidth / innerHeight) * 0.58, 0.78, 1);
          view.setPose({
            rotZ: armToLeft(cc) * inChapters,
            tilt: 0.35 - 0.2 * inChapters,
            x: 0.58 + (1 - fitK) * 0.9 - 0.16 * inChapters + 0.08 * all,
            scale: (1.22 - 0.3 * inChapters) * fitK,
          });
          view.setFocus(Math.round(cc), inChapters * (1 - all), all);
          // Labels accumulate: by the end the crystal is a labelled diagram of the system.
          callouts.forEach((el, i) => {
            const on = Math.max(segment(c, i + 0.1, i + 0.4), all);
            // The arm being explained points at the chapter text, which already names it; its
            // label would sit on top of that text, so it waits for the finished diagram.
            const explaining = Math.round(cc) === i && all < 0.5 && inChapters > 0.5;
            el.style.opacity = String(explaining ? 0 : on);
          });
        };

        const positionCallouts = (tips: Array<[number, number]>) => {
          if (!wires || !tips.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) return;
          const w = host.clientWidth;
          const h = host.clientHeight;
          const cx = tips.reduce((s, t) => s + t[0], 0) / tips.length;
          const cy = tips.reduce((s, t) => s + t[1], 0) / tips.length;
          let d = '';
          tips.forEach(([x, y], i) => {
            const el = callouts[i];
            if (!el) return;
            const dx = x - cx;
            const dy = y - cy;
            const len = Math.hypot(dx, dy) || 1;
            const lx = clamp(x + (dx / len) * 44, 16, w - 140);
            const ly = clamp(y + (dy / len) * 44, 80, h - 40);
            el.style.translate = `${lx - (dx < 0 ? el.offsetWidth : 0)}px ${ly - el.offsetHeight / 2}px`;
            if (Number(el.style.opacity) > 0.02)
              d += `M${x.toFixed(1)} ${y.toFixed(1)}L${lx.toFixed(1)} ${ly.toFixed(1)}`;
          });
          wires.innerHTML = d ? `<path d="${d}"/>` : '';
        };

        const p = pin(section, { distance: '480vh' });
        scope.add(p);
        scope.add(scrub({ duration: 0, seek: (v) => clock.set(v) }, p.progress, { smooth: 9 }));
        scope.add(clock.subscribe(paint));

        const attach = (r: Renderer) => {
          view = r;
          view.setGrowth(growth);
          view.onTips(positionCallouts);
          paint(clock.get());
        };
        attach(view);

        // Grow from the seed once, on load — never blocks input.
        scope.add(
          animate(
            intro,
            { g: [0, 1] },
            {
              duration: 1.8,
              delay: 0.2,
              ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
              onUpdate: () => {
                growth = intro.g;
                view.setGrowth(growth);
              },
            },
          ),
        );

        upgradeToWebGL(scope, host, lattice, (view3d) => {
          svgEl?.remove();
          attach(view3d);
        });
      },

      // ------------------------------------------------------------ phones, full motion
      // No pin: the lattice sits behind the headline and grows once; tap it to pluck an arm
      // (with a haptic tick where the device supports vibration).
      '(max-width: 799px) and full-motion': (scope) => {
        const svg = latticeSvg(lattice, { rotZ: 0.12, tilt: 0 });
        host.append(svg);
        scope.add(() => svg.remove());
        upgradeToWebGL(scope, host, lattice, (view3d) => {
          svg.remove();
          // Inside the plate: offset right and cropped by its edge — a figure, not wallpaper.
          view3d.setPose({ rotZ: 0.12, tilt: 0.3, x: 0.78, y: -0.02, scale: 1.32 });
          const g = { v: 0 };
          scope.add(
            animate(
              g,
              { v: [0, 1] },
              {
                duration: 1.6,
                ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
                onUpdate: () => view3d.setGrowth(g.v),
              },
            ),
          );
        });
      },

      // ------------------------------------------------------------ reduced motion
      'reduced-motion': (scope) => {
        const svg = latticeSvg(lattice, { rotZ: 0.12, tilt: 0 });
        host.append(svg);
        scope.add(() => svg.remove());
      },
    }),
  );
}

/** Swap the SVG for the WebGL lattice after first paint, when available. Failure keeps the SVG. */
function upgradeToWebGL(
  scope: Scope,
  host: HTMLElement,
  lattice: Lattice,
  onMount: (view: LatticeView) => void,
): void {
  if (!capabilities().webgl) return;
  let cancelled = false;
  scope.add(() => {
    cancelled = true;
    delete host.dataset.render;
  });
  const load = () =>
    import('../lattice/scene.js')
      .then(({ mountLattice }) => {
        if (cancelled) return;
        onMount(mountLattice(host, scope.child(), lattice));
        host.dataset.render = 'webgl';
      })
      .catch((error) => console.warn('[site] WebGL lattice unavailable, using SVG', error));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(load, { timeout: 1200 });
  else setTimeout(load, 300);
}
