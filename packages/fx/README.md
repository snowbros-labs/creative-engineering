# @snowbros/fx

Creative effects for SNOWBROS Creative Engineering: magnetic and pointer-reactive UI, cursor
followers, 3D tilt, text scramble, SVG path drawing, clip-path image reveals, infinite marquees,
seeded noise and a procedural canvas flow field.

These effects are built for real products. Each one:
- returns a handle whose `dispose()` can be called more than once and restores the styles it changed;
- follows a documented reduced-motion policy (see the table below);
- does nothing on touch or no-hover devices when it depends on a pointer (pass `force: true` to override);
- measures layout on enter or resize, never on every frame;
- animates `transform`, `opacity`, `clip-path` or CSS variables only, and runs on the one shared
  `@snowbros/core` ticker, which sleeps when idle.

```sh
npm i @snowbros/fx
```

The package depends on `@snowbros/core` and `@snowbros/motion`. It has no third-party runtime
dependencies and ships as ESM.

## Effects

### `magnetic(el, options?)`

The element drifts toward the pointer while it is within `radius` px of its bounds, then springs back.
If the target changes mid-move, the spring keeps its velocity.

```ts
import { magnetic } from '@snowbros/fx';
const h = magnetic(button, {
  strength: 0.35,
  radius: 60,
  spring: 'snappy',
  inner: button.querySelector('span'),
});
// later
h.dispose();
```

### `createCursor(options?)`

A follower dot that sits alongside the native cursor. It does not replace it: `hideNative` defaults to
`false` because the native cursor carries the user's OS accessibility settings. Hovering any
`[data-cursor="name"]` element switches to `states[name]`, detected through a single delegated
listener.

```ts
const cursor = createCursor({
  size: 14,
  mix: 'difference',
  states: { view: { scale: 5, label: 'View' } },
});
// <a data-cursor="view" href="/work/aurora">…</a>
cursor.setState(null); // manual control
```

The follower is `aria-hidden` and has `pointer-events: none`. It is not created at all on touch
devices.

### `tilt(el, options?)`

A pointer-driven 3D tilt for cards and media. Options: `max` (degrees, default 8),
`perspective` (default 800), `glare` (adds a soft highlight layer), `spring`.

### `scramble(el, options?)`

The text decodes character by character from random glyphs. Options: `text`, `chars`, `duration`
(default 0.9 s), `rate` (seconds between glyph swaps, default 0.045, to avoid strobing), and
`trigger` (`load` | `inview` | `hover` | `manual`).

```ts
const s = scramble(heading, { trigger: 'manual' });
await s.play();
```

Screen readers only ever read the real text. It sits in a visually hidden span, and the scrambling
glyphs are in an `aria-hidden` span.

### `drawPath(paths, driver?)`

Draws SVG strokes using `stroke-dasharray` and `stroke-dashoffset`. The handle is seekable, so there
are three ways to drive it:

```ts
import { scrollProgress, scrub } from '@snowbros/motion';
drawPath('#route path', scrollProgress(section)); // follow scroll
drawPath(path, { duration: 1.4, ease: 'inOutCubic' }); // play on time
scrub(drawPath(path), progress, { smooth: 10 }); // smoothed scrub
```

Call `refresh()` after a path's `d` changes.

### `imageReveal(el, options?)`

A clip-path "window opening" reveal. `from` sets the starting edge (`bottom` | `top` | `left` |
`right` | `center`). While the clip opens, the inner media settles from `scale` (default 1.2) down to 1.
The handle is seekable, so you can either scrub it or call `play()`.

```ts
const r = imageReveal(figure, { from: 'bottom' });
scrub(r, scrollProgress(figure, { start: 'top 85%', end: 'top 35%' }));
```

`revealClipPath(from, p)` is exported for use with CSS or other renderers.

### `marquee(el, options?)`

An infinite ticker. Options: `speed` (px/s, default 60), `direction`, `pauseOnHover` (also pauses
while focus is inside, default true), `velocityBoost` (pass `scrollVelocity()` to speed up while
scrolling) and `gap`. Content is cloned to fill the width. The clones are `aria-hidden` and `inert`,
so keyboard users and screen readers only meet the content once. The marquee only runs while it is
visible.

