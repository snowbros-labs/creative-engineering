/**
 * Lab B — Interaction. Magnetic target, tilt + spotlight pass, hold-to-confirm with a spring.
 * Pointer-only effects (magnetic, tilt) step aside on touch; the pass also tilts from the
 * keyboard; the hold button works with pointer, Space and Enter. Reduced motion: springs jump.
 */
import {
  createSpringValue,
  haptic,
  Priority,
  prefersReducedMotion,
  type Scope,
  ticker,
} from '@snowbros/core';
import { magnetic, spotlight, tilt } from '@snowbros/fx';
import { buildLattice } from '../lattice/geometry.js';
import { latticeSvg } from '../lattice/svg.js';

export function init(root: HTMLElement, scope: Scope): void {
  // ------------------------------------------------------------ magnetic
  const magnet = root.querySelector<HTMLElement>('[data-ix-magnet]');
  const magnetOut = root.querySelector('[data-ix-magnet-out]');
  if (magnet) {
    scope.add(
      magnetic(magnet, {
        strength: 0.4,
        radius: 80,
        inner: magnet.querySelector('span') ?? undefined,
      }),
    );
    let count = 0;
    scope.listen(magnet, 'pointerenter', () => {
      count++;
      if (magnetOut) magnetOut.textContent = `${count} activation${count === 1 ? '' : 's'}`;
    });
    scope.listen(magnet, 'click', () => {
      magnet.querySelector('span')!.textContent =
        magnet.querySelector('span')!.textContent === 'Pull me' ? 'Again' : 'Pull me';
    });
  }

  // ------------------------------------------------------------ tilt + spotlight
  const pass = root.querySelector<HTMLElement>('[data-ix-tilt]');
  if (pass) {
    const mark = pass.querySelector('[data-pass-mark]');
    if (mark)
      mark.replaceChildren(latticeSvg(buildLattice({ seed: 11, detail: 0.4 }), { nodes: false }));
    scope.add(tilt(pass, { max: 10, glare: true }));
    scope.add(spotlight(pass, { radius: 260 }));
    // Keyboard tilt: arrow keys set a rotation, Escape levels it. Same visual vocabulary.
    let rx = 0;
    let ry = 0;
    scope.listen(pass, 'keydown', (e: KeyboardEvent) => {
      const step = 4;
      if (e.key === 'ArrowLeft') ry -= step;
      else if (e.key === 'ArrowRight') ry += step;
      else if (e.key === 'ArrowUp') rx += step;
      else if (e.key === 'ArrowDown') rx -= step;
      else if (e.key === 'Escape') rx = ry = 0;
      else return;
      e.preventDefault();
      rx = Math.max(-12, Math.min(12, rx));
      ry = Math.max(-12, Math.min(12, ry));
      pass.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    scope.listen(pass, 'blur', () => {
      rx = ry = 0;
      pass.style.transform = '';
    });
  }

  // ------------------------------------------------------------ hold to confirm
  const hold = root.querySelector<HTMLButtonElement>('[data-ix-hold]');
  const ring = root.querySelector<SVGCircleElement>('[data-hold-ring]');
  const label = root.querySelector('[data-hold-label]');
  const status = root.querySelector('[data-hold-status]');
  if (hold && ring && label) {
    const C = 125.66;
    const spring = createSpringValue(0, { stiffness: 220, damping: 26, mass: 1 });
    let holding = false;
    let held = 0;
    let done = false;
    let off: (() => void) | null = null;

    const draw = (v: number) => {
      ring.style.strokeDashoffset = String(C * (1 - Math.max(0, Math.min(1, v))));
    };
    const loop = ({ delta }: { delta: number }) => {
      if (holding && !done) {
        const before = Math.floor(held * 4);
        held += delta;
        // A detent every quarter: you can feel the charge build (where vibration exists).
        if (Math.floor(held * 4) > before && held < 1) haptic('tick', { throttle: 0 });
        spring.set(Math.min(1, held / 1));
        if (held >= 1) complete();
      }
      if (prefersReducedMotion()) spring.jump(spring.target);
      draw(spring.step(delta));
      if (!holding && spring.settled) stop();
    };
    const start = () => {
      if (!off) off = ticker.add(loop, Priority.update);
    };
    const stop = () => {
      off?.();
      off = null;
    };
    scope.add(stop);

    const press = () => {
      if (done) {
        // Second press resets the specimen.
        done = false;
        hold.dataset.done = 'false';
        label.textContent = 'Hold to ship';
        if (status) status.textContent = '';
        held = 0;
        spring.set(0);
        start();
        return;
      }
      holding = true;
      held = 0;
      haptic('press');
      if (status) status.textContent = 'Holding…';
      start();
    };
    const release = () => {
      if (!holding) return;
      holding = false;
      if (!done) {
        spring.set(0);
        if (status) status.textContent = 'Released early: rewound.';
      }
    };
    const complete = () => {
      done = true;
      holding = false;
      hold.dataset.done = 'true';
      spring.set(1);
      label.textContent = 'Shipped';
      haptic('success');
      if (status) status.textContent = 'Shipped. Press again to reset.';
    };

    scope.listen(hold, 'pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return;
      hold.setPointerCapture?.(e.pointerId);
      press();
    });
    scope.listen(hold, 'pointerup', release);
    scope.listen(hold, 'pointercancel', release);
    scope.listen(hold, 'keydown', (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        press();
      }
    });
    scope.listen(hold, 'keyup', (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') release();
    });
    scope.listen(hold, 'blur', release);
    // Clicks are handled by pointer/keyboard handlers; prevent double activation.
    scope.listen(hold, 'click', (e: Event) => e.preventDefault());
  }
}
