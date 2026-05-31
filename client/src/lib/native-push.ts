export type NativePushStatus = "unknown" | "needs-enable" | "denied" | "granted" | "error";

async function waitForFcmToken(
  PushNotifications: typeof import("@capacitor/push-notifications").PushNotifications,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("FCM registration timed out"));
    }, 15000);
    let regHandle: { remove: () => void } | null = null;
    let errHandle: { remove: () => void } | null = null;
    const cleanup = () => {
      window.clearTimeout(timeout);
      regHandle?.remove();
      errHandle?.remove();
    };
    void PushNotifications.addListener("registration", (tokenData) => {
      cleanup();
      resolve(tokenData.value);
    }).then((h) => {
      regHandle = h;
    });
    void PushNotifications.addListener("registrationError", () => {
      cleanup();
      reject(new Error("FCM registration failed"));
    }).then((h) => {
      errHandle = h;
    });
    PushNotifications.register().catch((e) => {
      cleanup();
      reject(e);
    });
  });
}

export async function checkNativePushStatus(): Promise<Exclude<NativePushStatus, "unknown">> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.checkPermissions();
  if (perm.receive === "granted") return "granted";
  if (perm.receive === "denied") return "denied";
  return "needs-enable";
}

export async function registerNativePushToken(token: string): Promise<void> {
  const res = await fetch("/api/push/register-fcm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Server rejected FCM token");
}

/** Request permission (if needed), register with FCM, and sync token to the server. */
export async function enableNativePush(): Promise<void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive !== "granted") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") {
    throw new Error("denied");
  }

  const token = await waitForFcmToken(PushNotifications);
  await registerNativePushToken(token);
}
