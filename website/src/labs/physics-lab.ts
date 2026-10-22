/**
 * F — Physics lab. Snow crystals (hexagons) fall into a box and collide; drag to throw them,
 * tap empty space to drop another. Rapier (WASM, ~1.3 MB gzipped) is loaded only when the visitor
 * presses Start — never on scroll — and the button says how much it costs. The world steps on the
 * shared SNOWBROS ticker through `stepPhysics` (@snowbros/adapters) and the loop sleeps when every
 * body sleeps, so a settled pile costs nothing. Impacts pluck the instrument (if sound is on).
 *
 * Reduced motion: bodies are placed already settled (the simulation is stepped to rest off-screen
 * before the first paint) and further drops land without the fall.
 */
import { stepPhysics } from '@snowbros/adapters';
import { prefersReducedMotion, type Scope } from '@snowbros/core';

type Rapier = typeof import('@dimforge/rapier2d-compat').default;

const SCALE = 60; // px per metre

export function init(
  root: HTMLElement,
  scope: Scope,
  hooks: { onImpact?: (index: number, strength: number) => void } = {},
): void {
  const start = root.querySelector<HTMLButtonElement>('[data-phys-start]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-phys-canvas]');
  const status = root.querySelector('[data-phys-status]');
  const readout = root.querySelector('[data-phys-readout]');
  if (!start || !canvas) return;

  let started = false;
  scope.listen(start, 'click', () => {
    if (started) return;
    started = true;
    start.disabled = true;
    start.dataset.state = 'loading';
    if (status) status.textContent = 'Loading Rapier (WASM)…';
    import('@dimforge/rapier2d-compat')
      .then(async (m) => {
        const R = m.default;
        await R.init();
        if (scope.disposed) return;
        start.dataset.state = 'running';
        root.dataset.physics = 'on';
        if (status) status.textContent = 'Drag to throw · tap to drop another';
        run(R, root, canvas, scope, hooks, readout);
      })
      .catch((error) => {
        console.error('[site] physics lab failed', error);
        start.disabled = false;
        started = false;
        start.dataset.state = '';
        if (status) status.textContent = 'Physics could not load. Try again.';
      });
  });
}

