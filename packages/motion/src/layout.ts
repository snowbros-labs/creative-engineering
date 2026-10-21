import { type Ease, prefersReducedMotion, resolveEase, toCssLinear } from '@snowbros/core';

export interface FlipOptions {
  /** Seconds. Default 0.35 — functional UI range (see docs/reference/motion-tokens). */
  duration?: number;
  ease?: Ease;
  /** Also animate size via scale. Default true. */
  scale?: boolean;
  /** Fade elements that appear (no "before" box). Default true. */
  fadeIn?: boolean;
}

/**
 * FLIP layout animation: measure, mutate the DOM, then animate each element from its old box to
 * its new one using compositor-friendly transforms (Web Animations API). The element's own
 * `transform` is replaced for the duration of the animation.
 *
 * The functional-motion workhorse for SaaS: list reordering, filtering, sorting, expanding rows,
 * moving cards between columns.
 *
 * ```ts
 * await flip(list.children, () => sortRows(list));
 * ```
 */
export async function flip(
  elements: Iterable<Element> | ArrayLike<Element>,
  mutate: () => void | Promise<void>,
  options: FlipOptions = {},
): Promise<void> {
  const els = Array.from(elements as ArrayLike<Element>) as HTMLElement[];
  const before = new Map<HTMLElement, DOMRect>();
  for (const el of els) before.set(el, el.getBoundingClientRect());
  await mutate();
  if (prefersReducedMotion() || typeof Element.prototype.animate !== 'function') return;

  const duration = (options.duration ?? 0.35) * 1000;
  const easing = toCssLinear(resolveEase(options.ease ?? 'cubic-bezier(0.2, 0, 0, 1)'), 30);
  const animations: Animation[] = [];
  for (const el of els) {
    if (!el.isConnected) continue;
    const first = before.get(el);
    const last = el.getBoundingClientRect();
    if (!first || (first.width === 0 && first.height === 0)) {
      if (options.fadeIn ?? true) {
        animations.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing }));
      }
      continue;
    }
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = options.scale === false || last.width === 0 ? 1 : first.width / last.width;
    const sy = options.scale === false || last.height === 0 ? 1 : first.height / last.height;
    if (
      Math.abs(dx) < 0.5 &&
      Math.abs(dy) < 0.5 &&
      Math.abs(sx - 1) < 0.01 &&
      Math.abs(sy - 1) < 0.01
    )
      continue;
    animations.push(
      el.animate(
        [
          {
            transformOrigin: 'top left',
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          },
          { transformOrigin: 'top left', transform: 'none' },
        ],
        { duration, easing },
      ),
    );
  }
  await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
}

type ViewTransitionLike = {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
};

/**
 * Same-document View Transition with graceful fallback: runs `update` directly when the API is
 * missing or the user prefers reduced motion. Always resolves after the DOM update is done.
 *
 * Name participating elements with `view-transition-name` in CSS; keep durations in the
 * functional range for product UI.
 */
export async function viewTransition(
  update: () => void | Promise<void>,
  options: { types?: string[] } = {},
): Promise<void> {
  const doc = document as Document & {
    startViewTransition?: (arg: unknown) => ViewTransitionLike;
  };
  if (!doc.startViewTransition || prefersReducedMotion()) {
    await update();
    return;
  }
  const transition = options.types
    ? doc.startViewTransition({ update, types: options.types })
    : doc.startViewTransition(update);
  await transition.updateCallbackDone;
  await transition.finished.catch(() => undefined);
}
