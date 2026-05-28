---
name: Live-incident diagnostics removal
description: Reminder to strip debug/dead code from live-incident.tsx before final release.
---

**Rule:** Before final polish/release of the live-incident page, remove the following dead/debug code:

1. **Debug overlay** — the `debugVisible` state + `MapDebugOverlay` component + the button that toggles it (the NATIVE·LATEST badge area). This was useful for field-testing renderer state; remove once nav mode is confirmed stable on production APK.

2. **Dead GPS status row** — the old separate GPS status row is currently guarded with `{false && ...}` (the entire `{currentIncident && gpsStatus !== "idle" && ...}` block). Either delete the block or restore it properly — the `{false &&}` guard is dead-code debt.

**Why:** User explicitly noted these should be cleaned up once the page is polished. They were left in during v74/v75 development as diagnostic aids and safety nets.

**How to apply:** When the user says "polish live-incident" or "clean up nav mode" or asks to prep for a production/Play Store release, flag these two items for removal in the same pass.