To meet WCAG 2.2.2 (Pause, Stop, Hide), wire `pause()` and `play()` to a visible control.

### `createNoise(seed?)`

Seeded, deterministic gradient noise written for this package. It returns `noise2D`, `noise3D` and
`fbm2D`, all continuous and clamped to [-1, 1]. `createRandom(seed)` is a small seeded PRNG.

### `flowField(canvas, options?)`

A procedural 2D canvas visual: particles follow an evolving noise field and leave fading trails. It
needs no WebGL, is DPR-aware, resizes with its box and runs only while on screen. The particle count
scales with `deviceTier()`. Options: `density`, `color`, `speed`, `lineWidth`, `fade`, `scale`,
`seed` and `maxDpr`.

### `spotlight(el, options?)`

Sets the CSS variables `--sb-x`, `--sb-y`, `--sb-spot-r`, `--sb-spot-color` and `--sb-spot-opacity`
from the pointer position. CSS does the painting, which makes it cheap enough for dense SaaS card
grids:

```css
.card {
  background:
    radial-gradient(
      var(--sb-spot-r) circle at var(--sb-x) var(--sb-y),
      color-mix(
        in oklab,
        var(--sb-spot-color, white) calc(var(--sb-spot-opacity) * 12%),
        transparent
      ),
      transparent
    ),
    var(--surface);
}
```

### `annotate(el, options?)`

Hand-drawn markup ("redline") over text or any element: `underline`, `circle`, `box`, `strike`,
`cross` or `bracket`. The mark is a seeded, wobbly SVG path (`roughness` 0–1, stable per `seed`)
drawn with `drawPath` when the element enters the view (or on `play()`), rebuilt on resize, and
one-per-line for wrapped inline text. Decorative (`aria-hidden`, no pointer events). `color`
accepts CSS variables.

```ts
annotate(document.querySelector('em')!, { type: 'circle', color: 'var(--accent)' });
```

### `pressable(el, options?)`

Physical press depth for real buttons/links: writes `--sb-press` (0 up → 1 down). Presses snap down
instantly, releases spring back (optionally overshooting); pointer, touch and Space/Enter all
work; an optional `haptic` fires on press. CSS decides what depth looks like:

```css
.key {
  translate: 0 calc(var(--sb-press, 0) * 2px);
  box-shadow: 0 calc((1 - var(--sb-press, 0)) * 3px) 0 var(--edge);
}
```

### `proximity(targets, options?)`

Pointer distance as data: each target gets `--sb-proximity` (0 far → 1 under the pointer), eased,
with one listener and one sleeping frame loop for all targets. Use it for variable-font weight,
dock-style scaling or colour. Fine pointers only; values jump under reduced motion.

```css
.word {
  font-variation-settings: "wght" calc(320 + 420 * var(--sb-proximity, 0));
}
```

## Accessibility and reduced-motion policy

| Effect         | Reduced motion                                                                          | Touch / no hover          | Assistive tech                                            |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------- |
| `magnetic`     | Disabled (no movement)                                                                  | No-op                     | Unaffected (transform only)                               |
| `createCursor` | Follows the pointer without lag; no scale animation                                     | Not created               | `aria-hidden`, `pointer-events: none`; native cursor kept |
| `tilt`         | Disabled                                                                                | No-op                     | Glare layer is `aria-hidden`                              |
| `scramble`     | Final text shown immediately                                                            | Works (no pointer needed) | Real text in a visually hidden span; glyphs `aria-hidden` |
| `drawPath`     | `play()` jumps to drawn; scroll-driven still follows the user's own scrolling           | Works                     | Unaffected                                                |
| `imageReveal`  | `play()` jumps to revealed; when scrubbed, the clip follows scroll but there's no scale | Works                     | Unaffected                                                |
| `marquee`      | Static; `play()` ignored                                                                | Works                     | Clones `aria-hidden` + `inert`; expose pause/play         |
| `flowField`    | One static frame, then stops                                                            | Works                     | Decorative: mark the canvas `aria-hidden="true"`          |
| `spotlight`    | Active (it's a static highlight, not motion)                                            | No-op                     | Unaffected                                                |

## License

MIT OR Apache-2.0, at your option.
