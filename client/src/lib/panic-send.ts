import { apiRequest } from "@/lib/queryClient";
import {
  acquirePanicLocation,
  appendPanicLocationNote,
  hasPanicCoordinates,
  panicLocationWarning,
  type PanicLocationIssue,
  type PanicLocationResult,
} from "@/lib/panic-location";

export type PanicSendOutcome = {
  sent: number;
  found: number;
  loc: PanicLocationResult;
};

export async function postPanicAlert(loc: PanicLocationResult): Promise<PanicSendOutcome> {
  const lat = hasPanicCoordinates(loc) ? loc.lat : undefined;
  const lng = hasPanicCoordinates(loc) ? loc.lng : undefined;
  const res = await apiRequest("POST", "/api/panic", { lat, lng });
  const { sent, found } = (await res.json()) as { sent: number; found: number };
  return { sent, found, loc };
}

export function panicLocationOffTitle(issue?: PanicLocationIssue): string {
  if (issue === "denied") return "Location is turned off";
  return "Location not available";
}

export function panicLocationOffBody(issue?: PanicLocationIssue): string {
  return panicLocationWarning(issue);
}

export function buildPanicSentToast(outcome: PanicSendOutcome): {
  title: string;
  description: string;
  variant?: "destructive";
} {
  const { sent, found, loc } = outcome;
  if (found === 0) {
    return {
      title: "🆘 Panic alert stored",
      description: appendPanicLocationNote(
        "No team members have push notifications enabled.",
        loc,
      ),
      variant: "destructive",
    };
  }
  if (sent === 0) {
    return {
      title: "🆘 Panic alert sent",
      description: appendPanicLocationNote(
        "Alert dispatched — delivery may be delayed on some devices.",
        loc,
      ),
    };
  }
  return {
    title: "🆘 Panic alert sent",
    description: appendPanicLocationNote(
      `Push notification delivered to ${sent} device${sent === 1 ? "" : "s"}.`,
      loc,
    ),
  };
}

/** Probe GPS when opening SOS overlay (warms fix + drives UI warning). */
export async function probePanicLocation(): Promise<PanicLocationResult> {
  return acquirePanicLocation();
}
