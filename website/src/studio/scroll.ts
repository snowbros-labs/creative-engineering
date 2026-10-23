/**
 * Scroll choreography with GSAP ScrollTrigger, loaded after first paint and only when motion is
 * allowed. Three scrubbed moments, each tied to meaning:
 *
 * 1. "Same input in. / Same result out." — the two lines start out of register and slide into
 *    alignment as the band crosses the viewport: the rule, enacted.
 * 2. Project screenshots move at a different depth from their frames (parallax inside a clip).
 * 3. The footer wordmark settles into place as the page ends.
 *
 * Transforms only; native scroll stays native (no smoother, no pinning).
 */
import { prefersReducedMotion } from '@snowbros/core';

export async function initScroll(): Promise<() => void> {
  if (prefersReducedMotion()) return () => {};
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  const ctx = gsap.context(() => {
    // 1. Lines into register. Targets the mask wrappers, so the line reveal underneath is untouched.
    const title = document.querySelector('.studio-title');
    const lines = title ? Array.from(title.querySelectorAll<HTMLElement>('.sb-mask')) : [];
    if (lines.length >= 2) {
      gsap.fromTo(
        lines[0] ?? null,
        { xPercent: -9 },
        {
          xPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '.studio',
            start: 'top bottom',
            end: 'center center',
            scrub: 0.6,
          },
        },
      );
      gsap.fromTo(
        lines[1] ?? null,
        { xPercent: 14 },
        {
          xPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '.studio',
            start: 'top bottom',
            end: 'center center',
            scrub: 0.6,
          },
        },
      );
    }

    // 2. Media depth: the picture drifts inside its frame (frame clips, picture is oversized).
    for (const media of Array.from(document.querySelectorAll<HTMLElement>('.case-media picture'))) {
      gsap.fromTo(
        media,
        { yPercent: 5 },
        {
          yPercent: -5,
          ease: 'none',
          scrollTrigger: {
            trigger: media.closest('.case') ?? media,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      );
    }

    // 3. Footer wordmark settles.
    gsap.fromTo(
      '.foot-word',
      { xPercent: 6, opacity: 0.4 },
      {
        xPercent: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.5 },
      },
    );
  });
  // Lazy images and fonts change layout after measurement.
  const refresh = () => ScrollTrigger.refresh();
  addEventListener('load', refresh, { once: true });
  document.fonts?.ready.then(refresh);
  return () => ctx.revert();
}
