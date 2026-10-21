# Platform: backend-driven interactive UI

When a backend, database or API determines what the UI shows (dashboards, collaborative apps,
streaming jobs, server-rendered partials), motion must follow **state transitions**, not timers.

## Rules

1. **State is the contract.** Model each entity's states explicitly (`queued → running → succeeded | failed`). Animate transitions between states; never fake progress the backend does not report.
2. **Latency budgets:** respond to the user's action locally within 100 ms (pressed/pending state), even if the server takes seconds.
3. **Optimistic updates** only for reversible, low-risk operations; reconcile and roll back visibly.
4. **Live data (WebSocket/SSE/polling):** batch updates per frame; don't animate every tick; highlight changed values briefly (≤ 1 s background fade) and announce important changes politely (`aria-live`).
5. **Ordering:** apply server events by sequence/version; out-of-order events must not animate backwards.
6. **Partial failure:** isolate widgets; one failed query shows an inline error with retry, not a broken page.
7. **Server-rendered partials (htmx, Turbo, Livewire, Phoenix LiveView):** re-initialize effects on swap events and dispose on removal; use `viewTransition()` around swaps for continuity when supported; ensure server markup is the final visual state.
8. **Real-time collaboration:** presence cursors/avatars are decorative-but-informative: smooth with springs, cap update rate (~20–30 Hz), never block local input.

## Mapping

| UI need                       | Backend signal                                                        |
| ----------------------------- | --------------------------------------------------------------------- |
| determinate progress          | job progress events (percent or step index)                           |
| "updated 2 min ago" freshness | server timestamp, not client clock                                    |
| skeleton vs stale content     | cache status (show stale + refreshing indicator rather than skeleton) |
| conflict UI                   | version/etag mismatch                                                 |

See [../patterns/feedback-states.md](../patterns/feedback-states.md).
