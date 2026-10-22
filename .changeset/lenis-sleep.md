---
"@snowbros/adapters": patch
---

smoothScroll: Lenis runs from the shared ticker only while there is scrolling to do (input wakes it, it
sleeps once `isScrolling` settles), so an idle page schedules no frames; returns `wake()` for
programmatic `scrollTo`.
