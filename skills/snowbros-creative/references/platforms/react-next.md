# Platform: React / Next.js (also Remix/React Router, Vite + React)

**Detection:** `react`, `next`, `@remix-run/*`, `@react-router/dev` in dependencies.

**Preferred tools:** existing library first — Motion (`motion/react`) for component/layout/presence
motion; GSAP (`useGSAP`) if present. `@snowbros/react` (hooks around `@snowbros/motion`/`fx`) for
scroll choreography, text reveals and pointer effects when no equivalent exists. R3F for 3D in React.

| SNOWBROS concept   | React primitive                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| cleanup / scope    | `useEffect(() => { const s = createScope(); …; return () => s.dispose(); }, [deps])`                               |
| progress           | subscribe in an effect; write to `ref.current.style` — **not** `setState` per frame                                |
| shared signal      | `useSyncExternalStore(signal.subscribe, signal.get, () => serverValue)`                                            |
| reduced motion     | `motionPreference` via `useSyncExternalStore`; Motion's `useReducedMotion` / `<MotionConfig reducedMotion="user">` |
| layout transitions | Motion `layout`; or `flip()` around `flushSync`                                                                    |
| presence           | Motion `AnimatePresence`; or CSS `@starting-style`                                                                 |
| route transitions  | Next/React Router view-transition integrations if available; else `viewTransition()` around navigation             |

**Effect skeleton (vanilla API inside React):**
```tsx
'use client';
import { useEffect, useRef } from 'react';
import { revealText } from '@snowbros/motion';

export function Headline({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const r = revealText(ref.current!, { by: 'lines' });
    return () => r.dispose(); // restores markup; safe under StrictMode double-invoke
  }, []);
  return <h1 ref={ref}>{children}</h1>;
}
```

**Next.js App Router / RSC:**
- Animation code lives in `'use client'` leaf components. Keep pages/layouts as server components; pass content as props/children.
- Server HTML must show final content. Hide-before-reveal only via a class added by an inline script or after mount; otherwise hydration flashes or content invisible without JS.
- Never read `window`/`matchMedia` during render; do it in effects. Avoid hydration mismatches from motion preference (render the same markup, adjust in effect).
- Lazy-load heavy modules: `const Scene = dynamic(() => import('./Scene'), { ssr: false })`.
- Route changes: effects clean up on unmount; verify no duplicate listeners after client navigation.

**StrictMode:** effects run twice in dev — disposal must be complete and idempotent (all @snowbros
handles are).

**Pitfalls:** per-frame `setState` (re-renders 60×/s); creating timelines in render; refs to
conditionally rendered nodes (null on first effect); `useLayoutEffect` warnings on the server
(guard or use `useEffect`).
