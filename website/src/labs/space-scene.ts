/** Lab C stage body. Dynamically imported by space-lab.ts only when WebGL is used. */

import type { Scope } from '@snowbros/core';
import { animate } from '@snowbros/motion';
import {
  createOrbitInertia,
  createParticleField,
  createStage,
  disposeObject,
} from '@snowbros/scene';
import { Color, Group } from 'three';
import { buildLattice } from '../lattice/geometry.js';
import { createLatticeMesh, type LatticeUniforms } from '../lattice/scene.js';

export interface SpaceValues {
  growth: number;
  detail: number;
  relief: number;
  seed: number;
  snow: boolean;
  spin: boolean;
}
export interface SpaceStats {
  frames: number;
  calls: number;
  geometries: number;
  dpr: number;
}
export interface SpaceApi {
  update(v: SpaceValues): void;
  regrow(): void;
  memory(): { geometries: number; textures: number };
}

const SNOW = new Color('#f5efe4');

export function mountSpace(
  el: HTMLElement,
  scope: Scope,
  initial: SpaceValues,
  onStats: (s: SpaceStats) => void,
): SpaceApi {
  const stage = createStage({
    container: el,
    alpha: true,
    renderMode: initial.spin ? 'always' : 'demand',
    camera: { position: [0, 0, 4.1], fov: 32 },
  });
  scope.add(stage);
  stage.renderer.setClearColor(0x000000, 0);
  stage.canvas.tabIndex = 0;
  stage.canvas.setAttribute('role', 'img');
  stage.canvas.setAttribute(
    'aria-label',
    'Interactive snow crystal lattice. Drag or use arrow keys to rotate.',
  );

  const pivot = new Group();
  pivot.rotation.x = -0.5;
  stage.add(pivot);

  let values = { ...initial };
  let mesh: { object: Group; uniforms: LatticeUniforms } | null = null;
  const build = () => {
    if (mesh) {
      pivot.remove(mesh.object);
      disposeObject(mesh.object);
    }
    mesh = createLatticeMesh(
      buildLattice({ seed: values.seed, detail: values.detail, relief: values.relief }),
      stage.renderer.getPixelRatio(),
      SNOW,
    );
    mesh.uniforms.uGrowth.value = values.growth;
    pivot.add(mesh.object);
    stage.invalidate();
  };
  build();
  scope.add(() => mesh && disposeObject(mesh.object));

  let particles: ReturnType<typeof createParticleField> | null = null;
  const setSnow = (on: boolean) => {
    if (on && !particles) {
      particles = stage.add(
        createParticleField({
          count: 900,
          radius: 4,
          size: 2,
          color: '#e8d9c4',
          opacity: 0.55,
          seed: 3,
        }),
      );
    } else if (!on && particles) {
      stage.scene.remove(particles);
      disposeObject(particles);
      particles = null;
    }
    stage.invalidate();
  };
  setSnow(initial.snow);
  scope.add(() => particles && disposeObject(particles));

  let spin = initial.spin;
  scope.add(
    createOrbitInertia(pivot, stage.canvas, {
      autoSpin: 0,
      onChange: () => stage.invalidate(),
    }),
  );

  let frames = 0;
  let acc = 0;
  stage.onFrame(({ delta }) => {
    frames++;
    if (spin) pivot.rotation.y += delta * 0.25;
    particles?.tick(delta);
    acc += delta;
    if (acc > 0.25 || !spin) {
      acc = 0;
      const info = stage.renderer.info;
      onStats({
        frames,
        calls: info.render.calls,
        geometries: info.memory.geometries,
        dpr: stage.renderer.getPixelRatio(),
      });
    }
    // Particles drift; keep drawing while they are on and spinning, otherwise rest.
    if (spin) stage.invalidate();
  });

  return {
    update(next) {
      const rebuild =
        next.detail !== values.detail || next.relief !== values.relief || next.seed !== values.seed;
      values = { ...next };
      if (rebuild) build();
      else if (mesh) mesh.uniforms.uGrowth.value = next.growth;
      if (next.snow !== !!particles) setSnow(next.snow);
      spin = next.spin;
      stage.invalidate();
    },
    regrow() {
      const g = { v: 0 };
      scope.add(
        animate(
          g,
          { v: [0, values.growth] },
          {
            duration: 1.6,
            ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
            onUpdate: () => {
              if (mesh) mesh.uniforms.uGrowth.value = g.v;
              stage.invalidate();
            },
          },
        ),
      );
    },
    memory() {
      const m = stage.renderer.info.memory;
      return { geometries: m.geometries, textures: m.textures };
    },
  };
}
