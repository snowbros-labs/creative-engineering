import { prefersReducedMotion } from '@snowbros/core';
import {
  Color,
  type ColorRepresentation,
  PMREMGenerator,
  ShaderMaterial,
  type Texture,
  Vector2,
  type WebGLRenderer,
} from 'three';

/**
 * Shared GLSL: 2D value-gradient noise + fBm. Written for SNOWBROS (gradient noise over a
 * hashed lattice with quintic fade), no third-party shader code.
 */
export const NOISE_GLSL = /* glsl */ `
vec2 sb_hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float sb_noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(sb_hash2(i), f);
  float b = dot(sb_hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(sb_hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(sb_hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float sb_fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += amp * sb_noise(p);
    p = rot * p * 2.02;
    amp *= 0.5;
  }
  return v;
}
`;

export interface GradientMaterialOptions {
  /** Three colors blended through a domain-warped noise field. */
  colors?: [ColorRepresentation, ColorRepresentation, ColorRepresentation];
  /** Spatial frequency. Default 1.6. */
  noiseScale?: number;
  /** Animation speed multiplier. Default 0.08 — slow, ambient. Forced to 0 under reduced motion. */
  speed?: number;
  /** Film-grain amount 0..0.2. Default 0.04 (dithering also prevents banding). */
  grain?: number;
}

export interface GradientMaterial extends ShaderMaterial {
  /** Advance time (seconds). Call from `stage.onFrame`. */
  tick(delta: number): void;
}

/**
 * Animated, domain-warped noise gradient for hero backgrounds and planes. Cheap (one fBm warp),
 * banding-free thanks to grain dithering, static under reduced motion.
 */
export function createGradientMaterial(options: GradientMaterialOptions = {}): GradientMaterial {
  const [a, b, c] = options.colors ?? ['#0e1116', '#3a4a6b', '#d9e2ec'];
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: options.noiseScale ?? 1.6 },
      uGrain: { value: options.grain ?? 0.04 },
      uColorA: { value: new Color(a) },
      uColorB: { value: new Color(b) },
      uColorC: { value: new Color(c) },
      uResolution: { value: new Vector2(1, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uScale;
      uniform float uGrain;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 p = vUv * uScale;
        vec2 warp = vec2(sb_fbm(p + uTime * 0.7), sb_fbm(p + vec2(5.2, 1.3) - uTime * 0.5));
        float n = sb_fbm(p + 1.5 * warp);
        float t = smoothstep(-0.45, 0.45, n);
        vec3 col = mix(uColorA, uColorB, t);
        col = mix(col, uColorC, smoothstep(0.25, 0.6, n + warp.x * 0.3));
        float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        col += (g - 0.5) * uGrain;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }) as GradientMaterial;
  const speed = options.speed ?? 0.08;
  material.tick = (delta: number) => {
    if (prefersReducedMotion()) return;
    (material.uniforms.uTime as { value: number }).value += delta * speed;
  };
  return material;
}

/**
 * Procedural studio lighting (three's RoomEnvironment → PMREM). Gives PBR materials believable
 * reflections without downloading an HDR file. Assign `texture` to `scene.environment`.
 */
export async function createStudioEnvironment(
  renderer: WebGLRenderer,
  options: { sigma?: number } = {},
): Promise<{ texture: Texture; dispose(): void }> {
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = pmrem.fromScene(room, options.sigma ?? 0.04);
  room.dispose?.();
  pmrem.dispose();
  return {
    texture: target.texture,
    dispose: () => target.dispose(),
  };
}
