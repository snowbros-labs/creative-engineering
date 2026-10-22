# @snowbros/react

React bindings for SNOWBROS Creative Engineering. StrictMode-safe cleanup, SSR-safe, and no per-frame
re-renders: scroll progress is returned as a **source** you subscribe to, not as state.

```bash
pnpm add @snowbros/react react
```

```tsx
import { RevealText, usePin, useTimeline, useMagnetic } from '@snowbros/react';
import { useRef } from 'react';

export function Story() {
  const section = useRef<HTMLElement>(null);
  const progress = usePin(section, { distance: '200vh' });
  useTimeline(
    (tl) => {
      tl.to('.story-title', { y: [60, 0], opacity: [0, 1] }, { duration: 1 }).to(
        '.story-media',
        { scale: [1.2, 1] },
        { duration: 2 },
        '<',
      );
    },
    [],
    progress,
    { smooth: 10 },
  );

  return (
    <section ref={section}>
      <div className="stage">
        <RevealText as="h2" className="story-title" by="lines">
          From recon to release.
        </RevealText>
        <div className="story-media" />
      </div>
    </section>
  );
}
```

| Export                                                     | Notes                                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `useSnowbros(setup, deps)`                                 | Run imperative setup with a scope; everything registered is disposed on unmount/deps change.                            |
| `useScrollProgress(ref, options)` / `usePin(ref, options)` | Stable `ProgressSource`.                                                                                                |
| `useTimeline(build, deps, source?, scrubOptions?)`         | Builds, optionally scrubs, kills on cleanup.                                                                            |
| `useInView(ref, options)`                                  | Boolean state.                                                                                                          |
| `useFlip()`                                                | `flip(container, () => setState(...))` — waits for commit.                                                              |
| `useReducedMotion()`, `useSignal(signal)`                  | `useSyncExternalStore`-based.                                                                                           |
| `useMagnetic`, `useTilt`, `useMarquee`, `useSpotlight`     | `@snowbros/fx` effects.                                                                                                 |
| `usePressable`, `useProximity`                             | `@snowbros/fx` press depth (`--sb-press`) and pointer proximity (`--sb-proximity`; pass `selector` to target children). |
| `<RevealText>`, `<Reveal>`                                 | Server-render plain text; split after hydration.                                                                        |

Next.js App Router: these are client APIs — use them in `'use client'` components.

License: MIT OR Apache-2.0.
