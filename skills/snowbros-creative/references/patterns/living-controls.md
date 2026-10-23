# Living controls — buttons, links, dropdowns and forms with one voice

Built on snowbros.me (2026-10-24). Implementation: `website/src/studio/{buttons,dropdown,brief}.ts`.

## Buttons

- **Fill thaws in from the entry point:** a `clip-path: circle()` whose origin is the pointer's
  entry (`--fx/--fy` set on `pointerenter`) and leaves toward the exit point. 560 ms ease-out.
  Touch: the fill grows from the finger while pressed (380 ms).
- **Letter roll:** each character rises and a duplicate (`::after` with `attr(data-ch)`) follows
  from below, 22 ms stagger. Keep the real label in a visually-hidden span; the roll is
  `aria-hidden`.
- **Press depth:** `scale: 0.97` on the independent `scale` property (it composes with any
  transform another effect writes).
- **The fill colour must contrast with the section.** A signal fill on a signal section
  disappears — override `--fill` per section.
- **No magnetic pull** unless the owner asks for it (rejected on snowbros.me).
- Pressing strikes the signature material near the button, if the site has one.

## Links

Underline as a 1.5 px background that drains to the right on hover and refills from the left
(two-phase), so text links feel related to the buttons without becoming buttons.

## Dropdowns (select-only combobox, WAI-ARIA APG)

- Upgrade every native `<select>`; keep the native one in the DOM as the source of truth
  (forms submit it, scripts read `.value`, no-JS works) and write back with real `input` +
  `change` events. Forward `focus` on the native select to the trigger.
- Keys: Enter/Space/↓/↑ open; ↑↓ Home End move; letters jump (typeahead, 700 ms buffer);
  Enter/Space pick; Esc closes and refocuses; Tab picks and moves on. Options ≥ 44 px tall.
- Motion: grows from the trigger (`transform-origin` at the trigger edge; opens upward when the
  trigger sits low), scale 0.96 → 1 + fade in 180 ms, out in 120 ms. It opens tens of times a
  session: never bounce, never longer.
- Two variants: inline (a blank inside a sentence) and field (a filled control in forms).

## Forms that read as a sentence

- "Hi, I'm [name] from [company]. We need [▾], [▾]. Reach me at [email]. It has to […]" in the
  display face; inputs use `field-sizing: content` with a `size` fallback; blanks are underlines
  that fill on focus.
- One validator shared by client and server; errors name the field, set `aria-invalid`, move
  focus, and clear as soon as the field is edited. Honeypot field off-screen.
- Server (Vercel function, Web `Request`/`Response`): validate again, length limits, honeypot →
  silent success. Confirmation email to the sender is themed but **never echoes their text**
  (only a cleaned first name) — otherwise the form is a spam relay to arbitrary addresses.
- Email HTML: tables, inline styles, web-safe heavy face (Arial Black) for display, the site's
  palette, the signature material pre-rendered as a PNG header (Gmail strips SVG/canvas).
