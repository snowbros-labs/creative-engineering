# @snowbros/scene

Three.js toolkit for SNOWBROS Creative Engineering. It handles the parts of real-time 3D that
usually get skipped: progressive enhancement, device-aware quality, cleanup, offscreen pausing,
context loss, and accessible interaction. It also has scroll-driven camera rigs and original
procedural shaders.

`three` is a **peer dependency** (`>=0.159.0`). Loaders and decoders are imported only when you
call them.

```sh
pnpm add @snowbros/scene @snowbros/core three
```

## Quickstart

```ts
import { pin, scrub } from '@snowbros/motion';
import {
  createCameraRig,
  createStage,
  createStudioEnvironment,
  loadModel,
  withFallback,
} from '@snowbros/scene';

withFallback(document.querySelector('#product')!, {
  // Put a meaningful <img> in the HTML first. This code only upgrades it.
  fallback: (el) => el.classList.add('is-static'),
  require: { minTier: 'mid' },
  async render(el, scope) {
    const stage = scope.add(createStage({ container: el, renderMode: 'demand' }));
    const env = await createStudioEnvironment(stage.renderer);
    stage.scene.environment = stage.track(env).texture;

    const gltf = await loadModel('/models/product.glb', { meshopt: true, signal: scope.signal });
    stage.add(gltf.scene);

    const rig = createCameraRig(
      stage.camera,
      [
        { at: 0, position: [0, 0.4, 6], target: [0, 0, 0], fov: 30 },
        { at: 0.5, position: [3, 1.2, 3], target: [0, 0.3, 0], fov: 35 },
        { at: 1, position: [0, 3, 0.01], target: [0, 0, 0], fov: 40 },
      ],
      { curve: 'catmull' },
    );

    const story = scope.add(pin(document.querySelector('#story')!, { distance: '250vh' }));
    scope.add(
      scrub(
        {
          duration: 0,
          seek: (p) => {
            rig.seek(p);
            stage.invalidate();
          },
        },
        story.progress,
        { smooth: 8 },
      ),
    );
  },
});
```

## API

| Export                                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createStage(options)`                             | Creates the renderer, scene and camera. It runs on one shared ticker callback (render priority) and resizes with a ResizeObserver. It caps DPR by tier (1, 1.5 or 2) and caps fps at 30 on the low tier. It pauses offscreen and when the tab is hidden, and it recovers from `webglcontextlost` and `webglcontextrestored`. Rendering switches to `demand` under reduced motion. `add()` and `track()` register objects for full GPU cleanup when the stage is disposed. |
| `createQualityGovernor(stage, opts)`               | Measures frame time and moves quality down or up with hysteresis. It drops a level as soon as frames run more than 15% over budget. It steps up only after 3 windows in a row at or under 70% of budget. `decideQuality()` is the pure step function behind it.                                                                                                                                                                                                           |
| `createCameraRig(camera, keyframes, { curve })`    | Moves the camera through keyframes (position, look-at target, fov) with easing per segment. The path is linear or a centripetal Catmull-Rom spline. The rig is `Seekable`, so you can pass it straight to `scrub()`.                                                                                                                                                                                                                                                      |
| `createOrbitInertia(object, el, opts)`             | Drag to spin with damped inertia and an idle auto-spin. It uses `touch-action: pan-y` so vertical page scrolling keeps working. Arrow keys rotate it when the element is focused. Inertia and auto-spin are off under reduced motion.                                                                                                                                                                                                                                     |
| `pointerParallax(object, opts)`                    | A subtle tilt toward the pointer. It only runs on devices with hover and is off under reduced motion.                                                                                                                                                                                                                                                                                                                                                                     |
| `loadModel(url, { draco, meshopt, ktx2, signal })` | Loads glTF/GLB, importing decoders only when needed. It can be aborted.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `createStudioEnvironment(renderer)`                | Procedural studio reflections (RoomEnvironment + PMREM), so you don't need an HDR download.                                                                                                                                                                                                                                                                                                                                                                               |
| `createGradientMaterial(opts)`                     | An original domain-warped fBm gradient shader with grain dithering. It doesn't animate under reduced motion.                                                                                                                                                                                                                                                                                                                                                              |
| `createParticleField(opts)`                        | Soft points that drift in the vertex shader, drawn in one draw call. The count is scaled by device tier (low ×0.35, mid ×0.65) and positions are seeded deterministically.                                                                                                                                                                                                                                                                                                |
| `withFallback(container, opts)`                    | Chooses between 3D and the fallback (no WebGL, WebGL2 required, tier too low, or reduced motion if you opt in). It renders lazily near the viewport and falls back if `render` throws. It sets `data-sb-render="3d" \| "fallback"`.                                                                                                                                                                                                                                       |
| `disposeObject(obj)` / `disposeMaterial(m)`        | Frees geometries, materials and every texture they reference, including shader uniform textures. Shared resources are disposed once.                                                                                                                                                                                                                                                                                                                                      |
| `NOISE_GLSL`                                       | The shared noise and fBm GLSL chunk, for your own shaders.                                                                                                                                                                                                                                                                                                                                                                                                                |

## Fallbacks

- Always ship fallback content in the HTML: a poster image, a CSS composition, or a short
  description. 3D is an upgrade, not the content itself.
- `withFallback` never renders 3D without WebGL, and it can require WebGL2 or a minimum device
  tier.
- Reduced motion does not disable 3D by default, because a still model is fine. Animation stops
  (render-on-demand, no auto-spin, frozen shader time). Pass `respectReducedMotion: true` to swap
  in the fallback as well.

## Performance notes

- One `requestAnimationFrame` loop serves the whole page through `@snowbros/core`'s ticker. The
  stage never starts its own loop.
- Use `renderMode: 'demand'` for scenes that only change on scroll or interaction. They render
  only after `invalidate()`.
- DPR is the biggest cost lever. Tier caps plus `createQualityGovernor` keep fill-rate in check.
- Compress assets: `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2`.
- Disposing the stage releases everything registered through `add()` and `track()`. Test route
  changes for leaks with `renderer.info.memory`.

## License

MIT OR Apache-2.0
