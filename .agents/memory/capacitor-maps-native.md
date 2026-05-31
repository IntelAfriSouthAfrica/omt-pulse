---
name: Capacitor Google Maps native setup
description: What's required for @capacitor/google-maps to work on Android, and related gotchas fixed in this project.
---

## WebView must be transparent
MainActivity.java must call `this.bridge.getWebView().setBackgroundColor(Color.TRANSPARENT)` in `onCreate`. Without this the native map renders behind the WebView's solid background and is invisible. Requires APK rebuild.

**Why:** @capacitor/google-maps renders a native Android View behind the WebView, relying on the WebView being transparent at the element's position to show through.

**How to apply:** Any time @capacitor/google-maps is added to a Capacitor Android project.

## Google Maps JS API services unavailable on native
`google.maps.places.AutocompleteService`, `google.maps.Geocoder`, and all other JS API SDK objects are undefined on native because the Maps JS script is never loaded. Use REST API equivalents instead:
- Places Autocomplete: `GET /maps/api/place/autocomplete/json?input=...&components=country:za&key=...`
- Geocoding: `GET /maps/api/geocode/json?place_id=...&key=...`
- Directions: `GET /maps/api/directions/json?origin=...&destination=...&mode=driving&key=...`

**Why:** The Maps JS API script tag is only loaded for web (guarded by `!isNative`). The Capacitor WebView's fetch() can call these REST endpoints directly.

## GCP APIs required (beyond Maps JS API)
For full native map functionality, all of these must be enabled in Google Cloud Console:
1. Maps SDK for Android (for native tile rendering)
2. Places API (for autocomplete REST calls)
3. Geocoding API (implicitly included with Maps JS API for web, but separate for REST)
4. Directions API (for route drawing via REST)

## Play Store signing — Android API key restriction
After publishing to Play Store, Google re-signs the app with the **Play App Signing** certificate.
The Maps SDK for Android key must include SHA-1 fingerprints for:
- **App signing key** (Play Console → Setup → App integrity → App signing)
- **Upload/release keystore** (printed in GitHub Actions "Print upload keystore SHA-1" step)
- **Debug keystore** (local dev only)

Package name: `com.intelafri.omtpulse`

The native key is injected at Gradle build. Resolution order:
1. `GOOGLE_MAPS_ANDROID_API_KEY` env / `android/local.properties`
2. Firebase **Android key** from `android/app/google-services.json` (auto)

Do NOT reuse the Firebase **Browser key** (`VITE_GOOGLE_MAPS_API_KEY`) for native maps.
After Play Store migration, add Play App Signing SHA-1 to the **Android key (auto created by Firebase)** in GCP Credentials.

## PermissionDeniedBanner must be hidden on native
`navigator.permissions.query({ name: 'geolocation' })` returns "prompt" indefinitely in Capacitor WebView even after the user grants OS-level permission. Add `if (Capacitor.isNativePlatform()) return null;` at the top of PermissionDeniedBanner to suppress it.

## Live-incident autostart/redirect race condition
When a stale `LIVE_INCIDENT_KEY` exists in localStorage and the user arrives from live-severity (autostart flow), the stale-cleanup effect sets `liveId=null` which triggers the redirect effect before the autostart effect fires. Fix: in the redirect effect, check `localStorage.getItem("omt_live_autostart")` and return early if set.
