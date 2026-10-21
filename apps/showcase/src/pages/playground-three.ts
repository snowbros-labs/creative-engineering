/**
 * 3D stage pattern body. Imported dynamically only when the 3D pattern renders, so three.js
 * (~500 KB minified) stays out of the playground's initial bundle.
 */
import type { Scope } from '@snowbros/core';
import {
  createGradientMaterial,
  createOrbitInertia,
  createParticleField,
  createStage,
  createStudioEnvironment,
  type QualityLevel,
} from '@snowbros/scene';
import { Group, IcosahedronGeometry, Mesh, MeshPhysicalMaterial, PlaneGeometry } from 'three';

export interface CrystalOptions {
  quality: QualityLevel;
  count: number;
  autoSpin: boolean;
  /** Called with a GPU-memory summary when the stage is disposed. */
  onDisposed(summary: string): void;
}

export async function renderCrystal(el: HTMLElement, scope: Scope, options: CrystalOptions): Promise<void> {
  const stage = createStage({
    container: el,
    camera: { position: [0, 0, 7], fov: 35 },
    quality: options.quality,
    renderMode: 'always',
  });
  scope.add(() => {
    const mem = stage.renderer.info.memory;
    const before = `${mem.geometries} geometries / ${mem.textures} textures`;
    stage.dispose();
    options.onDisposed(`disposed stage (${before} → ${mem.geometries} / ${mem.textures})`);
  });
  const env = await createStudioEnvironment(stage.renderer);
  if (scope.disposed) {
    env.dispose();
    return;
  }
  stage.track(env);
  stage.scene.environment = env.texture;

  const bg = createGradientMaterial({ colors: ['#0b0c0e', '#1d1f23', '#3a3d44'], noiseScale: 1.4, speed: 0.15 });
  const plane = stage.add(new Mesh(new PlaneGeometry(16, 10), bg));
  plane.position.z = -4;

  const crystal = new Group();
  const mat = new MeshPhysicalMaterial({
    color: '#c9ced6',
    roughness: 0.32,
    metalness: 0.1,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.55,
    flatShading: true,
  });
  crystal.add(new Mesh(new IcosahedronGeometry(1.25, 0), mat));
  const shell = new MeshPhysicalMaterial({ color: '#ff4f1f', roughness: 0.4, wireframe: true });
  crystal.add(new Mesh(new IcosahedronGeometry(1.7, 1), shell));
  stage.add(crystal);

  const particles =
    options.count > 0
      ? stage.add(createParticleField({ count: options.count, radius: 5, size: 2.2, color: '#d9dee5', opacity: 0.7 }))
      : null;

  scope.add(createOrbitInertia(crystal, stage.canvas, { autoSpin: options.autoSpin ? 0.25 : 0 }));
  stage.canvas.setAttribute('aria-label', 'Rotatable 3D crystal. Use arrow keys to rotate.');

  const readout = document.createElement('div');
  readout.className = 'pg-readouts';
  readout.innerHTML =
    '<span>geometries <b data-g>0</b></span><span>textures <b data-t>0</b></span><span>calls <b data-c>0</b></span><span>dpr <b data-d>0</b></span>';
  el.append(readout);
  const g = readout.querySelector('[data-g]')!;
  const t = readout.querySelector('[data-t]')!;
  const c = readout.querySelector('[data-c]')!;
  const d = readout.querySelector('[data-d]')!;
  let acc = 0;
  stage.onFrame((f) => {
    bg.tick(f.delta);
    particles?.tick(f.delta);
    acc += f.delta;
    if (acc > 0.5) {
      acc = 0;
      const info = stage.renderer.info;
      g.textContent = String(info.memory.geometries);
      t.textContent = String(info.memory.textures);
      c.textContent = String(info.render.calls);
      d.textContent = stage.renderer.getPixelRatio().toFixed(2);
    }
  });
}
