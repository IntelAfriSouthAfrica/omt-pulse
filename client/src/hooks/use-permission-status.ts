import { useState, useEffect } from "react";

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface PermissionStatus {
  camera: PermissionState;
  microphone: PermissionState;
  location: PermissionState;
}

const NAMES: Array<{ key: keyof PermissionStatus; name: PermissionName }> = [
  { key: "camera", name: "camera" as PermissionName },
  { key: "microphone", name: "microphone" as PermissionName },
  { key: "location", name: "geolocation" as PermissionName },
];

const isPermissionsSupported =
  typeof window !== "undefined" &&
  window.isSecureContext &&
  !!navigator.permissions;

export function usePermissionStatus(): PermissionStatus {
  const [status, setStatus] = useState<PermissionStatus>({
    camera: "prompt",
    microphone: "prompt",
    location: "prompt",
  });

  useEffect(() => {
    if (!isPermissionsSupported) {
      setStatus({ camera: "unsupported", microphone: "unsupported", location: "unsupported" });
      return;
    }

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    // Holds the resolved PermissionStatus objects so the visibilitychange
    // handler can re-read their .state without re-querying.
    let resolvedResults: Array<{ key: keyof PermissionStatus; permStatus: globalThis.PermissionStatus | null }> = [];

    (async () => {
      const results = await Promise.all(
        NAMES.map(async ({ key, name }) => {
          try {
            const permStatus = await navigator.permissions.query({ name });
            return { key, permStatus };
          } catch {
            return { key, permStatus: null };
          }
        })
      );

      if (cancelled) return;

      resolvedResults = results;

      const initial: PermissionStatus = { camera: "prompt", microphone: "prompt", location: "prompt" };
      for (const { key, permStatus } of results) {
        initial[key] = permStatus ? (permStatus.state as PermissionState) : "unsupported";
      }
      setStatus(initial);

      // Listen for browser-level permission change events (Chrome/Android)
      for (const { key, permStatus } of results) {
        if (!permStatus) continue;
        const handler = () => {
          if (!cancelled) {
            setStatus((prev) => ({ ...prev, [key]: permStatus.state as PermissionState }));
          }
        };
        permStatus.addEventListener("change", handler);
        cleanups.push(() => permStatus.removeEventListener("change", handler));
      }

      // Visibility-change fallback — iOS Safari does NOT fire the `change`
      // event on PermissionStatus objects when the user toggles a permission
      // in Settings and returns to the app. Re-reading .state on every app
      // foreground covers this gap for all platforms.
      const onVisibility = () => {
        if (cancelled || document.visibilityState !== "visible") return;
        const updated: PermissionStatus = { camera: "prompt", microphone: "prompt", location: "prompt" };
        for (const { key, permStatus } of resolvedResults) {
          updated[key] = permStatus ? (permStatus.state as PermissionState) : "unsupported";
        }
        setStatus(updated);
      };
      document.addEventListener("visibilitychange", onVisibility);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return status;
}
