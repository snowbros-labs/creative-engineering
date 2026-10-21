# Pattern family: SaaS, dashboards and complex applications

Principle: **task speed first.** Users return daily; novelty wears off; motion is functional only
(50–250 ms, no bounce, never blocks input). Premium here means clarity, density with hierarchy,
keyboard paths and instant feedback — not effects.

## 1. Navigation and information architecture

- Inventory objects and verbs first (e.g. Projects → Deployments → Logs). Navigation mirrors objects; actions live next to the object they affect.
- Shell: sidebar (sections, ≤ 7 top-level items) + top bar (context: workspace switcher, search, account). Linear-style "inverted L" chrome keeps content dominant.
- Breadcrumbs for depth > 2. URLs encode state (filters, tabs, selected item) so views are shareable and back/forward works.
- Mobile: sidebar → drawer or bottom tabs (≤ 5); never hide primary actions behind gestures only.
- Motion: drawer 200–300 ms emphasized decelerate in / accelerate out; active indicator slides between items (FLIP or `view-transition-name`) ≤ 200 ms.

## 2. Dashboard hierarchy

- Top: the 3–5 numbers that answer "is everything OK?" with deltas and time range. Then trends, then detail tables.
- Every metric: label, value, unit, comparison period, freshness ("updated 2 min ago").
- Tabular numerals; right-align numbers; consistent decimals.
- No decorative charts. Empty/zero states explain how to get data.
- Motion: number changes cross-fade or count only when the change is the news (≤ 400 ms); never animate on every poll.

## 3. Tables and dense data

- Sticky header and first column; row height 32–40 px (compact/comfortable toggle).
- Column alignment: text left, numbers right, status as icon + text (never color alone).
- Sorting: `aria-sort` on the header; FLIP rows ≤ 300 ms on client-side sort (skip if > ~150 rows or virtualized).
- Selection: checkbox column, shift-click ranges, bulk action bar appears in place (no layout jump — reserve space or overlay).
- Large data: virtualize (> ~500 rows); server pagination with stable sort; show total count.
- Inline edit: Enter to edit, Escape to cancel, optimistic update + rollback with error toast.

## 4. Filtering, sorting, search

- Filters as removable chips; show result count live (`aria-live="polite"`).
- Debounce search 150–250 ms; show a pending state in the input, not a page spinner.
- Preserve filters in URL; "Clear all" always visible when filters active.

## 5. Forms and validation

- Labels above fields, visible always (no placeholder-as-label). Group with `fieldset/legend`.
- Validate on blur, re-validate on input after first error; submit validates all and focuses the first invalid field.
- Errors: text next to field (`aria-describedby`), icon + color, specific fix ("Use 8+ characters"), never only red border.
- Submit: button shows pending state, stays the same width; disable double-submit; success confirms and says what's next.
- Long forms: sections with progress; autosave drafts with "Saved" status.
- Motion: error message height expands ≤ 150 ms; field shake is optional and must be disabled under reduced motion.

## 6. Dialogs and contextual actions

- Use native `<dialog>` or a headless kit (Radix, React Aria): focus trap, Escape, return focus to trigger, `aria-labelledby`.
- Destructive confirm: name the object ("Delete project 'atlas'?"), type-to-confirm for irreversible bulk actions.
- Popovers/menus 120–200 ms; scale from trigger origin (`transform-origin` from side), opacity + 4–8 px translate.
- Prefer inline undo (toast with Undo, 5–8 s) over confirmation dialogs for reversible actions.

## 7. Command palette

- ⌘K / Ctrl+K; also a visible search button. Fuzzy search over actions + objects + navigation; recent items first.
- `role="combobox"` + `listbox`, arrow keys, Enter, Escape; announce result counts.
- Open in ≤ 150 ms (opacity + 0.98→1 scale); never animate result list re-ordering while typing.

## 8. Onboarding and progressive disclosure

- Empty product → one primary action ("Create your first project") + sample data option.
- Checklists with real completion detection; dismissible; no blocking tours.
- Reveal advanced options behind "Advanced" disclosure, remembered per user.
- Milestones (first deploy, first payment) may use one expressive moment (400–700 ms) — the exception that proves the rule.

## 9. Settings and complex workflows

- Group by object/scope (Account / Workspace / Billing / Integrations); search within settings.
- Explicit save vs autosave — pick one per page and say which. Unsaved-changes guard on navigation.
- Multi-step workflows: stepper with named steps, back without data loss, review step before commit.

## 10. Keyboard and focus

- Every action reachable by keyboard; visible `:focus-visible` ring (≥ 3:1 contrast, 2 px).
- Shortcuts discoverable (tooltip hints, `?` overlay); never override browser/AT shortcuts; single-key shortcuts must be remappable or disableable (WCAG 2.1.4).
- Focus management on route change: move focus to the main heading or `main`.

## 11. Data visualization

- Choose chart by question: trend → line; comparison → bar; part-to-whole (≤ 5 parts) → stacked bar; distribution → histogram; correlation → scatter.
- Direct labels over legends; color for data series only; accessible palette; a table view or summary text alternative.
- Transitions between data states 250–400 ms (bars grow from baseline, lines morph only if point counts match); no entrance animation on every refresh.
- Tooltips via hover _and_ focus; crosshair synced across charts on the same time axis.

## 12. Responsive mobile

- Tables → stacked cards or horizontal scroll with sticky first column (choose by task).
- Touch targets ≥ 44×44 px (Apple HIG) / 48 dp (Material); primary action reachable by thumb.
- Avoid hover-only affordances.

See also [feedback-states.md](feedback-states.md).
