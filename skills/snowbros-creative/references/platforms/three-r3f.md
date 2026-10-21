# Platform: Three.js / React Three Fiber / raw WebGL

**Detection:** `three`, `@react-three/fiber`, `@react-three/drei`, `ogl`, `@threlte/core`, or
`getContext('webgl2')` in source.

**Versions (npm, 2026-10-21):** three 0.186.1 (minor releases can break — no semver); R3F 9.8.2
pairs with React 19 (peer `react >=19 <19.4`); R3F v10 (WebGPU) is alpha — don't depend on it.
`@snowbros/scene` peer: `three >=0.159.0`.

| SNOWBROS concept  | three (vanilla)                                                            | R3F                                                                                        |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| stage lifecycle   | `createStage()` (@snowbros/scene) or hand-rolled renderer + ResizeObserver | `<Canvas>` owns it                                                                         |
| frame loop        | shared ticker via `stage.onFrame`                                          | `useFrame((state, delta) => …)`                                                            |
| progress → camera | `createCameraRig` + `scrub(rig, progress)`                                 | read `progress.get()` in `useFrame`; Drei `ScrollControls` only if the page is canvas-only |
| demand rendering  | `renderMode: 'demand'` + `invalidate()`                                    | `frameloop="demand"` + `invalidate()`                                                      |
| DPR cap           | `dprMax` / quality level                                                   | `dpr={[1, 1.5]}`, Drei `PerformanceMonitor`                                                |
| disposal          | `disposeObject(root)`, `stage.dispose()`                                   | automatic for JSX-created objects; manual for imperatively created ones                    |
| model load        | `loadModel(url, { meshopt: true })`                                        | `useGLTF(url)` (Drei) + `useGLTF.preload`                                                  |
| fallback          | `withFallback(container, {...})`                                           | `<Suspense fallback>` + capability check before mounting `<Canvas>`                        |

**Rules**
- One renderer per page if possible (contexts are limited; ~16 in Chrome). Multiple views → scissor/viewports or `View` (Drei).
- Lazy-load three after content paints (cvnt.in loads it ~3.9 s after first paint).
- `touch-action: pan-y` on interactive canvases; never block page scroll.
- Mirror important text in DOM; canvas is decorative or has an accessible description.

**Raw WebGL / OGL:** same lifecycle rules; OGL (Unlicense) is a lighter option for 2D-ish shader work.
**WebGPU:** `WebGPURenderer` falls back to WebGL 2 automatically (https://threejs.org/docs/pages/WebGPURenderer.html); TSL compiles to WGSL/GLSL. Opt-in, separate lazy entry.
