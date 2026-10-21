import { type DeviceTier, deviceTier, prefersReducedMotion } from '@snowbros/core';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type ColorRepresentation,
  Points,
  ShaderMaterial,
} from 'three';

const TIER_SCALE: Record<DeviceTier, number> = { low: 0.35, mid: 0.65, high: 1 };

/** Scale a desired particle count to the device tier (never below 1). */
export function scaleCount(count: number, tier: DeviceTier = deviceTier()): number {
  return Math.max(1, Math.round(count * TIER_SCALE[tier]));
}

export interface ParticleFieldOptions {
  /** Desired count on high-tier devices; scaled down automatically. Default 1200. */
  count?: number;
  /** Radius of the spherical volume. Default 3. */
  radius?: number;
  /** Point size in pixels at distance 1 (size attenuation). Default 18. */
  size?: number;
  color?: ColorRepresentation;
  opacity?: number;
  /** Drift amplitude. Default 0.08. 0 under reduced motion. */
  drift?: number;
  /** Override the tier used for scaling. */
  tier?: DeviceTier;
  /** Deterministic seed for positions. */
  seed?: number;
}

export interface ParticleField extends Points<BufferGeometry, ShaderMaterial> {
  tick(delta: number): void;
}

/** Small deterministic PRNG (mulberry32) so fields look the same on every load. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Soft, round, gently drifting points distributed in a sphere. One draw call; drift runs in the
 * vertex shader so the CPU does nothing per frame beyond one uniform write.
 */
export function createParticleField(options: ParticleFieldOptions = {}): ParticleField {
  const count = scaleCount(options.count ?? 1200, options.tier);
  const radius = options.radius ?? 3;
  const random = rng(options.seed ?? 7);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Uniform point in a sphere: cube-root radius, random direction.
    const u = random() * 2 - 1;
    const phi = random() * Math.PI * 2;
    const r = Math.cbrt(random()) * radius;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = r * s * Math.cos(phi);
    positions[i * 3 + 1] = r * u;
    positions[i * 3 + 2] = r * s * Math.sin(phi);
    seeds[i] = random();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: options.size ?? 18 },
      uDrift: { value: prefersReducedMotion() ? 0 : (options.drift ?? 0.08) },
      uColor: { value: new Color(options.color ?? '#e8eef5') },
      uOpacity: { value: options.opacity ?? 0.7 },
      uPixelRatio: {
        value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
      },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSize;
      uniform float uDrift;
      uniform float uPixelRatio;
      attribute float aSeed;
      varying float vFade;
      void main() {
        vec3 p = position;
        float t = uTime * (0.4 + aSeed * 0.6) + aSeed * 6.2831;
        p += vec3(sin(t), cos(t * 0.8), sin(t * 0.6)) * uDrift;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed * 0.5) / -mv.z;
        vFade = 0.35 + 0.65 * aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a * uOpacity * vFade);
      }
    `,
  });
  const points = new Points(geometry, material) as ParticleField;
  points.tick = (delta: number) => {
    if (prefersReducedMotion()) return;
    (material.uniforms.uTime as { value: number }).value += delta;
  };
  return points;
}
