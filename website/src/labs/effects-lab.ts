/**
 * Lab E — Effects. Procedural "image" (flow field) revealed by scroll through a clip-path mask,
 * a scramble that replays on hover/focus/press, and the lattice plotted with drawPath.
 * Reduced motion: field renders one static frame, reveal shows final state, draw shows complete.
 */
import { createMediaContext, type Scope } from '@snowbros/core';
import { drawPath, flowField, imageReveal, scramble } from '@snowbros/fx';
import { inView, scrollProgress, scrub } from '@snowbros/motion';
import { buildLattice } from '../lattice/geometry.js';

export function init(root: HTMLElement, scope: Scope): void {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-fx-field]');
  const media = root.querySelector<HTMLElement>('[data-fx-media]');
  const figure = root.querySelector<HTMLElement>('[data-fx-reveal]');
  if (canvas) {
    scope.add(
      flowField(canvas, {
        color: 'rgba(255, 150, 90, 0.85)',
        density: 0.0007, // particles per px²
        speed: 46, // px per second
        fade: 0.04,
        lineWidth: 1,
        seed: 21,
      }),
    );
  }
  if (media && figure) {
    const reveal = imageReveal(media, { from: 'bottom', scale: 1.2 });
    scope.add(reveal);
    scope.add(
      createMediaContext({
        'full-motion': (s) => {
          const p = scrollProgress(figure, { start: 'top 90%', end: 'center 55%' });
          s.add(p);
          s.add(scrub(reveal, p, { smooth: 8 }));
        },
        'reduced-motion': () => reveal.seek(1),
      }),
    );
  }

  const scr = root.querySelector<HTMLElement>('[data-fx-scramble]');
  if (scr) {
    const handle = scramble(scr, { trigger: 'hover', duration: 0.8, chars: '░▒▓/\\|—_01' });
    scope.add(handle);
    scope.listen(scr, 'click', () => void handle.play());
  }

  const drawHost = root.querySelector<HTMLElement>('[data-fx-draw]');
  if (drawHost) {
    // One <line> per segment: dash-based drawing breaks across multi-subpath <path>s.
    const lattice = buildLattice({ seed: 5, detail: 0.9, relief: 0 });
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '-1.1 -1.1 2.2 2.2');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'lattice-svg');
    for (const seg of lattice.segments) {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(seg.a[0]));
      line.setAttribute('y1', String(-seg.a[1]));
      line.setAttribute('x2', String(seg.b[0]));
      line.setAttribute('y2', String(-seg.b[1]));
      line.setAttribute('class', `lattice-line l${seg.level < 0 ? 'core' : seg.level}`);
      svg.append(line);
    }
    drawHost.replaceChildren(svg);
    const paths = Array.from(svg.querySelectorAll('line'));
    const draw = drawPath(paths);
    scope.add(draw);
    draw.seek(0);
    scope.add(
      inView(
        drawHost,
        () => {
          void draw.play({ duration: 2.2, ease: 'cubic-bezier(0.65, 0, 0.35, 1)' });
        },
        { amount: 0.4 },
      ),
    );
  }
}
