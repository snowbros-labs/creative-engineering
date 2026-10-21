import {
  capabilities,
  createScope,
  type DeviceTier,
  deviceTier,
  type PatternHandle,
  prefersReducedMotion,
  type Scope,
} from '@snowbros/core';

const TIER_ORDER: DeviceTier[] = ['low', 'mid', 'high'];

export interface FallbackOptions {
  /** Build the 3D experience. Register cleanups on `scope`. May be async (lazy imports). */
  render: (container: HTMLElement, scope: Scope) => void | Promise<void>;
  /** Render the non-WebGL alternative (image, video poster, CSS composition). */
  fallback: (container: HTMLElement) => void;
  require?: { webgl2?: boolean; minTier?: DeviceTier };
  /** Use the fallback when the user prefers reduced motion. Default false (3D can be static). */
  respectReducedMotion?: boolean;
  /** Start rendering when the container is this close to the viewport. Default `200px`. */
  rootMargin?: string;
  /** Called with the chosen mode and reason (for analytics or debugging). */
  onDecision?: (mode: '3d' | 'fallback', reason: string) => void;
}

export type FallbackDecision = { mode: '3d' } | { mode: 'fallback'; reason: string };

/** Pure decision used by `withFallback` (exported for tests and SSR hints). */
export function decideRenderMode(
  options: Pick<FallbackOptions, 'require' | 'respectReducedMotion'>,
): FallbackDecision {
  const caps = capabilities();
  if (!caps.webgl) return { mode: 'fallback', reason: 'no-webgl' };
  if (options.require?.webgl2 && !caps.webgl2) return { mode: 'fallback', reason: 'no-webgl2' };
  if (
    options.require?.minTier &&
    TIER_ORDER.indexOf(deviceTier()) < TIER_ORDER.indexOf(options.require.minTier)
  ) {
    return { mode: 'fallback', reason: 'low-tier' };
  }
  if (options.respectReducedMotion && prefersReducedMotion())
    return { mode: 'fallback', reason: 'reduced-motion' };
  return { mode: '3d' };
}

/**
 * Progressive-enhancement entry point for 3D. Decides between WebGL and a fallback, defers the
 * (usually lazily imported) 3D work until the container approaches the viewport, and falls back
 * if rendering throws. Always render meaningful fallback content in your HTML first; this only
 * upgrades it.
 */
export function withFallback(
  container: HTMLElement,
  options: FallbackOptions,
): PatternHandle & {
  readonly mode: '3d' | 'fallback' | 'pending';
} {
  const scope = createScope();
  let mode: '3d' | 'fallback' | 'pending' = 'pending';

  const useFallback = (reason: string) => {
    mode = 'fallback';
    container.dataset.sbRender = 'fallback';
    options.onDecision?.('fallback', reason);
    options.fallback(container);
  };

  const decision = decideRenderMode(options);
  if (decision.mode === 'fallback') {
    useFallback(decision.reason);
  } else {
    const start = async () => {
      if (scope.disposed || mode !== 'pending') return;
      mode = '3d';
      container.dataset.sbRender = '3d';
      options.onDecision?.('3d', 'capable');
      const renderScope = scope.child();
      try {
        await options.render(container, renderScope);
      } catch (error) {
        console.error('[snowbros] 3D render failed, using fallback', error);
        renderScope.dispose();
        if (!scope.disposed) useFallback('render-error');
      }
    };
    if (typeof IntersectionObserver === 'undefined') {
      void start();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            void start();
          }
        },
        { rootMargin: options.rootMargin ?? '200px' },
      );
      io.observe(container);
      scope.add(() => io.disconnect());
    }
  }

  return {
    get mode() {
      return mode;
    },
    dispose: () => scope.dispose(),
  };
}
