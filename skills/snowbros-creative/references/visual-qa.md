# Visual QA — render, inspect, diagnose, refine

A build that passes proves the code compiles. It does not prove the page is good. This loop is
how you find out, and it is not optional for any UI work. Run it after every meaningful change,
not once at the end.

## The loop

```
render → capture (viewport matrix) → look → name defects → diagnose cause → fix → re-capture
```

Stop only when the exit criteria at the bottom hold, or when the remaining defects are reported as
known limitations with a reason.

## 1. Render the real thing

- Run the project's dev server (or a production preview for performance questions).
- Prefer a browser automation tool if one is available (Playwright MCP, Chrome DevTools MCP,
  `npx playwright`). Otherwise use `node <skill>/scripts/inspect-render.mjs <url>` — it captures the
  matrix below and reports overflow, unreadably small text, small touch targets and console errors.
- Wait for fonts (`document.fonts.ready`) and for intro motion to finish before judging a frame.
  Judge motion separately (section 5).

## 2. Viewport matrix

| Width × height | Why                                                          |
| -------------- | ------------------------------------------------------------ |
| 320 × 640      | smallest supported phone; first place text and buttons break |
| 360 × 740      | most common Android width                                    |
| 375 × 812      | small iPhone; tall-and-narrow composition                    |
| 390 × 844      | current iPhone default                                       |
| 430 × 932      | large phone; layouts often look "stretched" here             |
| 768 × 1024     | tablet portrait — the most neglected composition             |
| 1024 × 768     | small laptop / tablet landscape; pinned scenes get cramped   |
| 1440 × 900     | reference desktop                                            |
| 1920+ × 1080   | ultrawide: line length, max-width, empty margins             |

Capture **every section**, not only the first screen: scroll in viewport-height steps and save each
frame. Also capture: menu open, a hover/focus state of each control type, the reduced-motion
variant (`emulateMedia({ reducedMotion: 'reduce' })`) and the no-WebGL fallback if 3D is used.

Headless Chromium shows a classic scrollbar (`innerWidth − clientWidth ≈ 15 px`). That is browser
chrome, not overflow. Real overflow is `scrollWidth > clientWidth` on `<html>` — measure it, and
never hide it with `overflow-x: hidden` on `body`; find the element whose right edge exceeds the
viewport and fix that element.

## 3. Look — the questions, in order

Ask these of each captured frame. Write the answer down; "looks fine" is not an answer.
1. **Focal point.** What is the one thing the eye lands on? Is it the thing that matters here?
   If two things compete (illustration vs. headline), one must yield: scale, position, contrast.
2. **Hierarchy.** Can you read the frame in the intended order: eyebrow → headline → support →
   action? Squint (or blur the screenshot): the order should survive.
3. **Territory.** Does any decorative layer cross text? Decoration may sit behind display type only
   if contrast stays ≥ 3:1 everywhere — otherwise give it its own zone.
4. **Rhythm.** Are vertical gaps related (a scale), or arbitrary? Big gaps separate ideas, small
   gaps group them. Look for one gap that is visibly larger than its neighbours for no reason.
5. **Edges.** Does anything touch or clip at the viewport edge, the safe area, or a container edge
   that it shouldn't? Is the gutter the same on every section?
6. **Type.** Line length 45–75 characters for body text; no single-word last lines on headlines
   (`text-wrap: balance`); no headline that breaks inside a word; display sizes that fit the
   longest word at 320 px.
7. **Touch.** Targets ≥ 44 × 44 px with ≥ 8 px between them; primary action reachable by thumb on
   phones; nothing that only works on hover.
8. **Consistency.** Same component, same look, everywhere: buttons, labels, radii, borders, focus.
9. **Finish.** Loading states, empty states, focus rings, active/pressed states, the footer. The
   unfinished parts are where a site stops looking designed.

## 4. Diagnose — symptom → cause → fix

