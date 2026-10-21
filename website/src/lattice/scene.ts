/**
 * WebGL lattice. Loaded lazily (three.js stays out of the first paint). Renders on demand only:
 * a frame is drawn when growth, pose, focus or pointer tilt actually change.
 */
import { clamp, createSpringValue, damp, haptic, type Scope } from '@snowbros/core';
import { createStage, pointerParallax } from '@snowbros/scene';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineSegments,
  Plane,
  Points,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { Lattice } from './geometry.js';

export interface LatticePose {
  /** Spin around the crystal's own axis, radians. */
  rotZ: number;
  /** Tilt toward/away from the viewer, radians. */
  tilt: number;
  /** Horizontal offset in units of the crystal radius. */
  x: number;
  y: number;
  scale: number;
}

export interface LatticeView {
  /** 0 → seed only, 1 → fully grown. */
  setGrowth(value: number): void;
  setPose(pose: Partial<LatticePose>): void;
  /** Highlight an arm (0..5); `amount` 0..1 crossfades. `all` lights every arm (diagram end state). */
  setFocus(arm: number, amount: number, all?: number): void;
  /** Called after each render with tip positions in CSS px relative to the container. */
  onTips(cb: (tips: Array<[number, number]>) => void): void;
  readonly canvas: HTMLCanvasElement;
}

const INK = new Color('#1d1915');
const SIGNAL = new Color('#f0561f');

const lineVert = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec2 aT;
  attribute float aArm;
  uniform float uGrowth;
  uniform float uFocusArm;
  uniform float uFocus;
  uniform float uAll;
  varying float vFocus;
  varying float vAlpha;
  uniform float uPluck[6];
  // Strum: each arm vibrates like a string fixed at the core and the tip.
  vec3 strum(vec3 p, float arm) {
    if (arm < -0.5) return p;
    int i = int(arm + 0.5);
    float amp = 0.0;
    for (int k = 0; k < 6; k++) if (k == i) amp = uPluck[k];
    float ang = arm * 1.0471976 + 1.5707963;
    vec2 dir = vec2(cos(ang), sin(ang));
    float along = clamp((dot(p.xy, dir) - 0.16) / 0.84, 0.0, 1.0);
    vec2 perp = vec2(-dir.y, dir.x);
    p.xy += perp * amp * sin(3.1415926 * along);
    return p;
  }

  void main() {
    float k = clamp((uGrowth - aT.x) / max(aT.y - aT.x, 1e-4), 0.0, 1.0);
    vec3 p = strum(mix(aFrom, position, k), aArm);
    float isFocus = step(abs(aArm - uFocusArm), 0.5);
    // Completed diagram stays ink: only the focused arm (one at a time) turns signal orange.
    vFocus = isFocus * uFocus;
    // Unfocused arms recede while one arm is being explained.
    float dim = 1.0 - 0.6 * uFocus * (1.0 - isFocus) * (1.0 - uAll);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Depth cue: lines behind the crystal's plane are lighter, like a technical drawing.
    float depth = clamp(0.5 - (mv.z + 6.0) * 1.4, 0.0, 1.0);
    vAlpha = dim * mix(0.95, 0.45, depth) * step(0.001, k);
    gl_Position = projectionMatrix * mv;
  }
