import { Capacitor } from "@capacitor/core";

export type OpenLocationSettingsResult = "opened" | "prompted" | "unavailable";

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Short hint when we cannot open system settings programmatically. */
export function locationSettingsHint(): string {
  const platform = detectPlatform();
  if (platform === "android") {
    return "Settings → Apps → OMT Pulse → Permissions → Location → Allow.";
  }
  if (platform === "ios") {
    return "Settings → OMT Pulse → Location → While Using the App.";
  }
  return "Allow location in your browser site settings for omtpulse.com.";
}

/**
 * Open app/location settings on native, or re-request browser geolocation permission.
 * On Android APK, requires a build that includes capacitor-native-settings (cap sync).
 */
export async function openLocationSettings(): Promise<OpenLocationSettingsResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { NativeSettings, AndroidSettings, IOSSettings } = await import(
        "capacitor-native-settings"
      );
      await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.App,
      });
      return "opened";
    } catch {
      /* Plugin missing on old APK or OS blocked — fall through */
    }
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    const prompted = await new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (err) => resolve(err.code !== 1),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      );
    });
    if (prompted) return "prompted";
  }

  return "unavailable";
}
