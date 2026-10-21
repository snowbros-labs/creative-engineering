# Pattern family: pointer interactions

Contract: **trigger** (pointer move/enter/leave, press) · **intensity** (strength, max angle) ·
**spring** (`snappy` / `smooth` presets, retargets with velocity) · **responsive** (fine pointer only)
· **reduced motion** (`skip`: no follow/tilt) · **cleanup** (restores styles, removes listeners).

All entries: only on `(hover: hover) and (pointer: fine)`. Touch devices get press feedback instead.
API names below are from `@snowbros/fx` — verify exact options against the package README.

## 1. Magnetic element

- **Intent:** a primary CTA or icon button leans toward the cursor; signals interactivity.
- **Use:** 1–3 key controls per page. **Avoid:** dense UI, nav lists, form fields (target moves away from the user!).
- **Defaults:** strength 0.35, activation radius 60 px beyond bounds, `snappy` spring; optional inner label moving more (parallax).
- **Code:** `const h = magnetic(button, { strength: 0.3 }); // h.dispose()`
- **CSS-only fallback:** none meaningful — use a hover scale (`transform: scale(1.03)`, 150 ms).
- **A11y:** never move the element under a keyboard focus; hit area must not shrink.

## 2. Tilt (3D card)

- **Intent:** physicality for product cards/media.
- **Defaults:** max 8°, perspective 800 px, `smooth` spring, optional glare.
- **Code:** `tilt(card, { max: 6, glare: true })`.
- **Avoid:** cards with dense text (perspective blurs/moves text); tables.

## 3. Custom cursor / follower

- **Intent:** contextual label ("Drag", "View") on media-heavy portfolio pages.
- **Rules:** never hide the native cursor on text or form content; keep native cursor visible by default; follower is decorative (`aria-hidden`, `pointer-events: none`); disable on touch and reduced motion.
- **Code:** `const c = createCursor(); // states via data attributes — see README`.
- **Perf:** one rAF via shared ticker; transform only; no `mousemove` → React state.

## 4. Spotlight / pointer-tracked light

- **Intent:** a soft light following the pointer inside a card or grid (common on dev-tool sites; use with restraint).
- **Implementation:** write `--x`/`--y` CSS variables on pointer move; CSS `radial-gradient(400px at var(--x) var(--y), …)`.
- **Code:** `spotlight(grid)`.
- **Perf:** variables on the _container_, not every card; `pointermove` is passive.

## 5. Press feedback (all devices)

- `:active { transform: scale(0.97) }` with 100 ms; on touch, use `pointerdown` styles not hover. Haptics only native.

## Equivalents

- Motion: `useMotionValue` + `useSpring` + `onPointerMove`.
- GSAP: `gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' })`.
- Native: SwiftUI `.hoverEffect()` (iPadOS/visionOS), `onContinuousHover`; Compose `Modifier.hoverable` + `animateFloatAsState`; Flutter `MouseRegion` + `AnimatedSlide`/`TweenAnimationBuilder`.
