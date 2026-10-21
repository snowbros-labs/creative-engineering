# Accessibility requirements

Target WCAG 2.2 AA as the floor; meet SC 2.3.3 (AAA, animation from interactions) for motion because
it is cheap to satisfy with the policies below.

## Motion

- Honor `prefers-reduced-motion: reduce` everywhere; every pattern has a declared policy (`skip`/`fade`/`minimal`/`keep`).
- Offer an in-product "Reduce motion" toggle on motion-heavy sites (`setMotionPreference('reduced')` in `@snowbros/core`); it may only _add_ restraint.
- Nothing auto-moves for more than 5 s without pause/stop/hide controls (SC 2.2.2): marquees, carousels, video backgrounds, ambient canvases.
- No flashing > 3 times per second (SC 2.3.1).
- Parallax, zoom-on-scroll, scroll-jacked movement: disable under reduced motion.
- State never conveyed by motion alone — pair with text/icon/ARIA state.

## Content and semantics

- Content visible and readable without JS, WebGL or animation completion.
- Real headings (one `h1`), landmarks (`header`, `nav`, `main`, `footer`), lists, buttons vs links used correctly.
- Split text: accessible name preserved (sr-only original + `aria-hidden` split), never hide links/buttons.
- Canvas/WebGL: decorative → `aria-hidden="true"`; informative → text alternative or DOM mirror.
- Images: meaningful `alt`; decorative `alt=""`.

## Keyboard and focus

- Everything operable by keyboard; logical tab order matching visual order.
- Visible `:focus-visible` indicator: ≥ 2 px, ≥ 3:1 contrast against adjacent colors (SC 2.4.11/2.4.13 guidance).
- Focus not obscured by sticky headers/pinned stages (SC 2.4.11) — add `scroll-margin-top` to targets.
- Dialogs: focus moves in, is contained, returns to trigger on close; Escape closes.
- Pinned/horizontal sections: focusing an item must bring it into view.

## Pointer and touch

- Targets ≥ 24×24 CSS px (SC 2.5.8 AA); aim for 44×44 on touch.
- No hover-only functionality; drag interactions have a single-pointer alternative (SC 2.5.7).
- Custom cursors never hide the system cursor on content; magnetic targets never move away from the pointer.
- `touch-action: pan-y` on interactive canvases so scrolling still works.

## Color and text

- Contrast: body ≥ 4.5:1; large text (≥ 24 px or 19 px bold) and UI component boundaries ≥ 3:1.
- Check contrast over animated/gradient/3D backgrounds at their brightest frame.
- Text resizes to 200% without loss; reflow at 320 CSS px width (SC 1.4.10) — pinned scenes must degrade.
- Preserve text selection; don't disable user-select on content.

## Announcements

- Async results: `role="status"` / `aria-live="polite"`; errors that block: `role="alert"` sparingly.
- Loading states have text ("Loading projects…"), not just spinners.

## Verification

- axe via Playwright (`@axe-core/playwright`): zero serious/critical violations.
- Keyboard-only pass of every changed flow.
- `page.emulateMedia({ reducedMotion: 'reduce' })` run of every animated page.
- Zoom 200% + 320 px width check.
- Screen-reader spot check (VoiceOver/NVDA) for split text, dialogs, live regions.
