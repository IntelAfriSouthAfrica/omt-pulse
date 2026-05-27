import { useRef, useCallback, useEffect, useState } from "react";

/**
 * Wraps the Screen Wake Lock API so that a live incident can prevent the
 * device screen from turning off.
 *
 * - acquire() requests a "screen" wake lock. Idempotent — safe to call
 *   multiple times. Returns true if the lock is held after the call,
 *   false if the API is unavailable or permission was denied.
 * - release() drops the lock and marks it as no longer wanted.
 * - The hook re-acquires automatically when the tab becomes visible again
 *   (browsers release the lock whenever the tab is hidden).
 * - Falls back silently if the API is unavailable or permission is denied.
 * - `supported` is true when the Wake Lock API exists in the browser.
 * - `lost` becomes true when the lock is released unexpectedly while the tab
 *   is visible (e.g. battery saver), prompting the UI to show a warning.
 *   It resets to false as soon as a new lock is successfully acquired.
 */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const wantedRef = useRef(false);
  const [lost, setLost] = useState(false);
  const supported = "wakeLock" in navigator;

  const acquire = useCallback(async (): Promise<boolean> => {
    if (!("wakeLock" in navigator)) return false;
    wantedRef.current = true;
    if (sentinelRef.current) return true;
    try {
      const sentinel = await (navigator as unknown as { wakeLock: { request(type: string): Promise<WakeLockSentinel> } }).wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setLost(false);
      sentinel.addEventListener("release", () => {
        sentinelRef.current = null;
        if (wantedRef.current && document.visibilityState === "visible") {
          // Unexpected release while still wanted (e.g. battery saver) — signal UI
          setLost(true);
          void acquire();
        }
      });
      return true;
    } catch {
      // Denied or not supported — degrade silently
      return false;
    }
  }, []);

  const release = useCallback(async () => {
    wantedRef.current = false;
    setLost(false);
    if (sentinelRef.current) {
      await sentinelRef.current.release().catch(() => {});
      sentinelRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && wantedRef.current && !sentinelRef.current) {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [acquire]);

  return { acquire, release, lost, supported };
}
