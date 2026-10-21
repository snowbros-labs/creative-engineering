/**
 * Seeded gradient noise (Perlin-style lattice noise with quintic fade), written for SNOWBROS.
 * Output is continuous and clamped to [-1, 1]. Deterministic for a given seed.
 */

export interface Noise {
  noise2D(x: number, y: number): number;
  noise3D(x: number, y: number, z: number): number;
  /** Fractal Brownian motion: summed octaves, normalised to roughly [-1, 1]. */
  fbm2D(x: number, y: number, octaves?: number, lacunarity?: number, gain?: number): number;
}

/** Small, fast, seedable PRNG (mulberry32). Returns values in [0, 1). */
export function createRandom(seed = 1): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp1 = (v: number) => Math.min(1, Math.max(-1, v));

// 8 unit directions for 2D, scaled by √2 so the output spans about [-1, 1].
const G2: ReadonlyArray<readonly [number, number]> = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2] as const;
});

// 12 cube-edge directions for 3D.
const G3: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

export function createNoise(seed = 1): Noise {
  const random = createRandom(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = p[i]!;
    p[i] = p[j]!;
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;

  const g2 = (hash: number, x: number, y: number) => {
    const g = G2[hash & 7]!;
    return g[0] * x + g[1] * y;
  };
  const g3 = (hash: number, x: number, y: number, z: number) => {
    const g = G3[hash % 12]!;
    return g[0] * x + g[1] * y + g[2] * z;
  };

  const noise2D = (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const X = xi & 255;
    const Y = yi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X]! + Y]!;
    const ab = perm[perm[X]! + Y + 1]!;
    const ba = perm[perm[X + 1]! + Y]!;
    const bb = perm[perm[X + 1]! + Y + 1]!;
    const x1 = lerp(g2(aa, xf, yf), g2(ba, xf - 1, yf), u);
    const x2 = lerp(g2(ab, xf, yf - 1), g2(bb, xf - 1, yf - 1), u);
    return clamp1(lerp(x1, x2, v));
  };

  const noise3D = (x: number, y: number, z: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const X = xi & 255;
    const Y = yi & 255;
    const Z = zi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    const A = perm[X]! + Y;
    const AA = perm[A]! + Z;
    const AB = perm[A + 1]! + Z;
    const B = perm[X + 1]! + Y;
    const BA = perm[B]! + Z;
    const BB = perm[B + 1]! + Z;
    const r = lerp(
      lerp(
        lerp(g3(perm[AA]!, xf, yf, zf), g3(perm[BA]!, xf - 1, yf, zf), u),
        lerp(g3(perm[AB]!, xf, yf - 1, zf), g3(perm[BB]!, xf - 1, yf - 1, zf), u),
        v,
      ),
      lerp(
        lerp(g3(perm[AA + 1]!, xf, yf, zf - 1), g3(perm[BA + 1]!, xf - 1, yf, zf - 1), u),
        lerp(g3(perm[AB + 1]!, xf, yf - 1, zf - 1), g3(perm[BB + 1]!, xf - 1, yf - 1, zf - 1), u),
        v,
      ),
      w,
    );
    return clamp1(r);
  };

  const fbm2D = (x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number => {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise2D(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return norm > 0 ? sum / norm : 0;
  };

  return { noise2D, noise3D, fbm2D };
}
