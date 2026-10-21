import { createScope, type PatternHandle } from '@snowbros/core';
import { resolveTargets, type TargetInput } from './targets.js';

export interface InViewOptions {
  /** Fraction of the element visible before triggering (0..1). Default 0.2. */
  amount?: number;
  /** Margin around the viewport, CSS syntax. Default `"0px 0px -10% 0px"`. */
  margin?: string;
  /** Stop observing after the first enter. Default true. */
  once?: boolean;
  root?: Element | Document | null;
}

/**
 * Run `onEnter` when targets enter the viewport. Return a function from `onEnter` to run on
 * leave (only when `once: false`). One IntersectionObserver per call, shared by all targets.
 */
export function inView(
  targets: TargetInput,
  onEnter: (
    el: Element,
    entry: IntersectionObserverEntry,
    // biome-ignore lint/suspicious/noConfusingVoidType: callback may return nothing or an exit handler
  ) => void | ((entry: IntersectionObserverEntry) => void),
  options: InViewOptions = {},
): PatternHandle {
  const scope = createScope();
  const els = resolveTargets(targets) as Element[];
  if (typeof IntersectionObserver === 'undefined') {
    // No observer (very old browser or test env): treat everything as visible.
    for (const el of els) onEnter(el, {} as IntersectionObserverEntry);
    return scope;
  }
  const once = options.once ?? true;
  const leaves = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const leave = onEnter(entry.target, entry);
          if (once) io.unobserve(entry.target);
          else if (typeof leave === 'function') leaves.set(entry.target, leave);
        } else {
          const leave = leaves.get(entry.target);
          if (leave) {
            leave(entry);
            leaves.delete(entry.target);
          }
        }
      }
    },
    {
      threshold: options.amount ?? 0.2,
      rootMargin: options.margin ?? '0px 0px -10% 0px',
      root: options.root ?? null,
    },
  );
  for (const el of els) io.observe(el);
  scope.add(() => io.disconnect());
  return scope;
}
