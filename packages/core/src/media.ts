import { isBrowser, motionPreference } from './env.js';
import { type Cleanup, createScope, type Scope } from './scope.js';

// biome-ignore lint/suspicious/noConfusingVoidType: setup may return nothing or a cleanup
export type MediaSetup = (scope: Scope) => void | Cleanup;

/**
 * Responsive, preference-aware setup. Each key is a media query; when it matches, its setup
 * runs inside a fresh scope; when it stops matching, that scope is disposed.
 *
 * The special key `reduced-motion` matches `prefers-reduced-motion: reduce` *or* an in-app
 * override set through `setMotionPreference('reduced')`, and `full-motion` is its inverse.
 *
 * ```ts
 * const media = createMediaContext({
 *   '(min-width: 900px) and full-motion': (s) => s.add(pinStory(section)),
 *   '(max-width: 899px), reduced-motion': (s) => s.add(staticStory(section)),
 * });
 * ```
 */
export function createMediaContext(queries: Record<string, MediaSetup>): { dispose(): void } {
  const root = createScope();
  if (!isBrowser || typeof matchMedia !== 'function') return root;

  for (const [rawQuery, setup] of Object.entries(queries)) {
    // Split comma alternatives so motion keywords can appear inside any branch.
    const branches = rawQuery.split(',').map((b) => b.trim());
    const parsed = branches.map((branch) => {
      const parts = branch.split(/\s+and\s+/).map((p) => p.trim());
      const motion = parts.find((p) => p === 'reduced-motion' || p === 'full-motion');
      const css = parts.filter((p) => p !== motion).join(' and ');
      return { motion, mql: css ? matchMedia(css) : null };
    });

    let active: Scope | null = null;
    const evaluate = () => {
      const pref = motionPreference.get();
      const matches = parsed.some(({ motion, mql }) => {
        const motionOk =
          !motion ||
          (motion === 'reduced-motion' && pref === 'reduced') ||
          (motion === 'full-motion' && pref === 'full');
        return motionOk && (mql ? mql.matches : true);
      });
      if (matches && !active) {
        active = root.child();
        const result = setup(active);
        if (typeof result === 'function') active.add(result);
      } else if (!matches && active) {
        active.dispose();
        active = null;
      }
    };

    for (const { mql } of parsed) {
      if (mql) root.listen(mql, 'change', evaluate);
    }
    root.add(motionPreference.subscribe(evaluate));
    evaluate();
  }
  return root;
}
