# Platform: Jetpack Compose (Android, Compose Multiplatform)

**Detection:** `build.gradle(.kts)` / `libs.versions.toml` with compose dependencies. Never add web libraries.

| SNOWBROS concept         | Compose primitive                                                                 | Docs                                                                             |
| ------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| tween / value            | `animate*AsState`, `Animatable`                                                   | https://developer.android.com/develop/ui/compose/animation/value-based           |
| enter/exit, content swap | `AnimatedVisibility`, `AnimatedContent`, `Crossfade`                              | https://developer.android.com/develop/ui/compose/animation/composables-modifiers |
| shared element           | `SharedTransitionLayout` + `Modifier.sharedElement`                               | https://developer.android.com/develop/ui/compose/animation/shared-elements       |
| timeline / keyframes     | `updateTransition`, `keyframes { }`, `InfiniteTransition`                         | https://developer.android.com/develop/ui/compose/animation/introduction          |
| springs                  | `spring(dampingRatio, stiffness)` — M3 tokens map directly (0.9 / 700 etc.)       |                                                                                  |
| list reorder             | `Modifier.animateItem()` in Lazy lists                                            |                                                                                  |
| scroll progress          | `LazyListState.firstVisibleItemScrollOffset`, `ScrollState.value`, `nestedScroll` |                                                                                  |
| pinned                   | `stickyHeader { }` in `LazyColumn`                                                |                                                                                  |
| reduced motion           | read `Settings.Global.ANIMATOR_DURATION_SCALE` (0 = animations off)               |                                                                                  |
| cleanup                  | composition lifecycle; `LaunchedEffect`/`DisposableEffect`                        |                                                                                  |

(Docs URLs from repository `docs/research/TECHNOLOGY_EVALUATION.md`; not re-fetched there.)

**Material 3 tokens apply natively** — the values in [../motion-system.md](../motion-system.md) come from androidx `MotionTokens.kt`, `StandardMotionTokens.kt`, `ExpressiveMotionTokens.kt`. Use `MaterialTheme.motionScheme` where available instead of hard-coding.

**Unsupported / different:** CSS-like scroll-linked timelines (derive from scroll state in `graphicsLayer { }` lambdas to avoid recomposition per frame — the Compose equivalent of "no setState per frame").
