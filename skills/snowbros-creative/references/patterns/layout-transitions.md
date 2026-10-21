# Pattern family: layout transitions

Contract: **trigger** (state change) · **duration** (functional 150–350 ms) · **ease** (M3 standard
`cubic-bezier(0.2, 0, 0, 1)`) · **reduced motion** (`skip`: apply change instantly) · **cleanup**
(WAAPI animations finish on their own; cancel on unmount if long).

## 1. FLIP (reorder, filter, sort, expand)

- **Intent:** show where items went. The workhorse of functional motion.
- **Use:** sortable tables/lists, filter results, kanban moves, accordion siblings. **Avoid:** > ~150 simultaneously moving nodes (measure; batch or skip), virtualized lists (rows unmount).
- **Code:**

  ```ts
  import { flip } from '@snowbros/motion';
  await flip(list.children, () => applySort(list), { duration: 0.3 });
  ```

  New elements fade in; elements without movement are skipped. Uses WAAPI (compositor transforms); the element's own `transform` is replaced for the animation duration.
- **React:** measure in `useLayoutEffect` before paint, or call `flip(nodes, () => flushSync(() => setState(next)))`.
- **Motion present:** `layout` prop / `LayoutGroup` — use it instead.
- **Native:** SwiftUI `matchedGeometryEffect` / implicit `.animation(_:value:)` on `ForEach` with stable ids; Compose `Modifier.animateItem()` in `LazyColumn`; Flutter `AnimatedList` / `ImplicitlyAnimatedList` patterns, `AnimatedReorderableList` packages.
- **A11y:** focus stays on the moved item; announce result counts via `aria-live="polite"` ("12 results").

## 2. View Transitions (same-document)

- **Intent:** cross-fade/morph between UI states or client-side routes with shared elements.
- **Support:** Chrome 111+, Safari 18+, Firefox 144+ (caniuse, checked 2026-10-21). Cross-document (`@view-transition`) is partial in Firefox — enhancement only.
- **Code:**

  ```ts
  import { viewTransition } from '@snowbros/motion';
  await viewTransition(() => renderRoute(next));          // falls back to instant update
  ```

  ```css
  .card-thumb { view-transition-name: var(--vt-name); }   /* unique per element */
  ::view-transition-old(root), ::view-transition-new(root) { animation-duration: 200ms; }
  ```
- **Rules:** names must be unique on the page at capture time; keep product durations ≤ 300 ms; don't wrap slow network work inside the update callback (the page freezes in the old snapshot) — fetch first, then transition.
- **Frameworks:** Next.js/React Router/Astro/SvelteKit have integration points; prefer the framework's hook if present.
- **Native:** Flutter `Hero`; SwiftUI `matchedGeometryEffect` + `NavigationTransition` (iOS 18 zoom); Compose `SharedTransitionLayout`.

## 3. Shared element (expand card → detail)

- Use View Transitions where supported; fallback FLIP the card into the detail container.
- Return path must reverse to the _original_ card (store its id). Move focus to the detail heading on open; restore focus to the card on close.

## 4. Presence (enter/exit)

- Exits 20–30% shorter than entrances (NN/g). Exit must not block the next interaction: remove from accessibility tree immediately (`inert`/`aria-hidden`) even while visually fading.
- CSS: `@starting-style` + `transition-behavior: allow-discrete` for `display`/`overlay` (dialogs, popovers) — progressive enhancement.

## Testing checklist

- Rapid repeated triggers (click sort 5× fast): no stuck transforms, final layout correct.
- Reduced motion: instant change, no transform residue.
- Keyboard focus remains on the logical element after reorder/transition.
