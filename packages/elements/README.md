# @snowbros/elements

Light-DOM Web Components — use SNOWBROS reveals, pins and effects from plain HTML, Vue, Svelte, Astro,
Rails, Django, PHP… No shadow DOM: your CSS and server-rendered content apply unchanged.

```bash
pnpm add @snowbros/elements
```

```html
<script type="module">import '@snowbros/elements/define';</script>

<sb-reveal-text by="lines" preset="rise"><h1>Cold precision.</h1></sb-reveal-text>

<sb-pin distance="200vh">
  <div class="stage"><div class="bar"></div></div>
</sb-pin>

<style>
  /* Scroll-driven styling stays in CSS: elements publish --sb-progress (0..1). */
  sb-pin .bar { transform: scaleX(var(--sb-progress)); transform-origin: left; }
</style>
```

| Element            | Attributes                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `<sb-reveal>`      | `preset`, `stagger`, `duration`, `delay`, `children` (reveal children instead of itself) |
| `<sb-reveal-text>` | `by` (`lines`/`words`/`chars`), `preset`, `stagger`, `delay`, `trigger`                  |
| `<sb-pin>`         | `distance`, `top` — publishes `--sb-progress` + `sb-progress` events                     |
| `<sb-scroll>`      | `start`, `end` — publishes `--sb-progress`                                               |
| `<sb-magnetic>`    | `strength`, `radius`                                                                     |
| `<sb-tilt>`        | `max`, `glare`                                                                           |
| `<sb-marquee>`     | `speed`, `direction`, `pause-on-hover`                                                   |
| `<sb-spotlight>`   | `radius` — sets `--sb-x` / `--sb-y`                                                      |

**Vue:** tell the compiler they are custom elements (`compilerOptions.isCustomElement: (t) => t.startsWith('sb-')`).
**Svelte / Astro / HTML:** works as-is.

Register manually with `defineElements()` from the root entry if you prefer no side-effect import.

License: MIT OR Apache-2.0.
