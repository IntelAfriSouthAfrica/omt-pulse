import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Incident, Category, Location, FormField as OrgFormField } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IncidentDialog } from "@/components/incident-dialog";
import omtLogo from "@/assets/omt-logo-v2.png";
import omtLogoDashboard from "@/assets/omt-logo-dashboard.png";
import { OmtShield } from "@/components/omt-shield";
import { HeartbeatLine } from "@/components/heartbeat-line";
import { PanicBanner, type PanicAlert } from "@/components/panic-banner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  PlusCircle,
  Radio,
  Users,
  FileText,
  ChevronRight,
  Paperclip,
  Mic,
  X,
  Siren,
  MessageSquare,
} from "lucide-react";

type Period = "day" | "week";

type DashboardUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
  incidentCount: number;
  isLive: boolean;
  liveIncidentId: number | null;
  lastSeenAt: string | null;
};

type DashboardData = {
  totalIncidents: number;
  liveCount: number;
  chartData: Array<{ label: string; count: number }>;
  users: DashboardUser[];
};

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    administrator: { label: "Admin", className: "bg-primary/10 text-primary border-primary/20" },
    supervisor: { label: "Supervisor", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    reporter: { label: "Reporter", className: "bg-muted text-muted-foreground border-border" },
  };
  const cfg = map[role] ?? { label: role, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function UserAvatar({ user }: { user: DashboardUser }) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  if (user.avatarUrl) {
    const src = user.avatarUrl.startsWith("data:") ? user.avatarUrl
      : user.avatarUrl.startsWith("http") ? (() => { try { const u = new URL(user.avatarUrl!); return u.pathname + u.search; } catch { return user.avatarUrl!; } })()
      : user.avatarUrl;
    return (
      <img
        src={src}
        alt={initials}
        className="w-9 h-9 rounded-full object-cover shrink-0"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

type DashboardAttachment = { id: number; url: string; filename: string; mimeType: string };

function normaliseDashboardUrl(url: string): string {
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http")) {
    try { const u = new URL(url); return u.pathname + u.search; } catch { return url; }
  }
  return url;
}

function DashboardAttachmentItem({ att }: { att: DashboardAttachment }) {
  const href = normaliseDashboardUrl(att.url);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (att.mimeType.startsWith("audio/")) {
    return (
      <div className="flex flex-col gap-1 p-2 border border-border rounded-md bg-muted/30 min-w-[180px]">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mic className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-[150px]">{att.filename}</span>
        </div>
        <audio controls src={href} className="w-full h-8" />
      </div>
    );
  }
  if (att.mimeType.startsWith("image/")) {
    return (
      <>
        <button
          type="button"
          className="shrink-0 block cursor-zoom-in focus:outline-none"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View ${att.filename}`}
        >
          <img
            src={href}
            alt={att.filename}
            className="h-16 w-16 object-cover rounded border border-border"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </button>
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-0" hideDefaultClose>
            <DialogTitle className="sr-only">{att.filename}</DialogTitle>
            <DialogClose className="absolute right-3 top-3 z-10 rounded-full bg-black/75 hover:bg-black/95 text-white border border-white/30 p-2 transition-colors focus:outline-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <img
              src={href}
              alt={att.filename}
              className="w-full max-h-[85vh] object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
      <Paperclip className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate max-w-[150px]">{att.filename}</span>
    </a>
  );
}

function DashboardIncidentAttachments({ incidentId }: { incidentId: number }) {
  const { data: attachments = [], isLoading } = useQuery<DashboardAttachment[]>({
    queryKey: ["/api/incidents", incidentId, "attachments"],
    queryFn: async () => {
      const res = await fetch(`/api/incidents/${incidentId}/attachments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  if (isLoading) return <p className="text-xs text-muted-foreground">Loading…</p>;
  if (attachments.length === 0) return <p className="text-xs text-muted-foreground italic">No attachments</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map(att => <DashboardAttachmentItem key={att.id} att={att} />)}
    </div>
  );
}

function UserDetailSheet({
  user,
  period,
  open,
  onClose,
}: {
  user: DashboardUser | null;
  period: Period;
  open: boolean;
  onClose: () => void;
}) {
  const [openValue, setOpenValue] = useState<string>("");
  const [openedIds, setOpenedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setOpenValue("");
    setOpenedIds(new Set());
  }, [user?.id]);

  const { data: allIncidents = [] } = useQuery<Incident[]>({ queryKey: ["/api/incidents"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: locations = [] } = useQuery<Location[]>({ queryKey: ["/api/locations"] });
  const { data: formFields = [] } = useQuery<OrgFormField[]>({ queryKey: ["/api/form-fields"] });
  const { data: liveIncidents = [] } = useQuery<Array<{
    id: number;
    userId: string | null;
    categoryId: number | null;
    categoryName: string | null;
    locationId: number | null;
    locationName: string | null;
    destinationName: string | null;
    liveStartedAt: string | null;
    isEscalated?: boolean;
    responders?: Array<{userId: string; firstName: string; lastName: string; joinedAt: string; lastPositionAt: string | null; arrivedAt: string | null}>;
  }>>({ queryKey: ["/api/incidents/live"], refetchInterval: 15000 });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const startStr = period === "day" ? todayStr : (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  })();

  const userIncidents = useMemo(() => {
    if (!user) return [];
    return allIncidents
      .filter(i => i.userId === user.id && i.incidentDate >= startStr && i.incidentDate <= todayStr)
      .sort((a, b) => {
        const da = `${a.incidentDate}T${a.incidentTime}`;
        const db2 = `${b.incidentDate}T${b.incidentTime}`;
        return db2.localeCompare(da);
      });
  }, [user, allIncidents, startStr, todayStr]);

  function handleAccordionChange(value: string) {
    setOpenValue(value);
    if (value) {
      const id = parseInt(value);
      if (!isNaN(id)) setOpenedIds(prev => new Set([...prev, id]));
    }
  }

  const getCat = (id: number | null) => categories.find(c => c.id === id);
  const getLoc = (id: number | null) => locations.find(l => l.id === id);
  const visibleCustomFields = formFields.filter(f => !f.isSystem && f.isVisible);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {user && (
          <>
            <SheetHeader className="px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} />
                <div className="min-w-0">
                  <SheetTitle className="text-base leading-tight">
                    {user.firstName} {user.lastName}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <RoleBadge role={user.role} />
                    {user.isLive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                {user.incidentCount} incident{user.incidentCount !== 1 ? "s" : ""} — {period === "day" ? "today" : "this week"}
              </p>
            </SheetHeader>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {userIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <FileText className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No incidents logged {period === "day" ? "today" : "this week"}</p>
                </div>
              ) : (
                <Accordion
                  type="single"
                  collapsible
                  value={openValue}
                  onValueChange={handleAccordionChange}
                  className="divide-y divide-border"
                >
                  {userIncidents.map(inc => {
                    const cat = getCat(inc.categoryId);
                    const loc = getLoc(inc.locationId);
                    const locationLabel = loc?.name ?? inc.locationName ?? null;
                    const hasBeenOpened = openedIds.has(inc.id);
                    return (
                      <AccordionItem
                        key={inc.id}
                        value={inc.id.toString()}
                        className="border-none"
                        data-testid={`dashboard-user-incident-${inc.id}`}
                      >
                        <AccordionTrigger
                          className="px-4 py-3 hover:bg-muted/40 hover:no-underline data-[state=open]:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start gap-2.5 text-left min-w-0 flex-1 mr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                              style={{ backgroundColor: cat?.color ?? "#6B7280" }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{cat?.name ?? "Uncategorised"}</span>
                                {inc.isLive && (
                                  <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0 leading-tight">LIVE</Badge>
                                )}
                                {inc.severity === "red" && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold px-1.5 py-0 leading-tight" data-testid={`badge-severity-${inc.id}`}>🔴 RED</span>
                                )}
                                {inc.severity === "orange" && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0 leading-tight" data-testid={`badge-severity-${inc.id}`}>🟠 ORG</span>
                                )}
                                {inc.severity === "yellow" && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0 leading-tight" data-testid={`badge-severity-${inc.id}`}>🟡 YLW</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {inc.incidentDate} · {inc.incidentTime}
                                {locationLabel ? ` · ${locationLabel}` : ""}
                              </p>
                              {inc.description && (
                                <p className="text-xs text-foreground/70 mt-0.5 line-clamp-2">{inc.description}</p>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-0">
                          <div className="space-y-3 border-t border-border/50 pt-3">
                            {inc.liveStartedAt && (
                              <div className="flex items-center gap-1.5">
                                {inc.isLive ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" data-testid={`badge-live-incident-${inc.id}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                    Live — Active
                                  </span>
                                ) : (inc as any).panicClosedAt ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" data-testid={`badge-live-incident-${inc.id}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    Panic — Closed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" data-testid={`badge-live-incident-${inc.id}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                                    Live — Ended
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Date</p>
                                <p className="text-sm mt-0.5">{inc.incidentDate}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Time</p>
                                <p className="text-sm mt-0.5">{inc.incidentTime}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Category</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#6B7280" }} />
                                <span className="text-sm">{cat?.name ?? "Uncategorised"}</span>
                              </div>
                              {inc.otherCategoryNote && (
                                <p className="text-xs text-muted-foreground mt-0.5 ml-4">Note: {inc.otherCategoryNote}</p>
                              )}
                            </div>
                            {locationLabel && (() => {
                              const coordUrl = /^-?\d+\.\d+, -?\d+\.\d+$/.test(locationLabel.trim())
                                ? `https://www.google.com/maps?q=${locationLabel.trim()}`
                                : null;
                              return (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Location</p>
                                  {coordUrl ? (
                                    <a href={coordUrl} target="_blank" rel="noopener noreferrer" className="text-sm mt-0.5 text-primary hover:underline flex items-center gap-1" data-testid={`link-location-${inc.id}`}>
                                      {locationLabel} <span className="text-[10px] text-muted-foreground">↗</span>
                                    </a>
                                  ) : (
                                    <p className="text-sm mt-0.5">{locationLabel}</p>
                                  )}
                                </div>
                              );
                            })()}
                            {inc.description && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Description</p>
                                <p className="text-sm mt-0.5 whitespace-pre-wrap">{inc.description}</p>
                              </div>
                            )}
                            {inc.customFields && visibleCustomFields.length > 0 && (
                              visibleCustomFields
                                .filter(f => (inc.customFields as Record<string, unknown>)[f.fieldKey] != null && (inc.customFields as Record<string, unknown>)[f.fieldKey] !== "")
                                .map(f => (
                                  <div key={f.fieldKey}>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</p>
                                    <p className="text-sm mt-0.5">{String((inc.customFields as Record<string, unknown>)[f.fieldKey])}</p>
                                  </div>
                                ))
                            )}
                            {inc.liveStartedAt && (
                              <div className="pt-2 border-t border-border/40">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                  Live Timeline
                                </p>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] text-muted-foreground">Started</span>
                                    <span className="text-xs">{new Date(inc.liveStartedAt).toLocaleString()}</span>
                                  </div>
                                  {inc.responderArrivedAt && (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[10px] text-muted-foreground">Arrived</span>
                                      <span className="text-xs">{new Date(inc.responderArrivedAt).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {inc.responderArrivedAt && (() => {
                                    const mins = (new Date(inc.responderArrivedAt).getTime() - new Date(inc.liveStartedAt).getTime()) / 60000;
                                    const label = mins < 1 ? "< 1 min" : `${Math.round(mins)} min`;
                                    return (
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] text-muted-foreground">Response</span>
                                        <span className="text-xs font-semibold">{label}</span>
                                      </div>
                                    );
                                  })()}
                                  {inc.liveStartLat != null && inc.liveStartLng != null && (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[10px] text-muted-foreground">Origin</span>
                                      <a
                                        href={`https://www.google.com/maps?q=${inc.liveStartLat},${inc.liveStartLng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline"
                                      >
                                        {Number(inc.liveStartLat).toFixed(4)}, {Number(inc.liveStartLng).toFixed(4)} ↗
                                      </a>
                                    </div>
                                  )}
                                  {inc.liveEndedAt && (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[10px] text-muted-foreground">Ended</span>
                                      <span className="text-xs">{new Date(inc.liveEndedAt).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {inc.liveEndedAt && (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[10px] text-muted-foreground">End Type</span>
                                      <span className="text-xs font-medium">
                                        {inc.liveClosedManually ? "Manually closed" : "Converted to incident"}
                                      </span>
                                    </div>
                                  )}
                                  {inc.liveEndedAt && inc.liveConvertLat != null && inc.liveConvertLng != null && (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[10px] text-muted-foreground">Closure Coords</span>
                                      <a
                                        href={`https://www.google.com/maps?q=${inc.liveConvertLat},${inc.liveConvertLng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline"
                                      >
                                        {Number(inc.liveConvertLat).toFixed(4)}, {Number(inc.liveConvertLng).toFixed(4)} ↗
                                      </a>
                                    </div>
                                  )}
                                  {(() => {
                                    const liveData = liveIncidents.find((li: {id: number; responders?: Array<{userId: string; firstName: string; lastName: string; joinedAt: string; lastPositionAt: string | null; arrivedAt: string | null}>}) => li.id === inc.id);
                                    const responders = liveData?.responders ?? [];
                                    if (responders.length === 0) return null;
                                    return (
                                      <div className="flex justify-between items-start">
                                        <span className="text-[10px] text-muted-foreground shrink-0">Joiners</span>
                                        <div className="text-xs text-right space-y-1">
                                          {responders.map((r: {userId: string; firstName: string; lastName: string; joinedAt: string; lastPositionAt: string | null; arrivedAt: string | null}) => (
                                            <div key={r.userId}>
                                              <span className="font-medium">{r.firstName} {r.lastName}</span>
                                              <span className="block text-[10px] text-muted-foreground">
                                                Joined {new Date(r.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                {r.arrivedAt && <> · Arrived {new Date(r.arrivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                                                {r.lastPositionAt && !r.arrivedAt && <> · GPS {new Date(r.lastPositionAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {inc.liveEndedAt && inc.liveStartedAt && (() => {
                                    const totalMin = Math.round((new Date(inc.liveEndedAt).getTime() - new Date(inc.liveStartedAt).getTime()) / 60000);
                                    const arrivedAt = inc.responderArrivedAt ? new Date(inc.responderArrivedAt) : null;
                                    const sceneMin = arrivedAt ? Math.round((new Date(inc.liveEndedAt).getTime() - arrivedAt.getTime()) / 60000) : null;
                                    const fmt = (m: number) => m < 1 ? "< 1 min" : `${m} min`;
                                    return (
                                      <>
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[10px] text-muted-foreground">Total Duration</span>
                                          <span className="text-xs font-semibold">{fmt(totalMin)}</span>
                                        </div>
                                        {sceneMin != null && (
                                          <div className="flex justify-between items-baseline">
                                            <span className="text-[10px] text-muted-foreground">Time on Scene</span>
                                            <span className="text-xs font-semibold">{fmt(sceneMin)}</span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                            <div className="pt-2 border-t border-border/40">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attachments</p>
                              {hasBeenOpened && <DashboardIncidentAttachments incidentId={inc.id} />}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function CommandDashboard() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<Period>("day");
  const [logIncidentOpen, setLogIncidentOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicking, setPanicking] = useState(false);
  const { toast } = useToast();

  const DISMISSED_KEY = "dismissedPanicIds";
  const [dismissedPanicIds, setDismissedPanicIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]")); } catch { return new Set(); }
  });

  function dismissPanic(id: number) {
    setDismissedPanicIds((prev) => {
      const next = new Set([...prev, id]);
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const { data: currentUser } = useQuery<{ id: string; firstName: string; lastName: string; role: string }>({
    queryKey: ["/api/auth/me"],
  });
  const isReporter = currentUser?.role === "reporter";

  const { data: panicAlerts = [] } = useQuery<PanicAlert[]>({
    queryKey: ["/api/panic/recent"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });
  const visiblePanicAlerts = panicAlerts.filter((a) => !dismissedPanicIds.has(a.id));

  type ChatConversation = { recipientId: string | null; recipientFirstName: string | null; recipientLastName: string | null; unreadCount: number };
  const { data: chatConvos = [] } = useQuery<ChatConversation[]>({
    queryKey: ["/api/chat/conversations"],
    refetchInterval: 5000,
  });
  const totalUnread = chatConvos.reduce((sum, c) => sum + c.unreadCount, 0);
  const unreadSenders = chatConvos
    .filter((c) => c.unreadCount > 0)
    .map((c) => c.recipientId === null ? "General" : `${c.recipientFirstName ?? ""} ${c.recipientLastName ?? ""}`.trim())
    .filter(Boolean);

  async function sendPanic() {
    setPanicking(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* GPS unavailable — alert fires anyway */ }
      const res = await apiRequest("POST", "/api/panic", { lat, lng });
      const { sent, found } = await res.json() as { sent: number; found: number };
      setPanicOpen(false);
      if (found === 0) {
        toast({
          title: "🆘 Panic alert stored",
          description: "No team members have push notifications enabled — they will not receive a push alert. Ask your team to enable notifications in the app.",
          variant: "destructive",
        });
      } else if (sent === 0) {
        toast({
          title: "🆘 Panic alert sent",
          description: "Alert dispatched — delivery may be delayed on some devices. In-app alarms are active.",
        });
      } else {
        toast({ title: "🆘 Panic alert sent", description: `Push notification delivered to ${sent} device${sent === 1 ? "" : "s"} in your organisation.` });
      }
    } catch (e: unknown) {
      toast({
        title: "Failed to send panic alert",
        description: e instanceof Error ? e.message : "Please try again or contact someone immediately.",
        variant: "destructive",
      });
    } finally {
      setPanicking(false);
    }
  }

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const { data: liveIncidents = [] } = useQuery<Array<{
    id: number;
    userId: string | null;
    categoryId: number | null;
    categoryName: string | null;
    locationId: number | null;
    locationName: string | null;
    destinationName: string | null;
    liveStartedAt: string | null;
    isEscalated?: boolean;
    responders?: Array<{userId: string; firstName: string; lastName: string; joinedAt: string; lastPositionAt: string | null; arrivedAt: string | null}>;
  }>>({ queryKey: ["/api/incidents/live"], refetchInterval: 15000 });
  const { data: locations = [] } = useQuery<Location[]>({ queryKey: ["/api/locations"] });

  const handleUserClick = (user: DashboardUser) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="p-4 md:p-6 pb-4 space-y-4 max-w-4xl mx-auto w-full">

        {/* Header */}
        <div className="flex flex-col items-center gap-1 pt-2 pb-1">
          <OmtShield className="w-16 h-16" />
          <div className="flex items-center justify-center gap-2">
            <div style={{ transform: "scaleX(-1)" }}>
              <HeartbeatLine className="w-16 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">OMT Pulse</h1>
            <HeartbeatLine className="w-16 h-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            {currentUser?.firstName ? `Welcome, ${currentUser.firstName}.` : "Welcome."}
          </p>
          <div className="flex items-center rounded-lg border border-border overflow-hidden text-sm mt-2">
            <button
              onClick={() => setPeriod("day")}
              className={`px-4 py-1.5 font-medium transition-colors ${period === "day" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              data-testid="toggle-period-day"
            >
              Today
            </button>
            <button
              onClick={() => setPeriod("week")}
              className={`px-4 py-1.5 font-medium transition-colors border-l border-border ${period === "week" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              data-testid="toggle-period-week"
            >
              This Week
            </button>
          </div>
        </div>

        {/* Panic Alert Banner — unified component, dashboard is the primary surface */}
        <PanicBanner
          alerts={panicAlerts}
          currentUserId={currentUser?.id}
          dismissedIds={dismissedPanicIds}
          onDismiss={dismissPanic}
          testIdSuffix="dashboard"
        />

        {/* Unread Messages Banner */}
        {totalUnread > 0 && (
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="w-full text-left rounded-lg border-2 border-primary/60 bg-primary/5 hover:bg-primary/10 transition-colors overflow-hidden shadow"
            data-testid="banner-unread-chat"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="relative shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none" data-testid="badge-unread-chat-count">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
                </p>
                {unreadSenders.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate" data-testid="text-unread-senders">
                    From: {unreadSenders.join(", ")}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            size="lg"
            className={`gap-2 font-semibold ${isReporter ? "h-20 text-base font-bold" : "h-14 text-sm"}`}
            onClick={() => setLogIncidentOpen(true)}
            data-testid="button-report-incident"
          >
            <PlusCircle className={`shrink-0 ${isReporter ? "h-6 w-6" : "h-5 w-5"}`} />
            Report Incident
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={`gap-2 font-semibold bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 ${isReporter ? "h-20 text-base font-bold" : "h-14 text-sm"}`}
            onClick={() => navigate("/live-severity")}
            data-testid="button-start-live-incident"
          >
            <Radio className={`shrink-0 ${isReporter ? "h-6 w-6" : "h-5 w-5"}`} />
            Start Live Incident
          </Button>
        </div>

        {/* Inline SOS button — part of the page, between quick actions and stats */}
        <div className="flex flex-col items-center gap-1.5 py-2">
          <button
            onClick={() => setPanicOpen(true)}
            disabled={panicking}
            data-testid="button-panic"
            className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 shadow-[0_0_0_4px_rgba(220,38,38,0.3)] hover:shadow-[0_0_0_6px_rgba(220,38,38,0.4)] transition-all duration-150 flex items-center justify-center touch-manipulation"
            aria-label="Send panic alert"
          >
            <Siren className="h-9 w-9 text-white" />
          </button>
          <span className="text-[11px] font-bold tracking-widest text-red-600 dark:text-red-400 uppercase select-none">SOS</span>
        </div>
      </div>

      <div className="p-4 md:p-6 pt-1 pb-28 space-y-5 max-w-4xl mx-auto w-full">

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                    {period === "day" ? "Today" : "This Week"}
                  </p>
                  <p className="text-3xl font-bold tabular-nums" data-testid="stat-total-incidents">
                    {data?.totalIncidents ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">incidents</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Currently Live</p>
                  <p
                    className={`text-3xl font-bold tabular-nums ${(data?.liveCount ?? 0) > 0 ? "text-green-600 dark:text-green-400" : ""}`}
                    data-testid="stat-live-count"
                  >
                    {data?.liveCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">active {(data?.liveCount ?? 0) === 1 ? "incident" : "incidents"}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Live Incidents — tap any row to drill into /live-monitor */}
        {liveIncidents.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <CardTitle className="text-sm font-semibold">Active Live Incidents</CardTitle>
                <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wide">
                  Tap to open Live Monitor →
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ul className="divide-y divide-border">
                {liveIncidents.map((inc) => {
                  const creator = data?.users.find((u) => u.id === inc.userId);
                  const creatorName = creator
                    ? `${creator.firstName} ${creator.lastName}`.trim()
                    : "Unknown user";
                  const locText =
                    inc.destinationName ||
                    inc.locationName ||
                    (inc.locationId
                      ? locations.find((l) => l.id === inc.locationId)?.name
                      : null) ||
                    "Unknown location";
                  const startedMs = inc.liveStartedAt ? new Date(inc.liveStartedAt).getTime() : null;
                  const minsAgo = startedMs != null ? Math.max(0, Math.round((Date.now() - startedMs) / 60000)) : null;
                  const responderCount = inc.responders?.length ?? 0;
                  return (
                    <li key={inc.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/live-monitor?incidentId=${inc.id}`)}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                        data-testid={`row-live-incident-${inc.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate" data-testid={`text-live-creator-${inc.id}`}>
                                {creatorName}
                              </span>
                              {inc.categoryName && (
                                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {inc.categoryName}
                                </span>
                              )}
                              {inc.isEscalated && (
                                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25">
                                  ⚠ ESCALATED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{locText}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {minsAgo != null ? `Started ${minsAgo === 0 ? "just now" : `${minsAgo} min ago`}` : "In progress"}
                            </p>
                            {(() => {
                              const responders = inc.responders ?? [];
                              if (responders.length === 0) return null;
                              return (
                                <div className="mt-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                                    Responders ({responders.length})
                                  </p>
                                  <ul className="space-y-0.5">
                                    {responders.map((r) => {
                                      const rName = `${r.firstName} ${r.lastName}`.trim() || "Responder";
                                      const status = r.arrivedAt
                                        ? <span className="text-green-600 dark:text-green-400 font-semibold">✅ Arrived</span>
                                        : r.lastPositionAt
                                        ? <span className="text-blue-600 dark:text-blue-400">📍 En route</span>
                                        : <span className="text-amber-600 dark:text-amber-400">⏳ Joined</span>;
                                      return (
                                        <li key={r.userId} className="flex items-center justify-between gap-2 text-[11px]">
                                          <span className="font-medium truncate">{rName}</span>
                                          {status}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })()}
                          </div>
                          <span className="text-muted-foreground text-lg leading-none">›</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Team Section */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Team</CardTitle>
              {(data?.liveCount ?? 0) > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {data!.liveCount} LIVE
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="px-4 pb-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !data?.users.length ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground px-4">
                <Users className="h-6 w-6 opacity-30" />
                <p className="text-sm">No active team members</p>
              </div>
            ) : (
              <ul className="divide-y divide-border max-h-96 overflow-y-auto">
                {data.users.map(user => {
                  const userPanic = visiblePanicAlerts.find(a => a.userId === user.id) ?? null;
                  return (
                  <li key={user.id}>
                    <button
                      onClick={() => handleUserClick(user)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      data-testid={`row-user-${user.id}`}
                    >
                      <div className="relative shrink-0">
                        <UserAvatar user={user} />
                        {(() => {
                          const isOnline = user.lastSeenAt
                            ? (Date.now() - new Date(user.lastSeenAt).getTime()) < 120000
                            : false;
                          return (
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${isOnline ? "bg-green-500" : "bg-muted-foreground/30"}`}
                              title={isOnline ? "Online now" : "Offline"}
                            />
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {user.firstName} {user.lastName}
                          </span>
                          {user.isLive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                          {userPanic && (
                            userPanic.panicAcknowledgedAt ? (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0"
                                data-testid={`badge-user-panic-acknowledged-${user.id}`}
                              >
                                ✓ Panic Ack
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0 animate-pulse"
                                data-testid={`badge-user-panic-${user.id}`}
                              >
                                🆘 PANIC
                              </span>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RoleBadge role={user.role} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums" data-testid={`count-incidents-${user.id}`}>
                            {user.incidentCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {user.incidentCount === 1 ? "incident" : "incidents"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <IncidentDialog
        open={logIncidentOpen}
        onOpenChange={setLogIncidentOpen}
      />


      {/* Full-screen panic confirmation overlay */}
      {panicOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm px-6" data-testid="overlay-panic-confirm">
          <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
            {/* Pulsing siren icon */}
            <div className="relative flex items-center justify-center">
              <span className="absolute h-28 w-28 rounded-full bg-red-600/20 animate-ping" />
              <span className="absolute h-20 w-20 rounded-full bg-red-600/30" />
              <div className="relative h-24 w-24 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                <Siren className="h-12 w-12 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Send PANIC Alert?</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                This will immediately alert <strong className="text-white">everyone</strong> in your organisation that you need urgent assistance. Your GPS location will be shared.
              </p>
            </div>

            {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
              <div className="w-full flex items-start gap-2 rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-3 text-xs text-amber-300 text-left">
                <Siren className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Push notifications are not enabled — team members may not be alerted instantly.</span>
              </div>
            )}

            <div className="w-full space-y-3 pt-2">
              <button
                onClick={() => { setPanicOpen(false); sendPanic(); }}
                disabled={panicking}
                data-testid="button-confirm-panic-dashboard"
                className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-base tracking-wide shadow-lg transition-all touch-manipulation disabled:opacity-60"
              >
                {panicking ? "Sending alert…" : "CONFIRM — Send Alert"}
              </button>
              <button
                onClick={() => setPanicOpen(false)}
                disabled={panicking}
                className="w-full h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <UserDetailSheet
        user={selectedUser}
        period={period}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
