# Pattern family: 3D and WebGL

First question: **does depth or direct manipulation explain something** (product form, spatial
data, configuration)? If the answer is "it looks cool", consider video, image sequences or CSS 3D.

Contract: **progress** (scroll/time/drag) · **quality** (`low | mid | high` from device tier + runtime
governor) · **trigger** (render when near viewport) · **reduced motion** (static frame / demand
rendering) · **fallback** (always) · **cleanup** (dispose geometries, materials, textures, renderer).

`@snowbros/scene` API below — verify exact options against the package README (package is new).

## 1. Managed stage

```ts
import { createStage, withFallback } from '@snowbros/scene';

const handle = withFallback(container, {
  require: { webgl2: true, minTier: 'mid' },
  fallback: (el) => el.append(posterImg), // static image/poster
  render: async (el, scope) => {
    const stage = scope.add(createStage({ container: el, renderMode: 'always' }));
    // build scene…
  },
});
// cleanup: handle.dispose()
```
Stage responsibilities (do these yourself if not using the package): one renderer; size from the
container via ResizeObserver; DPR cap (1 / 1.5 / 2 by tier); pause offscreen (IntersectionObserver)
and on hidden tab; handle `webglcontextlost`/`restored`; one shared rAF; `demand` rendering under
reduced motion; dispose everything.

Production evidence: cvnt.in lazy-loads three ~3.9 s after first paint, caps DPR and FPS (36) on
low-end devices, pauses offscreen and recovers from context loss (repository `docs/research/notes-live-inspection.md`).

## 2. Scroll-driven camera rig

```ts
import { createCameraRig } from '@snowbros/scene';
import { pin, scrub } from '@snowbros/motion';

const rig = createCameraRig(
  stage.camera,
  [
    { at: 0, position: [0, 1, 6], target: [0, 0.5, 0], fov: 35 },
    { at: 0.5, position: [3, 1.5, 3], target: [0, 0.8, 0] },
    { at: 1, position: [0, 4, 0.01], target: [0, 0, 0], ease: 'cinematic' },
  ],
  { curve: 'catmull' },
);
const story = pin(section, { distance: '300vh' });
scrub(rig, story.progress, { smooth: 8 });
```

- Keep DOM copy outside the canvas (accessible, selectable, indexable); the canvas is `aria-hidden` or has a text alternative.
- Coordinate DOM and camera on one progress (see motion-system.md "one progress, many elements").

## 3. Interactive model (drag to rotate)

- Damped inertia; idle auto-rotate paused while interacting and under reduced motion.
- `touch-action: pan-y` on the canvas so vertical page scroll still works on touch.
- Provide keyboard alternative (buttons for rotate left/right/reset) if rotation conveys information.

## 4. Asset pipeline

- glTF/GLB only. Optimize with gltf-transform (`@gltf-transform/cli`):
  `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2` (check flags with `--help`; versions change).
- Meshopt as default geometry compression; Draco decode supported when assets require it; KTX2 (Basis) textures for GPU memory savings.
- Budgets (starting points, adjust per audience): hero model ≤ 1–2 MB transferred, textures ≤ 2048² (1024² mobile), draw calls < 100, triangles < 300k mobile.
- Self-host decoder/transcoder files; load them only when needed.
- Licenses: use original models or explicitly licensed assets (CC0/CC-BY with attribution). Never extract models from other sites.

## 5. Quality governor

Measure frame time over windows (e.g. 1 s); step quality down (DPR, shadows, post-processing,
particle count) when p90 frame time > 20 ms; step up cautiously after sustained headroom. Never
oscillate: require several good windows before upgrading.

## 6. WebGPU

Optional, progressive. three's `WebGPURenderer` falls back to WebGL 2 automatically
(https://threejs.org/docs/pages/WebGPURenderer.html). Not Baseline; Firefox support varies by OS.
Keep `three/webgpu` imports in a separate lazily loaded entry.

## 7. React Three Fiber projects

Stay in R3F: `<Canvas dpr={[1, 1.5]} frameloop="demand">`, `useFrame`, Drei helpers. Don't mount a
second renderer from `@snowbros/scene`. Drive R3F scenes from a progress source by reading
`source.get()` inside `useFrame`.

## Disposal checklist

- `geometry.dispose()`, `material.dispose()`, every texture on every material map, render targets, `renderer.dispose()`, `renderer.forceContextLoss()` only when leaving permanently.
- Remove the canvas; cancel loaders (AbortSignal); unsubscribe progress sources.
- Verify: navigate to and from the 3D route 10×; `renderer.info.memory` returns to baseline; no growing JS heap.
