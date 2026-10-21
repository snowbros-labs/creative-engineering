# Platform: Flutter

**Detection:** `pubspec.yaml`, `.dart` files. `detect-stack` → `platform: flutter`.
**Never** add `@snowbros/*` or any browser library. Translate the _contract_, not the code.

| SNOWBROS concept      | Flutter primitive                                                                                       | Docs                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| timeline / controller | `AnimationController` (+ `TickerProviderStateMixin`)                                                    | https://api.flutter.dev/flutter/animation/AnimationController-class.html |
| tween + ease          | `Tween` + `CurvedAnimation(curve: Cubic(0.2, 0, 0, 1))`                                                 | https://docs.flutter.dev/ui/animations                                   |
| stagger / segment     | `Interval(start, end, curve: …)` on one controller                                                      | https://docs.flutter.dev/ui/animations                                   |
| implicit transitions  | `AnimatedContainer`, `AnimatedOpacity`, `AnimatedSwitcher`, `TweenAnimationBuilder`                     | https://docs.flutter.dev/ui/animations/implicit-animations               |
| shared element        | `Hero`                                                                                                  | https://docs.flutter.dev/ui/animations/hero-animations                   |
| springs               | `SpringSimulation` / `controller.animateWith(...)`; `SpringDescription(mass, stiffness, damping)`       | https://docs.flutter.dev/ui/animations                                   |
| scroll progress       | `ScrollController` listener or `NotificationListener<ScrollNotification>`; `CustomScrollView` + slivers |                                                                          |
| pinned scene          | `SliverPersistentHeader(pinned: true)` / `SliverAppBar(pinned: true)`                                   |                                                                          |
| reduced motion        | `MediaQuery.of(context).disableAnimations`                                                              |                                                                          |
| cleanup               | `dispose()` the controller in `State.dispose`                                                           |                                                                          |

(Docs URLs cited from repository `docs/research/TECHNOLOGY_EVALUATION.md`; pages were not re-fetched there.)

**Translations**
- Masked line rise → one `AnimationController`, per-line `SlideTransition` inside `ClipRect`, `Interval`-staggered.
- FLIP list → `AnimatedList` / `SliverAnimatedList`.
- Parallax → `Flow` delegate or `Transform.translate` from scroll offset (Flutter cookbook "parallax scrolling").

**Unsupported / different:** CSS sticky (use slivers); view transitions (use `Hero`/page route transitions); split-text accessibility differs — use `Semantics(label: fullText)` + `ExcludeSemantics` on per-line widgets. 3D: no first-party engine; consider `flutter_scene`/`flame` with care, or pre-rendered video.
