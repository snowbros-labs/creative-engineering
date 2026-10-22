import {
  createScope,
  type DeviceTier,
  type Disposable,
  deviceTier,
  type FrameInfo,
  motionPreference,
  Priority,
  prefersReducedMotion,
  type Scope,
  ticker,
} from '@snowbros/core';
import { type Object3D, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { disposeObject } from './dispose.js';

export type QualityLevel = 'low' | 'mid' | 'high';

/** Device-pixel-ratio cap per quality level. DPR is the single biggest fill-rate lever. */
export const DPR_CAPS: Record<QualityLevel, number> = { low: 1, mid: 1.5, high: 2 };

export interface StageOptions {
  /** Element the canvas is appended to and sized from. */
  container?: HTMLElement;
  /** Existing canvas to render into (sized from its own box). */
  canvas?: HTMLCanvasElement;
  camera?: {
    fov?: number;
    near?: number;
    far?: number;
    position?: [number, number, number];
    /**
     * Keep a sphere of this radius (centred on the origin) fully in frame at any aspect ratio:
     * on resize the camera dollies back along its own axis when the narrower field of view would
     * crop it (portrait phones). Never moves closer than `position`.
     */
    fit?: number;
  };
  alpha?: boolean;
  /** `auto` enables MSAA except on the low tier. */
  antialias?: boolean | 'auto';
  /** Maximum device pixel ratio. Default from the device tier (1 / 1.5 / 2). */
  dprMax?: number;
  /**
   * `always` renders every frame (continuous animation); `demand` renders only after
   * `invalidate()`. Forced to `demand` under reduced motion.
   */
  renderMode?: 'always' | 'demand';
  powerPreference?: WebGLPowerPreference;
  /** Frame cap. Default 30 on the low tier, otherwise uncapped. */
  maxFps?: number;
  /** Stop rendering while the canvas is outside the viewport. Default true. */
  pauseWhenOffscreen?: boolean;
  /** Initial quality. Default: `deviceTier()`. */
  quality?: QualityLevel;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  /** Supply a renderer (tests, WebGPU experiments). The stage takes ownership. */
  renderer?: WebGLRenderer;
}

export type StageFrameCallback = (frame: FrameInfo, stage: Stage) => void;

export interface Stage {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  /** Lifecycle scope: everything added here is disposed with the stage. */
  readonly scope: Scope;
  readonly quality: QualityLevel;
  /** True while frames are being rendered (visible, onscreen, context alive). */
  readonly active: boolean;
  /** Request a render on the next frame (needed in `demand` mode). */
  invalidate(): void;
  /** Add objects to the scene; their GPU resources are released on dispose. */
  add<T extends Object3D>(object: T): T;
  /** Register any disposable (texture, render target, controls) for cleanup. */
  track<T extends Disposable>(item: T): T;
  /** Run a callback each rendered frame, before rendering. Returns unsubscribe. */
  onFrame(callback: StageFrameCallback): () => void;
  resize(): void;
  setQuality(level: QualityLevel): void;
  dispose(): void;
}

/**
 * A managed Three.js stage: one renderer, one ticker callback, automatic sizing, offscreen and
 * hidden-tab pausing, context-loss recovery, quality levels and complete GPU cleanup.
 *
 * ```ts
 * const stage = createStage({ container: el });
 * stage.add(new Mesh(geometry, material));
 * stage.onFrame(({ delta }) => (mesh.rotation.y += delta * 0.3));
 * ```
 */
export function createStage(options: StageOptions = {}): Stage {
  const scope = createScope();
  const tier: DeviceTier = deviceTier();
  let quality: QualityLevel = options.quality ?? tier;
  const reduced = () => prefersReducedMotion();
  const mode = () => (reduced() ? 'demand' : (options.renderMode ?? 'always'));
  const maxFps = options.maxFps ?? (tier === 'low' ? 30 : 0);

  const canvas = options.canvas ?? options.renderer?.domElement ?? document.createElement('canvas');
  const container = options.container ?? canvas.parentElement ?? undefined;
  if (options.container && !canvas.parentElement) {
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    options.container.appendChild(canvas);
    scope.add(() => canvas.remove());
  }

  const renderer =
    options.renderer ??
    new WebGLRenderer({
      canvas,
      alpha: options.alpha ?? false,
      antialias:
        options.antialias === 'auto' || options.antialias === undefined
          ? tier !== 'low'
          : options.antialias,
      powerPreference:
        options.powerPreference ?? (tier === 'low' ? 'low-power' : 'high-performance'),
    });
  const ownsCanvas = !options.canvas && !options.renderer;
  scope.add(() => {
    renderer.dispose();
    // dispose() frees GPU resources but leaves the WebGL context alive until garbage collection.
    // Browsers cap live contexts (~16), so repeated mounts (route changes, playgrounds) would
    // eventually evict the oldest. Release it now when the canvas is ours (a caller-supplied
    // canvas may be reused, and a lost context cannot be re-acquired on it).
    if (ownsCanvas) renderer.forceContextLoss();
  });

  const scene = new Scene();
  const cam = options.camera ?? {};
  const camera = new PerspectiveCamera(cam.fov ?? 35, 1, cam.near ?? 0.1, cam.far ?? 100);
  camera.position.set(...(cam.position ?? [0, 0, 6]));
  const baseDistance = camera.position.length() || 1;
  const axis = camera.position.clone().normalize();

  const frameCallbacks = new Set<StageFrameCallback>();
  let needsRender = true;
  let onscreen = true;
  let contextLost = false;
  let lastRender = 0;

  const dprCap = () => Math.min(options.dprMax ?? Number.POSITIVE_INFINITY, DPR_CAPS[quality]);

  const resize = () => {
    const box = container ?? canvas;
    const w = Math.max(1, box.clientWidth);
    const h = Math.max(1, box.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (cam.fit) {
      // Narrowest half-angle decides: vertical fov in landscape, horizontal fov in portrait.
      const halfV = (camera.fov * Math.PI) / 360;
      const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
      const needed = cam.fit / Math.sin(Math.min(halfV, halfH));
      camera.position.copy(axis).multiplyScalar(Math.max(baseDistance, needed));
    }
    camera.updateProjectionMatrix();
    needsRender = true;
    wake();
  };

  const stage: Stage = {
    renderer,
    scene,
    camera,
    canvas,
    scope,
    get quality() {
      return quality;
    },
    get active() {
      return onscreen && !contextLost && !scope.disposed;
    },
    invalidate() {
      needsRender = true;
      wake();
    },
    add(object) {
      scene.add(object);
      scope.add(() => disposeObject(object));
      stage.invalidate();
      return object;
    },
    track(item) {
      return scope.add(item);
    },
    onFrame(callback) {
      frameCallbacks.add(callback);
      wake();
      return () => {
        frameCallbacks.delete(callback);
      };
    },
    resize,
    setQuality(level) {
      if (level === quality) return;
      quality = level;
      resize();
    },
    dispose() {
      frameCallbacks.clear();
      scope.dispose();
    },
  };

  // The stage only holds a ticker subscription while it has work: in `demand` mode it sleeps after
  // the last requested frame (so an idle page runs no rAF loop at all) and `invalidate()` wakes it.
  // Offscreen or context-lost stages sleep too; the observers below wake them.
  let off: (() => void) | null = null;
  const sleep = () => {
    off?.();
    off = null;
  };
  const loop = (frame: FrameInfo) => {
    if (!stage.active) return sleep();
    const continuous = mode() === 'always';
    if (!continuous && !needsRender) return sleep();
    if (maxFps > 0 && frame.time - lastRender < 1000 / maxFps - 1) return;
    lastRender = frame.time;
    // Cleared before the callbacks run, so a callback that is still animating (damping, springs)
    // can call invalidate() and keep the next frame coming.
    needsRender = false;
    for (const cb of frameCallbacks) cb(frame, stage);
    renderer.render(scene, camera);
  };
  function wake() {
    if (!off && !scope.disposed) off = ticker.add(loop, Priority.render);
  }
  scope.add(sleep);
  wake();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(resize);
    ro.observe(container ?? canvas);
    scope.add(() => ro.disconnect());
  } else {
    scope.listen(window, 'resize', resize);
  }

  if ((options.pauseWhenOffscreen ?? true) && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      ([entry]) => {
        onscreen = !!entry?.isIntersecting;
        if (onscreen) stage.invalidate();
      },
      { rootMargin: '100px' },
    );
    io.observe(canvas);
    scope.add(() => io.disconnect());
  }

  scope.listen(canvas, 'webglcontextlost', (e: Event) => {
    // preventDefault signals we want the context restored.
    e.preventDefault();
    contextLost = true;
    options.onContextLost?.();
  });
  scope.listen(canvas, 'webglcontextrestored', () => {
    contextLost = false;
    resize();
    stage.invalidate();
    options.onContextRestored?.();
  });

  scope.add(motionPreference.subscribe(() => stage.invalidate()));
  resize();
  return stage;
}