function run(
  R: Rapier,
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  scope: Scope,
  hooks: { onImpact?: (index: number, strength: number) => void },
  readout: Element | null,
) {
  const ctx = canvas.getContext('2d')!;
  const world = new R.World({ x: 0, y: 9.81 });
  const events = new R.EventQueue(true);
  scope.add(() => {
    events.free();
    world.free();
  });

  let w = 0;
  let h = 0;
  let dpr = 1;
  const walls: number[] = [];
  const buildWalls = () => {
    for (const handle of walls.splice(0)) {
      const c = world.getCollider(handle);
      if (c) world.removeCollider(c, false);
    }
    const W = w / SCALE;
    const H = h / SCALE;
    const t = 1;
    for (const [x, y, hx, hy] of [
      [W / 2, H + t, W, t],
      [-t, H / 2, t, H * 2],
      [W + t, H / 2, t, H * 2],
    ] as const) {
      walls.push(world.createCollider(R.ColliderDesc.cuboid(hx, hy).setTranslation(x, y)).handle);
    }
  };
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = box.width;
    h = box.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    buildWalls();
    physics.wake();
  };

  interface Flake {
    body: InstanceType<Rapier['RigidBody']>;
    r: number;
    tone: number;
  }
  const flakes: Flake[] = [];
  const byCollider = new Map<number, Flake>();
  const hexVerts = (r: number) => {
    const v = new Float32Array(12);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      v[i * 2] = Math.cos(a) * r;
      v[i * 2 + 1] = Math.sin(a) * r;
    }
    return v;
  };
  const drop = (x: number, y: number) => {
    if (flakes.length >= 40) {
      const old = flakes.shift()!;
      world.removeRigidBody(old.body);
    }
    const r = 0.28 + Math.random() * 0.32;
    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(x / SCALE, y / SCALE)
        .setRotation(Math.random() * Math.PI)
        .setAngvel((Math.random() - 0.5) * 4)
        .setCanSleep(true),
    );
    const collider = world.createCollider(
      (R.ColliderDesc.convexHull(hexVerts(r)) ?? R.ColliderDesc.ball(r))
        .setRestitution(0.35)
        .setFriction(0.6)
        .setDensity(1)
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    const flake = { body, r, tone: flakes.length % 6 };
    flakes.push(flake);
    byCollider.set(collider.handle, flake);
    physics.wake();
  };

  // Pointer: drag a flake to throw it (kinematic follow + release velocity); tap empty space to
  // drop a new one. touch-action keeps vertical page scrolling outside a grab.
  let held: Flake | null = null;
  let last = { x: 0, y: 0, t: 0 };
  let vel = { x: 0, y: 0 };
  const local = (e: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const pick = (x: number, y: number) =>
    flakes.find((f) => {
      const p = f.body.translation();
      return Math.hypot(p.x * SCALE - x, p.y * SCALE - y) < f.r * SCALE * 1.15;
    }) ?? null;
  scope.listen(canvas, 'pointerdown', (e: PointerEvent) => {
    const p = local(e);
    held = pick(p.x, p.y);
    if (!held) {
      drop(p.x, Math.min(p.y, 40));
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    held.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
    last = { ...p, t: performance.now() };
    vel = { x: 0, y: 0 };
    physics.wake();
  });
  scope.listen(canvas, 'pointermove', (e: PointerEvent) => {
    if (!held) return;
    const p = local(e);
    const now = performance.now();
    const dt = Math.max(8, now - last.t) / 1000;
    vel = { x: (p.x - last.x) / dt / SCALE, y: (p.y - last.y) / dt / SCALE };
    last = { ...p, t: now };
    held.body.setNextKinematicTranslation({ x: p.x / SCALE, y: p.y / SCALE });
    physics.wake();
  });
  const release = () => {
    if (!held) return;
    held.body.setBodyType(R.RigidBodyType.Dynamic, true);
    held.body.setLinvel({ x: vel.x * 0.9, y: vel.y * 0.9 }, true);
    held = null;
    physics.wake();
  };
  scope.listen(canvas, 'pointerup', release);
  scope.listen(canvas, 'pointercancel', release);
  // Keyboard: Space/Enter drops a flake; arrow keys nudge the whole pile.
  scope.listen(canvas, 'keydown', (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      drop(w * (0.3 + Math.random() * 0.4), 30);
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const dx = e.key === 'ArrowLeft' ? -2 : e.key === 'ArrowRight' ? 2 : 0;
      const dy = e.key === 'ArrowUp' ? -4 : 0;
      for (const f of flakes) f.body.applyImpulse({ x: dx * f.r, y: dy * f.r }, true);
      physics.wake();
    }
  });

  const ink = getComputedStyle(canvas).getPropertyValue('--fg').trim() || '#f7f4ee';
  const accent = getComputedStyle(canvas).getPropertyValue('--accent').trim() || '#f0561f';
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.25;
    for (const f of flakes) {
      const p = f.body.translation();
      const a = f.body.rotation();
      const r = f.r * SCALE;
      ctx.save();
      ctx.translate(p.x * SCALE, p.y * SCALE);
      ctx.rotate(a);
      ctx.strokeStyle = f === held ? accent : ink;
      // Hexagon rim + three crossing arms: the lattice in miniature.
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const t = (Math.PI / 3) * i + Math.PI / 6;
        const x = Math.cos(t) * r;
        const y = Math.sin(t) * r;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      for (let i = 0; i < 3; i++) {
        const t = (Math.PI / 3) * i + Math.PI / 6;
        ctx.moveTo(Math.cos(t) * r * 0.82, Math.sin(t) * r * 0.82);
        ctx.lineTo(-Math.cos(t) * r * 0.82, -Math.sin(t) * r * 0.82);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  let lastImpact = 0;
  world.timestep = 1 / 60;
  // The adapter steps whatever it is given: wrap the world so each fixed step also drains
  // collision events (impacts pluck the instrument).
  const stepper = {
    step() {
      world.step(events);
      events.drainCollisionEvents((a, b, started) => {
        if (!started) return;
        const f = byCollider.get(a) ?? byCollider.get(b);
        if (!f) return;
        const v = f.body.linvel();
        const speed = Math.hypot(v.x, v.y);
        const now = performance.now();
        if (speed > 1.5 && now - lastImpact > 60) {
          lastImpact = now;
          hooks.onImpact?.(f.tone, Math.min(1, speed / 9));
        }
      });
    },
  };
  const physics = stepPhysics(stepper, {
    hz: 60,
    onStep: () => {
      draw();
      if (readout)
        readout.textContent = `${flakes.length} bodies · ${flakes.filter((f) => !f.body.isSleeping()).length} awake`;
    },
    isAsleep: () => !held && flakes.every((f) => f.body.isSleeping()),
  });
  scope.add(physics);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  scope.add(() => ro.disconnect());
  resize();

  for (let i = 0; i < 14; i++) drop(w * (0.15 + Math.random() * 0.7), -40 - i * 50);
  if (prefersReducedMotion()) for (let i = 0; i < 600; i++) world.step(events);
  draw();
  canvas.focus({ preventScroll: true });
}
