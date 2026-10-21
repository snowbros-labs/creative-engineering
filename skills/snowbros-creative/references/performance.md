# Performance

Rule: **measure, then claim.** 60 fps is a target on capable hardware, not a promise.

## Budgets (starting points — agree per project)

| Item                                 | Marketing / immersive                                         | Product / SaaS |
| ------------------------------------ | ------------------------------------------------------------- | -------------- |
| LCP (p75, mobile)                    | ≤ 2.5 s                                                       | ≤ 2.5 s        |
| CLS                                  | ≤ 0.1                                                         | ≤ 0.1          |
| INP                                  | ≤ 200 ms                                                      | ≤ 200 ms       |
| JS added by motion work (gzip)       | ≤ 30 KB without 3D; three.js lazy (≈150 KB+ gz) after content | ≤ 10 KB        |
| Frame time during scroll/interaction | ≤ 16.7 ms p90 on mid-tier (≤ 33 ms low-tier with capped FPS)  | ≤ 16.7 ms      |
| 3D assets                            | hero model ≤ 1–2 MB, textures ≤ 2048² (1024² mobile)          | n/a            |
| Long tasks caused by motion code     | none > 50 ms                                                  | none           |

Core Web Vitals thresholds are Google's published "good" values.

## Rules

- Animate `transform`, `opacity` (compositor); `clip-path` and `filter` cost more — test them.
- Never read layout in scroll/rAF hot paths after writing styles (forced reflow). Measure on resize, cache.
- No per-frame framework state updates; write to style/CSS variables/refs.
- One rAF loop (shared ticker); sleep when idle; pause offscreen and on hidden tabs.
- `will-change` only on elements about to animate; remove after.
- Lazy-load: three.js, model files, heavy effects — after first paint/near viewport (`IntersectionObserver` with `rootMargin`).
- Split by route and capability; dynamic `import()` for 3D and editor-like features.
- Images: AVIF/WebP, `srcset`/`sizes`, explicit dimensions, `loading="lazy"` below fold, `fetchpriority="high"` for the LCP image.
- Fonts: subset, `woff2`, preload one critical face, `font-display: swap`, metric-compatible fallbacks.
- Device tier + runtime governor: lower DPR/particles/effects on weak devices (`deviceTier()`, `createQualityGovernor`).

## GPU resources (three.js)

- Dispose geometries, materials, textures, render targets; `renderer.dispose()` on teardown.
- Check `renderer.info.memory` (geometries/textures) and `renderer.info.render.calls` before/after route changes — must return to baseline.
- Reuse geometries/materials across instances; use `InstancedMesh` for repeats.
- Handle `webglcontextlost` — stop the loop; rebuild on `webglcontextrestored`.

## Measurement procedure

1. Production build (`build` + `preview`/`start`), never only dev server.
2. Chrome DevTools Performance panel, CPU 4× slowdown, record: load, scroll through every pinned scene down and up, main interactions. Look for: long tasks, "Forced reflow" warnings, layout/recalc in scroll frames, dropped frames.
3. Lighthouse (mobile) for LCP/CLS/TBT; record the numbers in the report.
4. Bundle delta: compare built asset sizes before/after (`du`/build output, or `size-limit` if configured).
5. Playwright scripted check (see [testing.md](testing.md)): collect `performance.getEntriesByType('longtask')` via PerformanceObserver during a scripted scroll.
6. Memory: heap snapshot after 10 route round-trips (no growth of detached nodes / listeners).

Report numbers with device/throttling conditions. If you only ran on a fast desktop, say so.
