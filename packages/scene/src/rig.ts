import { clamp, type Ease, type EaseFn, lerp, resolveEase, type Seekable } from '@snowbros/core';
import { CatmullRomCurve3, type PerspectiveCamera, Vector3 } from 'three';

export type Vec3 = [number, number, number];

export interface CameraKeyframe {
  /** Normalised progress (0..1) at which the camera reaches this pose. */
  at: number;
  position: Vec3;
  /** Point the camera looks at. */
  target: Vec3;
  fov?: number;
  /** Easing of the segment arriving at this keyframe. Default `inOutCubic`. */
  ease?: Ease;
}

export interface CameraRigOptions {
  /** `catmull` follows a smooth spline through all positions. Default `linear`. */
  curve?: 'linear' | 'catmull';
}

export interface CameraRig extends Seekable {
  readonly progress: number;
  /** Current look-at target (read-only use). */
  readonly target: Vector3;
}

/**
 * A keyframed camera path that is seekable by progress — plug it straight into motion's
 * `scrub(rig, pin.progress, { smooth: 8 })` for scroll-driven camera moves.
 */
export function createCameraRig(
  camera: PerspectiveCamera,
  keyframes: CameraKeyframe[],
  options: CameraRigOptions = {},
): CameraRig {
  if (keyframes.length === 0)
    throw new Error('[snowbros] createCameraRig needs at least one keyframe');
  const frames = [...keyframes].sort((a, b) => a.at - b.at);
  const eases: EaseFn[] = frames.map((f) => resolveEase(f.ease ?? 'inOutCubic'));
  const positions = frames.map((f) => new Vector3(...f.position));
  const spline =
    options.curve === 'catmull' && frames.length > 2
      ? new CatmullRomCurve3(positions, false, 'centripetal')
      : null;
  const target = new Vector3();
  const tmp = new Vector3();
  let progress = 0;

  const seek = (p: number) => {
    progress = clamp(p);
    const last = frames.length - 1;
    let i = 0;
    while (i < last && progress > frames[i + 1]!.at) i++;
    const a = frames[i]!;
    const b = frames[Math.min(i + 1, last)]!;
    const span = b.at - a.at;
    const local = span <= 0 ? (progress >= b.at ? 1 : 0) : clamp((progress - a.at) / span);
    const t = eases[Math.min(i + 1, last)]!(local);

    if (spline) {
      // Map segment-local eased t to the spline's parameter: points are evenly spaced in u.
      const u = (i + (i === last ? 0 : t)) / last;
      spline.getPoint(clamp(u), tmp);
      camera.position.copy(tmp);
    } else {
      camera.position.set(
        lerp(a.position[0], b.position[0], t),
        lerp(a.position[1], b.position[1], t),
        lerp(a.position[2], b.position[2], t),
      );
    }
    target.set(
      lerp(a.target[0], b.target[0], t),
      lerp(a.target[1], b.target[1], t),
      lerp(a.target[2], b.target[2], t),
    );
    camera.lookAt(target);
    const fa = a.fov ?? camera.fov;
    const fb = b.fov ?? fa;
    const fov = lerp(fa, fb, t);
    if (fov !== camera.fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  };

  seek(0);
  return {
    duration: 0,
    seek,
    get progress() {
      return progress;
    },
    target,
  };
}
