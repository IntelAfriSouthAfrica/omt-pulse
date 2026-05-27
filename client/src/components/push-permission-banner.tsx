import { useEffect, useState } from "react";
import { BellOff, BatteryWarning, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";

// Tells the user, in plain language, that their phone will NOT alarm for panic
// alerts until they enable notifications + subscribe via /api/push/subscribe.
// Shown on the dashboard so it's the first thing every user sees on login.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const BATTERY_GUIDE_KEY = "omt-battery-guide-seen";
const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

function batteryGuideSeen() {
  try { return localStorage.getItem(BATTERY_GUIDE_KEY) === "1"; } catch { return false; }
}
function markBatteryGuideSeen() {
  try { localStorage.setItem(BATTERY_GUIDE_KEY, "1"); } catch {}
}

function AndroidBatteryGuide({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border-2 border-blue-500/60 bg-blue-500/10 px-4 py-3 text-left"
      data-testid="banner-battery-guide"
    >
      <div className="flex items-start gap-3">
        <BatteryWarning className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              One more step — allow background alerts
            </p>
            <p className="text-xs text-blue-800/90 dark:text-blue-300/90 mt-0.5">
              Android's battery saver can block alerts when your phone is asleep.
              Allow OMT Pulse to run unrestricted so panic alerts always wake your phone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            data-testid="button-battery-guide-expand"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide steps" : "How to fix it"}
          </button>

          {expanded && (
            <div className="text-[11px] leading-relaxed text-blue-900/80 dark:text-blue-200/80 space-y-3 pt-1" data-testid="text-battery-guide-steps">
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Samsung (Galaxy)</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Settings → <strong>Device Care</strong> (or "Battery and device care")</li>
                  <li>Tap <strong>Battery → Background usage limits</strong></li>
                  <li>Under "Never sleeping apps" tap <strong>Add</strong> → select <strong>OMT Pulse</strong></li>
                </ol>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Google Pixel / Stock Android</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Settings → <strong>Apps</strong> → tap <strong>OMT Pulse</strong></li>
                  <li>Tap <strong>Battery</strong> → select <strong>Unrestricted</strong></li>
                </ol>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Xiaomi / Redmi / MIUI</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Settings → <strong>Apps</strong> → tap <strong>OMT Pulse</strong></li>
                  <li>Tap <strong>Battery saver</strong> → select <strong>No restrictions</strong></li>
                </ol>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Huawei / Honor</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Settings → <strong>Battery → App launch</strong></li>
                  <li>Find <strong>OMT Pulse</strong> → switch to <strong>Manual</strong></li>
                  <li>Enable <strong>Auto-launch, Secondary launch, Run in background</strong></li>
                </ol>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">OnePlus / OxygenOS</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Settings → <strong>Battery → Battery Optimization</strong></li>
                  <li>Find <strong>OMT Pulse</strong> → tap <strong>Don't optimize</strong></li>
                </ol>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => { markBatteryGuideSeen(); onDismiss(); }}
            data-testid="button-battery-guide-dismiss"
            className="flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 hover:underline transition-colors"
          >
            <X className="h-3 w-3" />
            I've done this, dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function PushPermissionBanner() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => ("Notification" in window ? Notification.permission : "unsupported")
  );
  const [busy, setBusy] = useState(false);
  const [showBlockedHelp, setShowBlockedHelp] = useState(false);
  const [showBatteryGuide, setShowBatteryGuide] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
    // Re-check when user returns from device settings (e.g. flipped permission
    // in OS settings and tabbed back into OMT).
    const onVisible = () => {
      if (document.visibilityState === "visible" && "Notification" in window) {
        setPermission(Notification.permission);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // Silent self-heal: if permission is already granted, re-post the existing
    // push subscription to the server on every app load. This repairs the case
    // where the server auto-deleted the subscription (410 response from FCM)
    // without the user knowing.
    //
    // If the server replies {wasAlreadyRegistered: false} it means the endpoint
    // was previously 410'd and purged from the DB. In that case we force the
    // browser to unsubscribe the stale endpoint and create a brand-new one so
    // FCM gets a valid token — otherwise every future push to this device
    // would keep 410-ing indefinitely.
    if (
      Notification.permission === "granted" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      (async () => {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (!sub) return;

          const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(sub.toJSON()),
          });

          if (res.ok) {
            const data = await res.json();
            // Endpoint was not in the DB — it was previously 410'd and purged.
            // Force a fresh subscription so the next push reaches this device.
            if (!data.wasAlreadyRegistered) {
              await sub.unsubscribe();
              const vapidRes = await fetch("/api/push/vapid-public-key", { credentials: "include" });
              if (!vapidRes.ok) return;
              const { vapidPublicKey } = await vapidRes.json();
              const freshSub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
              });
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(freshSub.toJSON()),
              });
            }
          }
        } catch { /* silent — never surface errors for background re-registration */ }
      })();
    }

    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (permission === "unsupported") return null;
  // When permission is granted, only stay mounted if we need to show the battery guide
  if (permission === "granted" && !showBatteryGuide) return null;

  async function enable() {
    if (busy) return;
    setBusy(true);
    setShowBlockedHelp(false);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setShowBlockedHelp(true);
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const vapidRes = await fetch("/api/push/vapid-public-key", { credentials: "include" });
      if (!vapidRes.ok) return;
      const { vapidPublicKey } = await vapidRes.json();
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub.toJSON()),
      });
      // On Android, show the battery guide once to ensure alerts work while asleep
      if (isAndroid && !batteryGuideSeen()) {
        setShowBatteryGuide(true);
      }
    } catch { /* ignore — banner stays visible if it failed */ } finally {
      setBusy(false);
    }
  }

  // Battery guide takes over the whole banner slot after permission is granted
  if (showBatteryGuide) {
    return <AndroidBatteryGuide onDismiss={() => setShowBatteryGuide(false)} />;
  }

  const isBlocked = permission === "denied";

  return (
    <div
      className="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 px-4 py-3 text-left"
      data-testid="banner-push-permission"
    >
      <div className="flex items-start gap-3">
        <BellOff className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Your phone won't ring for panic alerts
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
              {isBlocked
                ? "Notifications are blocked for OMT Pulse. Enable them in your browser or device settings, then tap below."
                : "Tap Enable so dispatch and your teammates' panic alerts wake your phone — even when OMT is closed."}
            </p>
          </div>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            data-testid="button-enable-push-banner"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {busy ? "Enabling…" : (isBlocked ? "I've allowed it — re-check" : "Enable notifications")}
          </button>
          {showBlockedHelp && (
            <div className="text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80 space-y-1" data-testid="text-push-blocked-help">
              <p className="font-medium">Blocked. To fix:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><span className="font-medium">Android:</span> long-press the OMT icon → App info → Notifications → turn on. Then re-open OMT and tap above.</li>
                <li><span className="font-medium">iOS:</span> Settings → Notifications → OMT Pulse → Allow Notifications.</li>
                <li><span className="font-medium">Desktop:</span> click the padlock icon next to the URL → Site settings → Notifications → Allow.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
