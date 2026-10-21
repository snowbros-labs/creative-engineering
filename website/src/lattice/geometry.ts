/**
 * Procedural six-fold snow crystal: the site's signature object.
 *
 * Pure data (no DOM, no three.js) so the same lattice renders as WebGL lines, as an SVG
 * fallback, and as small per-chapter glyphs. Every segment carries the arm it belongs to and a
 * growth window `[t0, t1]` in 0..1, so renderers can grow the crystal from its seed outwards.
 */
import { createRandom } from '@snowbros/fx';

export type Vec3 = [number, number, number];

export interface LatticeSegment {
  a: Vec3;
  b: Vec3;
  /** Arm index 0..5, or -1 for the central hexagon. */
  arm: number;
  /** 0 = main arm, 1 = branch, 2 = twig, -1 = core. */
  level: number;
  /** Growth window: the segment draws from `a` to `b` while growth goes t0 → t1. */
  t0: number;
  t1: number;
}

export interface LatticeNode {
  p: Vec3;
  arm: number;
  level: number;
  /** Growth value at which the node appears. */
  t: number;
  /** Arm tip — the anchor for callout labels. */
  tip: boolean;
}

export interface Lattice {
  segments: LatticeSegment[];
  nodes: LatticeNode[];
  /** Tip of each arm, index = arm. */
  tips: Vec3[];
}

export interface LatticeOptions {
  seed?: number;
  /** Branch density 0..1. Default 0.7. */
  detail?: number;
  /** Out-of-plane relief, adds depth when rotated. Default 0.06. */
  relief?: number;
}

const ARMS = 6;
const TAU = Math.PI * 2;

/** Build the lattice. Deterministic for a given seed. Radius of the arm tips is 1. */
export function buildLattice(options: LatticeOptions = {}): Lattice {
  const rand = createRandom(options.seed ?? 11);
  const detail = options.detail ?? 0.7;
  const relief = options.relief ?? 0.06;
  const segments: LatticeSegment[] = [];
  const nodes: LatticeNode[] = [];
  const tips: Vec3[] = [];

  // Branch layout is shared by all arms (real crystals are near-symmetric); a little per-arm
  // jitter keeps it from looking mirrored by a computer.
  const branchCount = Math.round(3 + detail * 3);
  const branchAt: number[] = [];
  const branchLen: number[] = [];
  for (let i = 0; i < branchCount; i++) {
    const at = 0.24 + (i / branchCount) * 0.62 + (rand() - 0.5) * 0.04;
    branchAt.push(at);
    // Longest near the middle of the arm, short near the core and the tip.
    branchLen.push((0.12 + Math.sin(at * Math.PI) * 0.24) * (0.85 + rand() * 0.3));
  }

  const core = 0.16;
  // Central hexagon (the "seed").
  for (let k = 0; k < ARMS; k++) {
    const a0 = (k / ARMS) * TAU;
    const a1 = ((k + 1) / ARMS) * TAU;
    segments.push({
      a: [Math.cos(a0) * core, Math.sin(a0) * core, 0],
      b: [Math.cos(a1) * core, Math.sin(a1) * core, 0],
      arm: -1,
      level: -1,
      t0: 0,
      t1: 0.14,
    });
  }

  for (let arm = 0; arm < ARMS; arm++) {
    const ang = (arm / ARMS) * TAU + Math.PI / 2; // arm 0 points up
    const dir: Vec3 = [Math.cos(ang), Math.sin(ang), 0];
    const at = (r: number, z = 0): Vec3 => [dir[0] * r, dir[1] * r, z];
    const jitter = () => (rand() - 0.5) * 0.03;

    // Main arm in a few segments so growth reads as continuous.
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const r0 = core + ((1 - core) * s) / steps;
      const r1 = core + ((1 - core) * (s + 1)) / steps;
      segments.push({
        a: at(r0),
        b: at(r1),
        arm,
        level: 0,
        t0: 0.1 + 0.55 * (s / steps),
        t1: 0.1 + 0.55 * ((s + 1) / steps),
      });
    }
    const tip = at(1);
    tips.push(tip);
    nodes.push({ p: tip, arm, level: 0, t: 0.66, tip: true });

    branchAt.forEach((r, i) => {
      const len = branchLen[i]! * (1 + jitter());
      const base = at(r);
      const bt0 = 0.1 + 0.55 * r;
      const z = (i % 2 ? 1 : -1) * relief * (0.5 + r);
      nodes.push({ p: base, arm, level: 1, t: bt0, tip: false });
      for (const side of [-1, 1]) {
        const bAng = ang + (side * Math.PI) / 3;
        const end: Vec3 = [base[0] + Math.cos(bAng) * len, base[1] + Math.sin(bAng) * len, z];
        segments.push({ a: base, b: end, arm, level: 1, t0: bt0, t1: bt0 + 0.18 });
        // Twigs on the longer branches, parallel to the main arm.
        if (len > 0.2 && detail > 0.4) {
          const tAt = 0.55;
          const tb: Vec3 = [
            base[0] + Math.cos(bAng) * len * tAt,
            base[1] + Math.sin(bAng) * len * tAt,
            z * tAt,
          ];
          const tl = len * 0.38;
          const te: Vec3 = [tb[0] + dir[0] * tl, tb[1] + dir[1] * tl, z * 1.4];
          segments.push({ a: tb, b: te, arm, level: 2, t0: bt0 + 0.12, t1: bt0 + 0.26 });
        }
      }
    });

    // A small plate near the tip: two short chevrons that read as a hexagonal facet.
    const plateR = 0.86;
    const pw = 0.07;
    const pc = at(plateR);
    for (const side of [-1, 1]) {
      const pAng = ang + (side * Math.PI) / 3;
      segments.push({
        a: pc,
        b: [pc[0] + Math.cos(pAng) * pw, pc[1] + Math.sin(pAng) * pw, 0],
        arm,
        level: 1,
        t0: 0.6,
        t1: 0.72,
      });
    }
  }

  return { segments, nodes, tips };
}

/** Rotate a point around Z then X (radians). Used by 2D renderers to fake the 3D pose. */
export function project(p: Vec3, rotZ: number, tiltX: number): [number, number] {
  const cz = Math.cos(rotZ);
  const sz = Math.sin(rotZ);
  const x = p[0] * cz - p[1] * sz;
  const y = p[0] * sz + p[1] * cz;
  const cx = Math.cos(tiltX);
  const sx = Math.sin(tiltX);
  return [x, y * cx - p[2] * sx];
}

/** The six dimensions, in arm order. Shared by the diagram, chapters and glyphs. */
export const DIMENSIONS = [
  { id: 'skill', name: 'Skill' },
  { id: 'motion', name: 'Motion' },
  { id: 'interaction', name: 'Interaction' },
  { id: 'space', name: 'Space' },
  { id: 'effects', name: 'Effects' },
  { id: 'interface', name: 'Interface' },
] as const;
