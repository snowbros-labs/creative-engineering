import { resetCapabilities, setMotionPreference } from '@snowbros/core';
import {
  BoxGeometry,
  DataTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  ShaderMaterial,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCameraRig,
  createGradientMaterial,
  createParticleField,
  decideQuality,
  decideRenderMode,
  disposeObject,
  scaleCount,
  withFallback,
} from '../src/index.js';

afterEach(() => {
  setMotionPreference(null);
  resetCapabilities();
  vi.restoreAllMocks();
});

describe('camera rig', () => {
  const keyframes = [
    {
      at: 0,
      position: [0, 0, 10] as [number, number, number],
      target: [0, 0, 0] as [number, number, number],
      fov: 30,
      ease: 'linear' as const,
    },
    {
      at: 0.5,
      position: [5, 0, 5] as [number, number, number],
      target: [0, 1, 0] as [number, number, number],
      fov: 40,
      ease: 'linear' as const,
    },
    {
      at: 1,
      position: [10, 0, 0] as [number, number, number],
      target: [0, 2, 0] as [number, number, number],
      fov: 50,
      ease: 'linear' as const,
    },
  ];

  it('interpolates linearly between keyframes, including fov', () => {
    const cam = new PerspectiveCamera();
    const rig = createCameraRig(cam, keyframes);
    expect(rig.duration).toBe(0);
    rig.seek(0.25);
    expect(cam.position.x).toBeCloseTo(2.5);
    expect(cam.position.z).toBeCloseTo(7.5);
    expect(cam.fov).toBeCloseTo(35);
    expect(rig.target.y).toBeCloseTo(0.5);
    rig.seek(1);
    expect(cam.position.x).toBeCloseTo(10);
    expect(cam.fov).toBeCloseTo(50);
  });

  it('catmull curve hits keyframe positions exactly at their progress', () => {
    const cam = new PerspectiveCamera();
    const rig = createCameraRig(cam, keyframes, { curve: 'catmull' });
    rig.seek(0);
    expect(cam.position.toArray().map((v) => Number(v.toFixed(4)))).toEqual([0, 0, 10]);
    rig.seek(0.5);
    expect(cam.position.x).toBeCloseTo(5);
    expect(cam.position.z).toBeCloseTo(5);
    rig.seek(1);
    expect(cam.position.x).toBeCloseTo(10);
    expect(cam.position.z).toBeCloseTo(0);
  });

  it('clamps progress outside 0..1', () => {
    const cam = new PerspectiveCamera();
    const rig = createCameraRig(cam, keyframes);
    rig.seek(2);
    expect(rig.progress).toBe(1);
    expect(cam.position.x).toBeCloseTo(10);
  });
});

describe('disposeObject', () => {
  it('disposes geometries, materials and textures once, and detaches', () => {
    const geometry = new BoxGeometry();
    const map = new DataTexture();
    const material = new MeshStandardMaterial({ map });
    const uniformTex = new DataTexture();
    const shader = new ShaderMaterial({ uniforms: { uTex: { value: uniformTex } } });
    const root = new Group();
    const parent = new Group();
    parent.add(root);
    root.add(new Mesh(geometry, material), new Mesh(geometry, [material, shader]));

    const spies = [geometry, map, material, uniformTex, shader].map((o) => vi.spyOn(o, 'dispose'));
    disposeObject(root);
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1);
    expect(root.parent).toBeNull();
  });
});

describe('quality governor', () => {
  it('drops a level immediately when over budget', () => {
    expect(
      decideQuality({
        level: 'high',
        averageMs: 25,
        targetFps: 60,
        goodWindows: 2,
        ceiling: 'high',
      }),
    ).toEqual({
      level: 'mid',
      goodWindows: 0,
    });
  });

  it('upgrades only after consecutive good windows and never past the ceiling', () => {
    let state = { level: 'low' as const as 'low' | 'mid' | 'high', goodWindows: 0 };
    const step = () => {
      state = decideQuality({ ...state, averageMs: 8, targetFps: 60, ceiling: 'mid' });
    };
    step();
    step();
    expect(state.level).toBe('low');
    step();
    expect(state.level).toBe('mid');
    for (let i = 0; i < 10; i++) step();
    expect(state.level).toBe('mid');
  });

  it('holds steady in the hysteresis band', () => {
    expect(
      decideQuality({
        level: 'mid',
        averageMs: 15,
        targetFps: 60,
        goodWindows: 2,
        ceiling: 'high',
      }),
    ).toEqual({
      level: 'mid',
      goodWindows: 0,
    });
  });
});

describe('particles and materials', () => {
  it('scales particle counts by device tier', () => {
    expect(scaleCount(1000, 'high')).toBe(1000);
    expect(scaleCount(1000, 'mid')).toBe(650);
    expect(scaleCount(1000, 'low')).toBe(350);
    expect(scaleCount(1, 'low')).toBe(1);
    const field = createParticleField({ count: 100, tier: 'low' });
    expect(field.geometry.getAttribute('position').count).toBe(35);
  });

  it('is deterministic for a seed', () => {
    const a = createParticleField({ count: 10, tier: 'high', seed: 3 });
    const b = createParticleField({ count: 10, tier: 'high', seed: 3 });
    expect(Array.from(a.geometry.getAttribute('position').array)).toEqual(
      Array.from(b.geometry.getAttribute('position').array),
    );
  });

  it('freezes animated time under reduced motion', () => {
    const mat = createGradientMaterial();
    mat.tick(1);
    const moving = (mat.uniforms.uTime as { value: number }).value;
    expect(moving).toBeGreaterThan(0);
    setMotionPreference('reduced');
    mat.tick(1);
    expect((mat.uniforms.uTime as { value: number }).value).toBe(moving);
  });
});

describe('withFallback', () => {
  const stubWebGL = (ok: boolean) => {
    resetCapabilities();
    const original = HTMLCanvasElement.prototype.getContext;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      id: string,
    ) {
      if (id === 'webgl' || id === 'webgl2')
        return ok ? ({ getExtension: () => null } as unknown as WebGLRenderingContext) : null;
      return original.call(this, id as '2d');
    } as typeof original);
  };

  it('uses the fallback without WebGL', () => {
    stubWebGL(false);
    const el = document.createElement('div');
    const render = vi.fn();
    const fallback = vi.fn();
    const handle = withFallback(el, { render, fallback });
    expect(handle.mode).toBe('fallback');
    expect(fallback).toHaveBeenCalledWith(el);
    expect(render).not.toHaveBeenCalled();
    expect(el.dataset.sbRender).toBe('fallback');
  });

  it('respects reduced motion when asked', () => {
    stubWebGL(true);
    setMotionPreference('reduced');
    expect(decideRenderMode({ respectReducedMotion: true })).toEqual({
      mode: 'fallback',
      reason: 'reduced-motion',
    });
    expect(decideRenderMode({})).toEqual({ mode: '3d' });
  });

  it('renders lazily and falls back when render throws', async () => {
    stubWebGL(true);
    let trigger: (entries: Array<{ isIntersecting: boolean }>) => void = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: typeof trigger) {
          trigger = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = document.createElement('div');
    const fallback = vi.fn();
    const handle = withFallback(el, {
      render: async () => {
        throw new Error('shader compile failed');
      },
      fallback,
    });
    expect(handle.mode).toBe('pending');
    trigger([{ isIntersecting: true }]);
    await new Promise((r) => setTimeout(r, 0));
    expect(fallback).toHaveBeenCalledOnce();
    expect(handle.mode).toBe('fallback');
    expect(err).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
