# Platform: web (HTML/CSS/JS, Astro, server-rendered stacks)

**Detection:** `platform: web-vanilla` — HTML files, no component framework, or Astro, or server
templates (Rails, Django, Laravel, Go) with `<script>` modules.

**Preferred tools (in order):** CSS (transitions, `@keyframes`, `@starting-style`, scroll-driven
animations behind `@supports`) → Web Animations API → View Transitions → `@snowbros/motion`/`fx`/`scene`
via ES modules or `@snowbros/elements` custom elements.

| SNOWBROS concept | Web primitive                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| progress         | `scrollProgress()`; CSS `animation-timeline: scroll()/view()` (enhancement)                        |
| timeline         | `timeline()`; WAAPI `Animation` + `GroupEffect` (not shipped) → use timeline()                     |
| trigger inview   | `inView()` (IntersectionObserver)                                                                  |
| reduced motion   | `@media (prefers-reduced-motion: reduce)`; `prefersReducedMotion()` / `motionPreference.subscribe` |
| responsive       | `createMediaContext({ '(min-width: 900px) and full-motion': … })`                                  |
| cleanup          | `createScope()`; `AbortController` signal on listeners                                             |
| shared element   | View Transitions (same-document: Chrome 111+, Safari 18+, Firefox 144+)                            |

**Progressive-enhancement scaffold**
```html
<script>document.documentElement.classList.add('js-motion')</script>  <!-- inline, in <head> -->
<style>
  .js-motion [data-reveal] { opacity: 0; }        /* hidden only if JS will run */
  @media (prefers-reduced-motion: reduce) { .js-motion [data-reveal] { opacity: 1; } }
</style>
<script type="module">
  import { reveal } from '@snowbros/motion';     // via bundler, or an import map / CDN ESM URL
  reveal('[data-reveal]', { preset: 'fade-up' });
</script>
```

**Astro:** run setup in a `<script>` (bundled, runs once per page); with `<ClientRouter />` view
transitions, re-run setup on `astro:page-load` and dispose on `astro:before-swap`.

**Server-template stacks with Turbo/htmx:** initialize on `turbo:load`/`htmx:load`, dispose on
`turbo:before-render`/`htmx:beforeSwap`; otherwise effects duplicate on every navigation.

**Unsupported / caveats:** CSS scroll-driven animations are not Baseline (Firefox 161+, no `view()`
on Firefox Android) — always ship a JS or static fallback. Cross-document view transitions: partial
in Firefox.