| Symptom (what you see)                                      | Usual cause                                                                                      | Fix                                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Generic** — could be any company's site                   | No idea, only effects; default type; centred everything; even gaps                               | Name the one idea (design-direction.md). Pick type with character, break symmetry on purpose, give one element far more scale than the rest |
| **Unbalanced** — one side heavy, the eye falls off a corner | Visual mass not counterweighted; decoration and text in same zone                                | Move mass toward the axis, or counterweight with type size/colour; give decoration its own zone                                             |
| **Cluttered**                                               | Too many equal-weight elements; every label visible at once                                      | Remove or demote (smaller, muted, later in scroll). One accent use per viewport. Merge duplicate messages                                   |
| **Crowded on phones / "desktop squeezed"**                  | Desktop composition kept, only scaled                                                            | Recompose: see responsive-art-direction.md (stack zones, crop the visual, move actions to thumb zone)                                       |
| **Unfinished**                                              | Default form controls, missing states, abrupt section joins                                      | Style controls, add hover/focus/pressed, design the transition between adjacent sections (shared colour, overlap, or a deliberate rule)     |
| **Flat / lifeless**                                         | No depth cues, uniform colour, nothing responds                                                  | One depth layer (grain, light, overlap), one response to input (press depth, proximity), real content as imagery                            |
| **Noisy motion**                                            | Everything animates the same way at the same time                                                | Motion only where it explains or rewards; one signature; the rest functional or still                                                       |
| **Headline breaks badly**                                   | `vw`-only sizing; no max; long word                                                              | `clamp()` with a floor sized for the longest word at 320 px; `text-wrap: balance`; check every breakpoint                                   |
| **Huge empty gap**                                          | `1fr` row or `min-height: 100vh` stretching content apart                                        | Fixed gap, or align the group together and let the section end                                                                              |
| **Overflow on one width only**                              | A min-content track: long word, `white-space: nowrap`, grid `auto` track fed by measured content | `minmax(0, 1fr)` tracks, `min-width: 0` on flex/grid children, `overflow-wrap: anywhere` on code/URLs                                       |

## 5. Interact, don't just look

Screenshots hide most defects. For each interactive element:
- Hover, focus (keyboard Tab), press, release — each state visible and distinct.
- Open and close the menu with pointer **and** Escape; focus returns to the trigger; page scroll is
  locked while open and restored after; links inside close it.
- Scroll down _and back up_ through scroll-linked sections; resize across a breakpoint mid-page;
  confirm nothing duplicates or freezes.
- Touch: tap targets on a phone viewport; any drag/tilt gesture must not block vertical scroll.
- Reduced motion: content complete and readable with no motion at all.
- Idle cost: after everything settles, count `requestAnimationFrame` calls over 3 s (wrap rAF in an
  init script). A settled page should schedule zero frames unless something is visibly animating.

## 6. Exit criteria

All must hold, or be listed as a known limitation with a reason:
- No `scrollWidth > clientWidth` at any width in the matrix.
- Every frame in the matrix passes questions 1–9.
- Every interactive element works by pointer, touch and keyboard.
- Reduced-motion and no-WebGL variants are complete.
- Console has no errors; idle page schedules no frames.
- You can name the page's one idea and point at where each viewport expresses it.

Report what you inspected (widths, states, interactions), not just that you inspected.


## 7. Traps found in production (2026-10-24)

| Symptom                                                  | Cause                                                                                      | Fix                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `scrollWidth` > viewport but no element's rect overflows | hidden (`visibility: hidden`) fallback text, or a fixed canvas at `100vw` with a scrollbar | clip the container; size layers to the document width, not `100vw`     |
| Buttons render as huge circles                           | a reused `grid-column: 1 / 9` rule inside a different grid created implicit columns        | scope column rules; set `> * { grid-column: 1 / -1 }` in stacked grids |
| Hover fill invisible                                     | fill colour equals the section colour                                                      | per-section `--fill` override                                          |
| A test server serves an old build                        | a stale `vite preview` still owns the port                                                 | kill the port owner before e2e (`netstat -ano` → `taskkill`)           |
| Headless frame times look terrible                       | headless rasterises canvas on the CPU                                                      | confirm in headed GPU Chrome before optimising further                 |
