# @snowbros/tokens

Motion, color, type, spacing and radius tokens in the W3C Design Tokens (DTCG) format, generated to CSS
custom properties and typed TypeScript.

```bash
pnpm add @snowbros/tokens
```

```css
@import "@snowbros/tokens/tokens.css";
.menu {
  transition: opacity var(--sb-motion-duration-moderate) var(--sb-motion-easing-functional-enter);
}
```

```ts
import { animate } from '@snowbros/motion';
import { motion } from '@snowbros/tokens';
animate(panel, { y: [8, 0], opacity: [0, 1] }, motion.functional.enter); // { duration: 0.24, ease: 'cubic-bezier(…)' }
```

## Two motion vocabularies

|                     | Use for                                              | Durations   | Curves                                   |
| ------------------- | ---------------------------------------------------- | ----------- | ---------------------------------------- |
| `motion.functional` | product UI: feedback, menus, dialogs, tables         | 70–240 ms   | Carbon productive, Material 3 emphasized |
| `motion.expressive` | storytelling: heroes, reveals, scroll scenes, camera | 400–1000 ms | Carbon expressive, editorial, cinematic  |

Rule: the more often a user triggers something, the more functional its motion must be.
Under `prefers-reduced-motion: reduce`, the CSS caps slow/deliberate/cinematic durations at 150 ms.

## Sources

Durations 70/110/150/240/400/700 ms and the productive/expressive curves come from IBM Carbon motion;
emphasized curves from Material 3; the 1000 ms cinematic ceiling from Material 3's extra-long range.
Details and citations: `docs/research/notes-references.md` in the repository. `editorial` and
`cinematic` curves are SNOWBROS originals.

Edit `tokens.json`, then `pnpm build` regenerates `dist/tokens.css` and `src/tokens.ts`.

License: MIT OR Apache-2.0.
