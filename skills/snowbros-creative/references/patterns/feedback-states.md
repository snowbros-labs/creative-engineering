# Pattern family: feedback and system states

Every view that loads data has five states: **empty, loading, partial, error, success/ready**. Design
all five before calling a screen done.

| State              | Do                                                                                         | Motion                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Loading < 300 ms   | show nothing new (avoid flash)                                                             | none                                                                      |
| Loading 300 ms–2 s | skeleton matching final layout (no CLS) or inline spinner in the control that triggered it | skeleton shimmer ≤ 1.5 s cycle, `skip` under reduced motion (static tint) |
| Loading > 2 s      | progress with determinate value if known; explain what's happening                         | determinate bar, linear easing                                            |
| Empty (first use)  | explain value + primary action + sample data option                                        | optional illustration; no looping animation                               |
| Empty (no results) | echo the query/filters, offer "Clear filters"                                              | none                                                                      |
| Partial            | show what loaded; mark the failed part with retry                                          | none                                                                      |
| Error              | what happened, why (if known), what to do; keep user input; retry button                   | message expands ≤ 150 ms                                                  |
| Success            | confirm the specific result and the next step                                              | functional: check mark 200–300 ms; milestone: one expressive moment       |

## Feedback timing (NN/g)

- ~100 ms: feels instantaneous — press states, toggles, optimistic UI.
- ~1 s: flow uninterrupted — show pending state on the control.
- ~10 s: attention limit — show progress and allow cancel.

## Optimistic UI

Apply the change immediately, reconcile with the server, roll back with an explanatory toast + Retry
on failure. Never optimistic for payments, destructive or irreversible actions.

## Toasts

- Polite live region (`role="status"`); errors that need action are inline, not toast-only.
- 4–8 s, pause on hover/focus, dismissible, max 3 stacked. Include Undo for reversible actions.
- Enter 200 ms from the edge they live on; exit 150 ms.

## Progress and status

- Determinate when possible; show step names for multi-step jobs; long jobs survive navigation (background + notification).
- Status always icon + text (never color alone). Live status changes announced politely.

## Skeletons

- Same geometry as final content; reserve image aspect ratios; respect dark mode.
- Do not skeleton a whole page for one slow widget; isolate.

## Reduced motion

Spinners may keep rotating (essential, low amplitude) but prefer a static "Loading…" text alongside;
shimmer becomes static; success check appears instantly.
