# Platform: SwiftUI (iOS, iPadOS, macOS, visionOS)

**Detection:** `Package.swift`, `*.xcodeproj`, `import SwiftUI`. Never add web libraries.

| SNOWBROS concept | SwiftUI primitive                                                                                | Docs                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| tween / timing   | `withAnimation(.easeOut(duration:))`, `.animation(_:value:)`                                     | https://developer.apple.com/documentation/swiftui/withanimation(_:_:)                                           |
| springs          | `.spring(response:dampingFraction:)`, `.snappy`, `.smooth`, `.bouncy`                            |                                                                                                                 |
| multi-step       | `PhaseAnimator`                                                                                  | https://developer.apple.com/documentation/swiftui/phaseanimator                                                 |
| keyframes        | `KeyframeAnimator`                                                                               | https://developer.apple.com/documentation/swiftui/keyframeanimator                                              |
| shared element   | `matchedGeometryEffect(id:in:)`                                                                  | https://developer.apple.com/documentation/swiftui/view/matchedgeometryeffect(id:in:properties:anchor:issource:) |
| scroll progress  | `.scrollTransition { content, phase in … }`, `onScrollGeometryChange` (iOS 18), `GeometryReader` |                                                                                                                 |
| pinned           | `LazyVStack(pinnedViews: [.sectionHeaders])`                                                     |                                                                                                                 |
| reduced motion   | `@Environment(\.accessibilityReduceMotion)`                                                      |                                                                                                                 |
| cleanup          | view lifecycle; cancel `Task`s in `.task` automatically                                          |                                                                                                                 |

(Docs URLs from repository `docs/research/TECHNOLOGY_EVALUATION.md`; not re-fetched there.)

**Mapping springs:** SwiftUI `dampingFraction` ≈ damping ratio ζ (M3 standard 0.9 ≈ `.spring(response: 0.35, dampingFraction: 0.9)` — tune by eye on device).

**HIG rules that apply directly:** brief feedback; avoid motion on frequent interactions; let people cancel motion; never motion as the only signal; visionOS: avoid oscillation ~0.2 Hz.

**Unsupported / different:** scroll-scrubbed timelines (approximate with `scrollTransition` or geometry-driven state; keep it light); 3D → RealityKit/SceneKit, not three.js.
