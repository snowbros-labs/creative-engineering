import {
  createScope,
  damp,
  type PatternHandle,
  Priority,
  prefersReducedMotion,
  type ReadonlySignal,
  ticker,
  wrap,
} from '@snowbros/core';
import { round3 } from './internal.js';

export interface MarqueeOptions {
  /** Pixels per second. Default 60. */
  speed?: number;
  direction?: 'left' | 'right';
  /** Pause while hovered or focused within. Default true. */
  pauseOnHover?: boolean;
  /** Scroll velocity (px/s), e.g. `scrollVelocity()` from @snowbros/motion, to speed up on scroll. */
  velocityBoost?: ReadonlySignal<number>;
  /** Gap between repeated groups, CSS length. Default `0px`. */
  gap?: string;
}

export interface MarqueeHandle extends PatternHandle {
  play(): void;
  pause(): void;
  readonly paused: boolean;
}

/**
 * Infinite marquee. Content is cloned enough times to fill the container; clones are
 * `aria-hidden` and `inert` so assistive tech and keyboard users meet the content once.
 *
 * Runs on the shared ticker only while visible (IntersectionObserver) and unpaused.
 * Reduced motion: renders static (no movement); `play()` is ignored. Expose `pause()`/`play()`
 * through a visible control for WCAG 2.2.2 when the marquee runs longer than 5 seconds.
 */
export function marquee(el: HTMLElement, options: MarqueeOptions = {}): MarqueeHandle {
  const scope = createScope();
  const speed = options.speed ?? 60;
  const dir = options.direction === 'right' ? 1 : -1;
  const gap = options.gap ?? '0px';
  const originals = Array.from(el.childNodes);
  const prevOverflow = el.style.overflow;

  const track = document.createElement('div');
  track.className = 'sb-marquee-track';
  track.style.cssText = `display:flex;width:max-content;gap:${gap};will-change:transform`;
  const group = document.createElement('div');
  group.className = 'sb-marquee-group';
  group.style.cssText = `display:flex;flex:none;gap:${gap}`;
  group.append(...originals);
  track.appendChild(group);
  el.appendChild(track);
  el.style.overflow = 'clip';

  let clones: HTMLElement[] = [];
  let groupWidth = 0;
  let offset = 0;
  let boost = 0;
  let visible = true;
  let hovered = false;
  let userPaused = false;
  let off: (() => void) | null = null;

  const measure = () => {
    groupWidth = group.offsetWidth + (Number.parseFloat(getComputedStyle(track).columnGap) || 0);
    const needed = groupWidth > 0 ? Math.max(1, Math.ceil(el.clientWidth / groupWidth)) : 1;
    while (clones.length < needed) {
      const c = group.cloneNode(true) as HTMLElement;
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('inert', '');
      track.appendChild(c);
      clones.push(c);
    }
    while (clones.length > needed) clones.pop()?.remove();
  };

  const tick = (frame: { delta: number }) => {
    const v = options.velocityBoost ? Math.min(Math.abs(options.velocityBoost.get()) / 400, 4) : 0;
    boost = damp(boost, v, 6, frame.delta);
    offset += dir * speed * (1 + boost) * frame.delta;
    if (groupWidth > 0) offset = wrap(offset, -groupWidth, 0);
    track.style.transform = `translate3d(${round3(offset)}px, 0, 0)`;
  };

  const update = () => {
    const shouldRun = visible && !hovered && !userPaused && !prefersReducedMotion();
    if (shouldRun && !off) off = ticker.add(tick, Priority.update);
    else if (!shouldRun && off) {
      off();
      off = null;
    }
  };

  measure();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    scope.add(() => ro.disconnect());
  }
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      update();
    });
    io.observe(el);
    scope.add(() => io.disconnect());
  }
  if (options.pauseOnHover ?? true) {
    const set = (v: boolean) => () => {
      hovered = v;
      update();
    };
    scope.listen(el, 'pointerenter', set(true));
    scope.listen(el, 'pointerleave', set(false));
    scope.listen(el, 'focusin', set(true));
    scope.listen(el, 'focusout', set(false));
  }
  update();

  scope.add(() => {
    off?.();
    off = null;
    for (const c of clones) c.remove();
    clones = [];
    el.append(...originals);
    track.remove();
    el.style.overflow = prevOverflow;
  });

  return {
    play() {
      userPaused = false;
      update();
    },
    pause() {
      userPaused = true;
      update();
    },
    get paused() {
      return off === null;
    },
    dispose: () => scope.dispose(),
  };
}
