# Platform: Vue / Nuxt

**Detection:** `vue`, `nuxt`, `.vue` files.

**Preferred tools:** Vue `<Transition>`/`<TransitionGroup>` (built-in FLIP via `move` class) for
enter/leave/list motion; VueUse (`useScroll`, `usePreferredReducedMotion`, `useElementVisibility`)
if present; `motion-v` if present; `@snowbros/motion` for scroll choreography and text reveals;
`@snowbros/elements` custom elements for template-only usage.

| SNOWBROS concept | Vue primitive                                                                        |
| ---------------- | ------------------------------------------------------------------------------------ |
| cleanup / scope  | `onMounted` create, `onBeforeUnmount` dispose; or `effectScope` + `onScopeDispose`   |
| progress         | subscribe in `onMounted`; write styles to template refs directly                     |
| reduced motion   | `usePreferredReducedMotion()` (VueUse) or `motionPreference`                         |
| list reorder     | `<TransitionGroup>` with `.list-move { transition: transform 250ms }`                |
| enter/leave      | `<Transition>` classes or JS hooks calling `animate()` (call `done` in `onComplete`) |

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { pin, scrub, timeline } from '@snowbros/motion';
const section = ref<HTMLElement>();
let cleanup = () => {};
onMounted(() => {
  const p = pin(section.value!, { distance: '200vh' });
  const s = scrub(timeline().to('.title', { y: [40, 0] }, { duration: 1 }), p.progress);
  cleanup = () => { s.dispose(); p.dispose(); };
});
onBeforeUnmount(() => cleanup());
</script>
```

**Nuxt:** client-only setup (`onMounted` runs client-side only; or `.client.vue` components / `<ClientOnly>`). Page transitions via `app.pageTransition` or `viewTransition: true` (experimental flag in Nuxt) — check the installed version's docs.

**Using custom elements:** tell the compiler `isCustomElement: (tag) => tag.startsWith('sb-')`.
