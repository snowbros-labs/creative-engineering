import {
  createScope,
  deviceTier,
  type PatternHandle,
  Priority,
  prefersReducedMotion,
  ticker,
} from '@snowbros/core';
import { createNoise, createRandom } from './noise.js';

export interface FlowFieldOptions {
  /**
   * Particles per CSS pixel² (scaled by device tier). Default 0.00035 — about 300 particles on a
   * 900 × 950 canvas. Values ≥ 0.01 are almost certainly a unit mistake (warned in dev).
   */
  density?: number;
  /** Stroke color. Default `currentColor` of the canvas, falling back to #fff. */
  color?: string;
  /** CSS pixels per second — not a 0..1 factor. Default 40; values < 2 are invisible (warned). */
  speed?: number;
  /** CSS px. Default 1. */
  lineWidth?: number;
  /** Trail fade per frame, 0..1 (higher = shorter trails). Default 0.06. */
  fade?: number;
  /** Noise frequency. Default 0.0018. */
  scale?: number;
  seed?: number;
  /** Max device pixel ratio. Default 2. */
  maxDpr?: number;
}

export interface FlowFieldHandle extends PatternHandle {
  play(): void;
  pause(): void;
}

interface Particle {
  x: number;
  y: number;
  life: number;
}

const TIER_FACTOR = { low: 0.35, mid: 0.65, high: 1 } as const;
const MAX_PARTICLES = 4000;

/**
 * Procedural 2D flow field: particles follow a slowly evolving noise field, leaving fading trails.
 * A lightweight ambient visual (no WebGL) for heroes, empty states and loading screens.
 *
 * DPR-aware, resizes with its box, runs only while on screen (the shared ticker already sleeps in
 * hidden tabs), particle count scaled by `deviceTier()`. Reduced motion: renders one static frame
 * of settled trails and stops.
 */
export function flowField(
  canvas: HTMLCanvasElement,
  options: FlowFieldOptions = {},
): FlowFieldHandle {
  const scope = createScope();
  const ctx = canvas.getContext('2d');
  if (!ctx) return { play() {}, pause() {}, dispose: () => scope.dispose() };

  const density = options.density ?? 0.00035;
  const speed = options.speed ?? 40;
  // A real misuse found while building the flagship: `speed: 0.5, density: 0.6` (read as
  // fractions) renders nothing visible and floods the canvas. Say so instead of failing silently.
  if (speed < 2 || density >= 0.01)
    console.warn(
      `[snowbros] flowField: speed is px/s and density is particles per px² (got speed ${speed}, density ${density}); defaults are 40 and 0.00035.`,
    );
  const fadeAmount = options.fade ?? 0.06;
  const freq = options.scale ?? 0.0018;
  const noise = createNoise(options.seed ?? 7);
  const random = createRandom((options.seed ?? 7) + 1);
  const color =
    options.color ??
    (typeof getComputedStyle === 'function' ? getComputedStyle(canvas).color : '') ??
    '#fff';

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles: Particle[] = [];
  let time = 0;
  let visible = true;
  let userPaused = false;
  let off: (() => void) | null = null;

  const spawn = (p?: Particle): Particle => {
    const q = p ?? { x: 0, y: 0, life: 0 };
    q.x = random() * width;
    q.y = random() * height;
    q.life = 2 + random() * 6;
    return q;
  };

  const resize = () => {
    dpr = Math.min(
      options.maxDpr ?? 2,
      typeof devicePixelRatio === 'number' ? devicePixelRatio : 1,
    );
    width = canvas.clientWidth || canvas.width;
    height = canvas.clientHeight || canvas.height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(
      MAX_PARTICLES,
      Math.round(width * height * density * TIER_FACTOR[deviceTier()]),
    );
    particles = Array.from({ length: count }, () => spawn());
    if (prefersReducedMotion()) drawStatic();
  };

  const step = (dt: number, fadeTrails: boolean) => {
    if (fadeTrails) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${fadeAmount})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
    time += dt;
    ctx.strokeStyle = color;
    ctx.lineWidth = options.lineWidth ?? 1;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (const p of particles) {
      const angle = noise.noise3D(p.x * freq, p.y * freq, time * 0.05) * Math.PI * 2;
      const nx = p.x + Math.cos(angle) * speed * dt;
      const ny = p.y + Math.sin(angle) * speed * dt;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      p.x = nx;
      p.y = ny;
      p.life -= dt;
      if (p.life <= 0 || nx < 0 || ny < 0 || nx > width || ny > height) spawn(p);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  function drawStatic() {
    ctx!.clearRect(0, 0, width, height);
    for (let i = 0; i < 90; i++) step(1 / 30, false);
  }

  const update = () => {
    const run = visible && !userPaused && !prefersReducedMotion();
    if (run && !off) off = ticker.add((f) => step(f.delta, true), Priority.render);
    else if (!run && off) {
      off();
      off = null;
    }
  };

  resize();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    scope.add(() => ro.disconnect());
  }
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      update();
    });
    io.observe(canvas);
    scope.add(() => io.disconnect());
  }
  update();

  scope.add(() => {
    off?.();
    off = null;
    ctx.clearRect(0, 0, width, height);
  });

  return {
    play() {
      userPaused = false;
      update();
    },
    pause() {
      userPaused = true;
      update();
    },
    dispose: () => scope.dispose(),
  };
}