`;
const lineFrag = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uSignal;
  varying float vFocus;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(mix(uInk, uSignal, vFocus), vAlpha);
  }
`;
const pointVert = /* glsl */ `
  attribute float aT;
  attribute float aArm;
  attribute float aTip;
  uniform float uGrowth;
  uniform float uFocusArm;
  uniform float uFocus;
  uniform float uAll;
  uniform float uPx;
  varying float vFocus;
  varying float vTip;
  uniform float uPluck[6];
  // Strum: each arm vibrates like a string fixed at the core and the tip.
  vec3 strum(vec3 p, float arm) {
    if (arm < -0.5) return p;
    int i = int(arm + 0.5);
    float amp = 0.0;
    for (int k = 0; k < 6; k++) if (k == i) amp = uPluck[k];
    float ang = arm * 1.0471976 + 1.5707963;
    vec2 dir = vec2(cos(ang), sin(ang));
    float along = clamp((dot(p.xy, dir) - 0.16) / 0.84, 0.0, 1.0);
    vec2 perp = vec2(-dir.y, dir.x);
    p.xy += perp * amp * sin(3.1415926 * along);
    return p;
  }

  void main() {
    float on = smoothstep(aT, aT + 0.05, uGrowth);
    float isFocus = step(abs(aArm - uFocusArm), 0.5);
    vFocus = max(isFocus * uFocus, uAll) * aTip + isFocus * uFocus * (1.0 - aTip) * 0.6;
    vTip = aTip;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(strum(position, aArm), 1.0);
    gl_PointSize = on * uPx * mix(3.5, 11.0 + 4.0 * vFocus, aTip);
  }
`;
const pointFrag = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uSignal;
  varying float vFocus;
  varying float vTip;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // Tips are rings (measurement marks), branch nodes are dots.
    float ring = vTip > 0.5 ? smoothstep(0.5, 0.42, d) * smoothstep(0.22, 0.3, d) : 1.0;
    float a = ring * smoothstep(0.5, 0.4, d);
    gl_FragColor = vec4(mix(uInk, uSignal, max(vFocus, vTip * 0.85)), a);
  }
