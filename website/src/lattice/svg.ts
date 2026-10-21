/**
 * SVG rendering of the lattice: the no-WebGL / reduced-motion fallback, the mobile hero, and the
 * small chapter glyphs. Same geometry as the WebGL version, flattened with `project()`.
 */
import { type Lattice, project } from './geometry.js';

export interface LatticeSvgOptions {
  /** Highlighted arm (0..5) or null. */
  focus?: number | null;
  rotZ?: number;
  tilt?: number;
  /** Include branch nodes (dots). Default true. */
  nodes?: boolean;
  /** Accessible label; omit for decorative use (aria-hidden). */
  label?: string;
  className?: string;
}

const f = (n: number) => n.toFixed(4);

export function latticeSvg(lattice: Lattice, options: LatticeSvgOptions = {}): SVGSVGElement {
  const rotZ = options.rotZ ?? 0;
  const tilt = options.tilt ?? 0;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-1.15 -1.15 2.3 2.3');
  svg.setAttribute('class', `lattice-svg ${options.className ?? ''}`.trim());
  if (options.label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', options.label);
  } else svg.setAttribute('aria-hidden', 'true');

  // One path per arm and level keeps the DOM small (≈ 20 paths) and lets CSS restyle an arm.
  const groups = new Map<string, string>();
  for (const s of lattice.segments) {
    const [ax, ay] = project(s.a, rotZ, tilt);
    const [bx, by] = project(s.b, rotZ, tilt);
    const key = `${s.arm}:${s.level}`;
    // SVG y grows downwards; flip so arm 0 points up like in WebGL.
    groups.set(key, `${groups.get(key) ?? ''}M${f(ax)} ${f(-ay)}L${f(bx)} ${f(-by)}`);
  }
  for (const [key, d] of groups) {
    const [arm, level] = key.split(':').map(Number) as [number, number];
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', `lattice-line l${level < 0 ? 'core' : level}`);
    path.dataset.arm = String(arm);
    if (options.focus != null && arm === options.focus) path.classList.add('is-focus');
    svg.append(path);
  }
  if (options.nodes !== false) {
    for (const n of lattice.nodes) {
      const [x, y] = project(n.p, rotZ, tilt);
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', f(x));
      c.setAttribute('cy', f(-y));
      c.setAttribute('r', n.tip ? '0.028' : '0.014');
      c.setAttribute('class', n.tip ? 'lattice-node tip' : 'lattice-node');
      c.dataset.arm = String(n.arm);
      if (options.focus != null && n.arm === options.focus) c.classList.add('is-focus');
      svg.append(c);
    }
  }
  if (options.focus != null) svg.classList.add('has-focus');
  return svg;
}
