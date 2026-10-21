# Platform: desktop applications

**Detection:** `electron`, `@tauri-apps/api`/`src-tauri` → web-based shell (`platform: desktop-web`);
SwiftUI/AppKit (macOS), WinUI/WPF (Windows), Qt, GTK → native.

## Web-based shells (Electron, Tauri)

Use the web profiles ([web-vanilla.md](web-vanilla.md), [react-next.md](react-next.md) …) plus:
- Known renderer: Electron ships Chromium (modern CSS/View Transitions available); Tauri uses the OS webview — WebView2 (Chromium) on Windows, WKWebView (Safari) on macOS, WebKitGTK on Linux → test all three; feature-detect.
- Respect OS reduced-motion (the media query works in all three webviews).
- Desktop density: smaller controls (28–32 px), hover states, right-click menus, keyboard shortcuts with platform modifiers (⌘ vs Ctrl), native title bar conventions.
- Window resize is frequent: everything must re-measure cheaply; no animation on resize.
- No marketing-style scroll storytelling inside tools.

## Native desktop

- macOS SwiftUI → [swiftui.md](swiftui.md). AppKit: `NSAnimationContext`, Core Animation.
- Windows WinUI 3: implicit animations via `Composition` APIs, `ConnectedAnimationService` (shared element), `ThemeTransitions`; reduced motion via `UISettings.AnimationsEnabled`.
- Qt/QML: `Behavior`, `NumberAnimation`, `SpringAnimation`, `Transition`.
  Not covered in depth by this skill; translate the contract (trigger, duration class, easing, reduced policy, cleanup) and cite the platform's own docs.