`;

export interface LatticeUniforms {
  uPluck: { value: number[] };
  uGrowth: { value: number };
  uFocusArm: { value: number };
  uFocus: { value: number };
  uAll: { value: number };
  uInk: { value: Color };
  uSignal: { value: Color };
}

/**
 * Lines + nodes for a lattice with the growth/focus shaders. `ink` is the line colour (snow on
 * dark stages). Returned objects are plain three.js; add them via `stage.add` for disposal.
 */
export function createLatticeMesh(
  lattice: Lattice,
  pixelRatio: number,
  ink: Color = INK,
): { object: Group; uniforms: LatticeUniforms } {
  const pos: number[] = [];
  const from: number[] = [];
  const tt: number[] = [];
  const arm: number[] = [];
  for (const s of lattice.segments) {
    pos.push(...s.a, ...s.b);
    from.push(...s.a, ...s.a);
    tt.push(s.t0, s.t1, s.t0, s.t1);
    arm.push(s.arm, s.arm);
  }
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  lineGeo.setAttribute('aFrom', new Float32BufferAttribute(from, 3));
  lineGeo.setAttribute('aT', new Float32BufferAttribute(tt, 2));
  lineGeo.setAttribute('aArm', new Float32BufferAttribute(arm, 1));

  const shared: LatticeUniforms = {
    uPluck: { value: [0, 0, 0, 0, 0, 0] },
    uGrowth: { value: 0 },
    uFocusArm: { value: -9 },
    uFocus: { value: 0 },
    uAll: { value: 0 },
    uInk: { value: ink },
    uSignal: { value: SIGNAL },
  };
  const lineMat = new ShaderMaterial({
    uniforms: shared as unknown as ShaderMaterial['uniforms'],
    vertexShader: lineVert,
    fragmentShader: lineFrag,
    transparent: true,
    depthWrite: false,
  });

  const npos: number[] = [];
  const nt: number[] = [];
  const narm: number[] = [];
  const ntip: number[] = [];
  for (const n of lattice.nodes) {
    npos.push(...n.p);
    nt.push(n.t);
    narm.push(n.arm);
    ntip.push(n.tip ? 1 : 0);
  }
  const nodeGeo = new BufferGeometry();
  nodeGeo.setAttribute('position', new Float32BufferAttribute(npos, 3));
  nodeGeo.setAttribute('aT', new Float32BufferAttribute(nt, 1));
  nodeGeo.setAttribute('aArm', new Float32BufferAttribute(narm, 1));
  nodeGeo.setAttribute('aTip', new Float32BufferAttribute(ntip, 1));
  const nodeMat = new ShaderMaterial({
    uniforms: { ...shared, uPx: { value: pixelRatio } } as unknown as ShaderMaterial['uniforms'],
    vertexShader: pointVert,
    fragmentShader: pointFrag,
    transparent: true,
    depthWrite: false,
  });
  const object = new Group();
  object.add(new LineSegments(lineGeo, lineMat), new Points(nodeGeo, nodeMat));
  return { object, uniforms: shared };
}

export function mountLattice(container: HTMLElement, scope: Scope, lattice: Lattice): LatticeView {
  const stage = createStage({
    container,
    alpha: true,
    renderMode: 'demand',
    camera: { position: [0, 0, 6], fov: 30 },
    antialias: true,
  });
  scope.add(stage);
  stage.renderer.setClearColor(0x000000, 0);
  stage.canvas.setAttribute('aria-hidden', 'true');

  const { object: crystal, uniforms: shared } = createLatticeMesh(
    lattice,
    stage.renderer.getPixelRatio(),
  );

  // pose → tilt (pointer) → crystal. Pointer parallax owns `tiltGroup` rotation only.
  const poseGroup = new Group();
  const tiltGroup = new Group();
  tiltGroup.add(crystal);
  poseGroup.add(tiltGroup);
  stage.add(poseGroup);
  scope.add(
    pointerParallax(tiltGroup, { strength: 0.18, ease: 3, onChange: () => stage.invalidate() }),
  );

  // ------------------------------------------------------------------ state, damped per frame
  const target: LatticePose = { rotZ: 0, tilt: 0.35, x: 0, y: 0, scale: 1 };
  const current: LatticePose = { ...target };
  const focus = { arm: -9, amount: 0, all: 0 };
  let growth = 0;
  let tipsCb: ((t: Array<[number, number]>) => void) | null = null;
  const v = new Vector3();

  const apply = () => {
    crystal.rotation.z = current.rotZ;
    poseGroup.rotation.x = -current.tilt;
    poseGroup.position.set(current.x * 1.15, current.y * 1.15, 0);
    poseGroup.scale.setScalar(current.scale);
  };
  apply();

  stage.onFrame(({ delta }) => {
    // Damping smooths scroll-quantised input; it settles, then rendering stops.
    let moving = false;
    for (const k of Object.keys(target) as Array<keyof LatticePose>) {
      const next = damp(current[k], target[k], 7, delta);
      if (Math.abs(next - target[k]) > 1e-4) moving = true;
      current[k] = Math.abs(next - target[k]) > 1e-4 ? next : target[k];
    }
    apply();
    if (moving) stage.invalidate();
    if (tipsCb) {
      crystal.updateMatrixWorld(true);
      const w = container.clientWidth;
      const h = container.clientHeight;
      tipsCb(
        lattice.tips.map((t) => {
          v.set(t[0], t[1], t[2]).applyMatrix4(crystal.matrixWorld).project(stage.camera);
          return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h];
        }),
      );
    }
  });

  // ------------------------------------------------------------------ strum
  // Crossing an arm with a fine pointer strums it; a tap or click plucks the nearest arm (the
  // touch-screen way to play). An underdamped spring per arm drives the displacement uniform;
  // frames render only while a string still moves. Optional haptic tick on supporting phones.
  const strings = Array.from({ length: 6 }, () =>
    createSpringValue(0, { stiffness: 520, damping: 6, mass: 1 }, 0.0002),
  );
  const ray = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane();
  const hit = new Vector3();
  const normal = new Vector3();

  /** Project a client point onto the crystal plane (local coords), or null. */
  const toLocal = (clientX: number, clientY: number): Vector3 | null => {
    const r = container.getBoundingClientRect();
    if (clientY < r.top || clientY > r.bottom) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    crystal.updateMatrixWorld(true);
    normal.set(0, 0, 1).transformDirection(crystal.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal, hit.setFromMatrixPosition(crystal.matrixWorld));
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return crystal.worldToLocal(hit);
  };
  const armAt = (p: Vector3) => {
    const ang = Math.atan2(p.y, p.x) - Math.PI / 2;
    return ((Math.round(ang / (Math.PI / 3)) % 6) + 6) % 6;
  };
  const lastPluck = new Array<number>(6).fill(0);
  /** Add velocity to a string: continuous even if it is already ringing (no snapping). */
  const pluck = (arm: number, velocity: number) => {
    const now = performance.now();
    if (now - lastPluck[arm]! < 70) return; // one crossing, one pluck
    lastPluck[arm] = now;
    strings[arm]!.impulse(velocity);
    haptic('tick');
    stage.invalidate();
  };

  scope.listen(
    window,
    'pointerdown',
    (e: PointerEvent) => {
      if (shared.uGrowth.value < 0.95) return;
      if (
        (e.target as Element | null)?.closest(
          'a, button, input, select, textarea, label, [tabindex]',
        )
      )
        return;
      const p = toLocal(e.clientX, e.clientY);
      if (!p) return;
      const rad = Math.hypot(p.x, p.y);
      if (rad < 0.15 || rad > 1.12) return;
      pluck(armAt(p), e.pointerType === 'touch' ? 1.6 : 1.3);
    },
    { passive: true },
  );

  const fine =
    typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    // Strum: test the segment between consecutive pointer samples against every arm, so fast
    // swipes register and one stroke can cross several strings. Pluck strength follows the
    // pointer's speed across the crystal.
    let prev: { x: number; y: number; t: number } | null = null;
    scope.listen(
      window,
      'pointermove',
      (e: PointerEvent) => {
        if (shared.uGrowth.value < 0.95) {
          prev = null;
          return;
        }
        const p = toLocal(e.clientX, e.clientY);
        if (!p) {
          prev = null;
          return;
        }
        const now = performance.now();
        const cur = { x: p.x, y: p.y, t: now };
        if (prev) {
          const dt = Math.max(0.008, (now - prev.t) / 1000);
          const speed = Math.hypot(cur.x - prev.x, cur.y - prev.y) / dt;
          for (let arm = 0; arm < 6; arm++) {
            const a = (arm * Math.PI) / 3 + Math.PI / 2;
            const dx = Math.cos(a);
            const dy = Math.sin(a);
            const s0 = dx * prev.y - dy * prev.x;
            const s1 = dx * cur.y - dy * cur.x;
            if (s0 === 0 || s1 === 0 || Math.sign(s0) === Math.sign(s1)) continue;
            const t = s0 / (s0 - s1);
            const along =
              (prev.x + (cur.x - prev.x) * t) * dx + (prev.y + (cur.y - prev.y) * t) * dy;
            if (along < 0.2 || along > 1.05) continue;
            pluck(arm, clamp(speed * 0.25, 0.45, 1.8) * Math.sign(s0));
          }
        }
        prev = cur;
      },
      { passive: true },
    );
  }
  stage.onFrame(({ delta }) => {
    let moving = false;
    strings.forEach((sp, i) => {
      if (sp.settled && sp.value === 0) return;
      const v = sp.step(delta);
      shared.uPluck.value[i] = sp.settled ? 0 : v;
      if (sp.settled) sp.jump(0);
      else moving = true;
    });
    if (moving) stage.invalidate();
  });

  return {
    canvas: stage.canvas,
    setGrowth(value) {
      growth = clamp(value, 0, 1);
      shared.uGrowth.value = growth;
      stage.invalidate();
    },
    setPose(pose) {
      Object.assign(target, pose);
      stage.invalidate();
    },
    setFocus(armIndex, amount, all = 0) {
      if (armIndex === focus.arm && amount === focus.amount && all === focus.all) return;
      focus.arm = armIndex;
      focus.amount = amount;
      focus.all = all;
      shared.uFocusArm.value = armIndex;
      shared.uFocus.value = amount;
      shared.uAll.value = all;
      stage.invalidate();
    },
    onTips(cb) {
      tipsCb = cb;
      stage.invalidate();
    },
  };
}
