# Platform: Svelte 5 / SvelteKit

**Detection:** `svelte`, `@sveltejs/kit`, `.svelte` files.

**Preferred tools:** built-in `svelte/transition` (`fade`, `fly`, `crossfade`), `svelte/animate`
(`flip` for keyed each-blocks), `svelte/motion` (`Spring`, `Tween` classes in Svelte 5);
`@snowbros/motion` via actions/attachments for scroll choreography and text reveals.

| SNOWBROS concept | Svelte primitive                                                                 |
| ---------------- | -------------------------------------------------------------------------------- |
| cleanup / scope  | `$effect(() => { …; return () => dispose(); })`, or an action's `destroy`        |
| progress         | subscribe inside `$effect`; write styles directly                                |
| springs          | `new Spring(value, { stiffness, damping })` (Svelte 5 `svelte/motion`)           |
| list reorder     | `animate:flip={{ duration: 250 }}` on keyed `{#each}`                            |
| shared element   | `crossfade`                                                                      |
| reduced motion   | `prefersReducedMotion` from `svelte/motion` (Svelte ≥ 5.7) or `motionPreference` |

```svelte
<script lang="ts">
  import { revealText } from '@snowbros/motion';
  function reveal(node: HTMLElement) {
    const r = revealText(node, { by: 'lines' });
    return { destroy: () => r.dispose() };
  }
</script>
<h1 use:reveal>Built on native scroll.</h1>
```

**SvelteKit:** actions/effects run client-side only. `onNavigate` + `document.startViewTransition` for
route transitions (documented SvelteKit pattern) — or `viewTransition()` wrapper.

Evidence: messenger.abeto.co runs Svelte 5 + three r180 (repository `docs/research/notes-live-inspection.md`); Igloo Inc. lists Svelte + Three.js + GSAP (Awwwards case study).
