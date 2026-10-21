# Pattern family: text reveals

Interaction contract used in every entry: **progress** (time or scroll) · **duration** · **delay** ·
**stagger** · **ease** · **intensity** (travel distance) · **trigger** (`load` | `inview` | `manual` |
`scroll`) · **reduced motion** · **responsive** (re-split on width change) · **cleanup** (revert split).

## 1. Masked line rise

- **Intent:** editorial headline arrives line by line from below a mask. Signature for display type.
- **Use:** H1/H2 on marketing, case studies, launches. **Avoid:** body copy, UI labels, anything read repeatedly, text that must be readable within 300 ms (e.g. errors).
- **Contract defaults:** duration 0.9 s, stagger 80 ms per line, ease `editorial` = `cubic-bezier(0.16, 1, 0.3, 1)`, travel 110% of line height, trigger `inview`, reduced → `fade` (≤200 ms opacity).
- **Implementations:**
  - Vanilla (@snowbros/motion):

    ```ts
    import { revealText } from '@snowbros/motion';
    const r = revealText(h1, { by: 'lines', preset: 'rise', trigger: 'inview' });
    // later: r.dispose()  → kills timeline and restores original markup
    ```
  - React (@snowbros/react): wrap the same call in `useEffect` and return `r.dispose` (or use the adapter's hook; check its README for the exact name).
  - CSS-only: split server-side into `<span class="line"><span>…</span></span>`; animate `transform` with `animation-timeline: view()` behind `@supports (animation-timeline: view())` — not Baseline; Firefox ≥161 only, Firefox Android lacks `view()`.
  - GSAP present: SplitText plugin (check its license status in the project) + `gsap.from(lines, { yPercent: 110, stagger: 0.08 })`.
  - Motion present: split manually, `animate(lines, { y: ['110%', '0%'] }, { delay: stagger(0.08) })`.
  - Native: SwiftUI `Text` per line with `.offset` + `.mask` inside `withAnimation`; Compose `AnimatedVisibility(enter = slideInVertically())` per line; Flutter `SlideTransition` inside `ClipRect` with `Interval`-staggered `CurvedAnimation`s.
- **A11y:** `splitText` keeps an sr-only copy of the original text and marks the split copy `aria-hidden` (unless the text contains links/buttons — then it splits words only and never hides). Content must be visible without JS: only hide lines after JS confirms it will animate.
- **Perf:** transforms only; split once, re-split on width change (line breaks move) — measure width changes with ResizeObserver, debounce ~150 ms.

## 2. Word / char stagger

- **Intent:** emphasis on a short phrase; char-level for 1–4 words max.
- **Defaults:** words 40 ms stagger, chars 18 ms; preset `fade-up` (16 px lift) or `blur` (expensive: `filter`).
- **Code:** `revealText(el, { by: 'chars', preset: 'fade-up' })`.
- **Avoid:** char splitting long text (hundreds of spans, screen-reader risk, layout cost). Never char-split text containing links.

## 3. Scramble / decode

- **Intent:** technical/terminal flavor for short labels, numbers, codes.
- **Use:** dev-tool marketing, data labels on reveal. **Avoid:** sentences; anything users must read immediately.
- **Code (@snowbros/fx — verify against package README):** `scramble(el, { duration: 0.9, trigger: 'inview' })`.
- **A11y:** final text in the accessible name from the start; scrambled glyphs are presentational. Reduced → show final text immediately.

## 4. Scroll-scrubbed text (highlight on read)

- **Intent:** words light up as the reader scrolls (manifesto paragraphs).
- **Implementation:** split words; one `scrollProgress(paragraph, { start: 'top 80%', end: 'bottom 40%' })`; per word opacity = `0.2 + 0.8 * segment(p, i/n, (i+1)/n)`.
- **A11y:** text must already be readable at its dim state (≥ 4.5:1 contrast for the _dim_ color, or do not use).
- **Reduced:** render full opacity, no listener.

## Testing checklist

- Forward and backward scroll leave text fully visible.
- Resize from 1440 → 390 px: lines re-split, nothing clipped.
- Screen reader (or accessibility tree) reads the sentence once, intact.
- `prefers-reduced-motion: reduce`: text visible within 200 ms of entering.
