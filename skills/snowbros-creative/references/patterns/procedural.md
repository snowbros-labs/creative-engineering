# Pattern family: procedural visuals

Procedural graphics (noise fields, particles, generative gradients) give original imagery with tiny
payloads. They are decorative: always `aria-hidden`, always pausable, never essential.

Contract: **seed** (deterministic output) · **intensity** (density/speed) · **quality** (device tier)
· **trigger** (render only when visible) · **reduced motion** (single static frame) · **cleanup**
(stop loop, release canvas/GPU).

API names from `@snowbros/fx` / `@snowbros/scene` — verify against package READMEs.

## 1. Seeded noise

- Use seeded randomness (`createRandom(seed)`) and seeded noise (`createNoise(seed)`) so renders are reproducible (screenshots, visual regression).
- Gradient noise (simplex/Perlin family) for organic motion; fBm (3–5 octaves) for texture; domain warping for marble/smoke.

## 2. Canvas 2D flow field

- **Intent:** particles following a noise vector field — ambient hero texture.
- **Code:** `const field = flowField(canvas, { seed: 7 }); // field.dispose()`
- **Rules:** cap particles by tier (e.g. 400 / 900 / 1600); DPR ≤ 2; pause offscreen and on hidden tab; reduced motion → draw once.
- **Perf:** batch path drawing (one `beginPath`/`stroke` per color), no per-particle `save/restore`, fade trails with a translucent `fillRect` instead of clearing.

## 3. Shader gradient / material

- **Intent:** slow, living color field behind type (a single full-screen quad).
- **Code (scene):** `const mat = createGradientMaterial({ colors: ['#0b0c10', '#2b3a55', '#e8d5b5'], speed: 0.08, grain: 0.04 }); stage.onFrame(({ delta }) => mat.tick(delta));`
- **Rules:** add grain/dither to prevent banding; keep speed slow (ambient ≠ distracting); text on top needs contrast checked against the brightest frame.
- **CSS alternative:** layered `radial-gradient`s animated via `@property`-registered custom properties — no WebGL at all; often enough.

## 4. Particles (GPU)

- `THREE.Points` with a small custom shader; counts scaled by tier (`scaleCount`).
- Evidence: cvnt.in hero uses a 950-particle `Points` cloud at 70% opacity, lowered DPR and 36 fps cap on low-end devices.

## 5. SVG generative

- Build paths from noise at render time (server or client), then animate `stroke-dashoffset` (`drawPath`) — accessible, crisp, tiny.

## Do not

- Run a procedural loop behind a page that is mostly reading.
- Use `Math.random()` in render paths you need to test visually.
- Start multiple independent rAF loops; register on the shared ticker.
