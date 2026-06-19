import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Car, MapPin, Radio, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { TrackerDeviceSummary } from "@/components/operations-dashboard";

type OrgUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type Command = { id: number; name: string; isCentral: boolean };

type PositionRow = {
  id: number;
  latitude: number;
  longitude: number;
  speedKph: number | null;
  heading: number | null;
  ignitionOn: boolean | null;
  mileageKm: number | null;
  gpsValid: boolean;
  recordedAt: string;
};

type HistoryResponse = {
  count: number;
  maxSpeedKph: number | null;
  positions: PositionRow[];
};

function vehicleTitle(d: TrackerDeviceSummary): string {
  const makeModel = [d.vehicleMake, d.vehicleModel].filter(Boolean).join(" ").trim();
  if (makeModel) return makeModel;
  return d.label?.trim() || `Tracker …${d.imei.slice(-4)}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FleetPage() {
  const { toast } = useToast();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const deviceParam = params.get("device");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [historyHours, setHistoryHours] = useState(24);
  const [form, setForm] = useState({
    label: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleRegistration: "",
    assignedUserId: "",
    commandId: "",
    notes: "",
  });

  const { data: devices = [], isLoading } = useQuery<TrackerDeviceSummary[]>({
    queryKey: ["/api/trackers"],
  });

  const { data: users = [] } = useQuery<OrgUser[]>({ queryKey: ["/api/trackers/assignees"] });
  const { data: commands = [] } = useQuery<Command[]>({ queryKey: ["/api/commands"] });

  const selected = devices.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (deviceParam) {
      const id = parseInt(deviceParam, 10);
      if (Number.isFinite(id)) setSelectedId(id);
    } else if (!selectedId && devices[0]) {
      setSelectedId(devices[0].id);
    }
  }, [deviceParam, devices, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setForm({
      label: selected.label ?? "",
      vehicleMake: selected.vehicleMake ?? "",
      vehicleModel: selected.vehicleModel ?? "",
      vehicleRegistration: selected.vehicleRegistration ?? "",
      assignedUserId: selected.assignedUserId ?? "",
      commandId: selected.commandId != null ? String(selected.commandId) : "",
      notes: selected.notes ?? "",
    });
  }, [selected]);

  const { data: history, isLoading: historyLoading } = useQuery<HistoryResponse>({
    queryKey: ["/api/trackers", selectedId, "positions", historyHours],
    enabled: selectedId != null,
    queryFn: async () => {
      const res = await fetch(
        `/api/trackers/${selectedId}/positions?hours=${historyHours}&limit=500`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      await apiRequest("PATCH", `/api/trackers/${selectedId}`, {
        label: form.label || null,
        vehicleMake: form.vehicleMake || null,
        vehicleModel: form.vehicleModel || null,
        vehicleRegistration: form.vehicleRegistration || null,
        assignedUserId: form.assignedUserId || null,
        commandId: form.commandId ? Number(form.commandId) : null,
        notes: form.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trackers"] });
      toast({ title: "Vehicle saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="h-full overflow-y-auto bg-background" data-testid="fleet-page">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Car className="h-7 w-7 text-primary" />
              Fleet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage GPS trackers, vehicle details, and travel history.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Control Room <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 items-start">
          {/* Device list */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tracking units ({devices.length})
              </p>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : devices.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">
                No trackers registered yet. Devices auto-register when they connect.
              </p>
            ) : (
              <ul className="divide-y">
                {devices.map((d) => {
                  const live =
                    d.lastSeenAt &&
                    Date.now() - new Date(d.lastSeenAt).getTime() < 30 * 60 * 1000;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(d.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors",
                          selectedId === d.id && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        )}
                        data-testid={`fleet-list-${d.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{vehicleTitle(d)}</p>
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0",
                              live
                                ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                                : "text-muted-foreground border-border",
                            )}
                          >
                            {live ? "Live" : "Offline"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {d.vehicleRegistration || `IMEI ${d.imei}`}
                          {d.assignedUserName ? ` · ${d.assignedUserName}` : ""}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Detail + history */}
          {!selected ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Select a tracking unit to view details and history.
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{vehicleTitle(selected)}</h2>
                    <p className="text-xs text-muted-foreground font-mono">IMEI {selected.imei}</p>
                  </div>
                  {selected.lastLat != null && selected.lastLng != null && (
                    <a
                      href={`https://www.google.com/maps?q=${selected.lastLat},${selected.lastLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Last position
                    </a>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Speed</p>
                    <p className="font-medium tabular-nums">
                      {selected.lastSpeedKph != null ? `${Math.round(selected.lastSpeedKph)} km/h` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Last seen</p>
                    <p className="font-medium">{formatWhen(selected.lastSeenAt)}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fleet-label">Display name</Label>
                    <Input
                      id="fleet-label"
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="e.g. Patrol vehicle 1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fleet-reg">Registration</Label>
                    <Input
                      id="fleet-reg"
                      value={form.vehicleRegistration}
                      onChange={(e) => setForm((f) => ({ ...f, vehicleRegistration: e.target.value }))}
                      placeholder="Number plate"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fleet-make">Make</Label>
                    <Input
                      id="fleet-make"
                      value={form.vehicleMake}
                      onChange={(e) => setForm((f) => ({ ...f, vehicleMake: e.target.value }))}
                      placeholder="Toyota"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fleet-model">Model</Label>
                    <Input
                      id="fleet-model"
                      value={form.vehicleModel}
                      onChange={(e) => setForm((f) => ({ ...f, vehicleModel: e.target.value }))}
                      placeholder="Hilux"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assigned to</Label>
                    <Select
                      value={form.assignedUserId || "__none__"}
                      onValueChange={(v) => setForm((f) => ({ ...f, assignedUserId: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Group</Label>
                    <Select
                      value={form.commandId || "__none__"}
                      onValueChange={(v) => setForm((f) => ({ ...f, commandId: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No group</SelectItem>
                        {commands.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}{c.isCentral ? " (Central)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fleet-notes">Notes</Label>
                  <Textarea
                    id="fleet-notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save vehicle
                </Button>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Travel history
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[6, 24, 168].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHistoryHours(h)}
                        className={cn(
                          "rounded px-2 py-1 text-[10px] font-semibold uppercase",
                          historyHours === h
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {h === 168 ? "7d" : `${h}h`}
                      </button>
                    ))}
                  </div>
                </div>
                {historyLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-24" />
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground border-b flex gap-4">
                      <span>{history?.count ?? 0} GPS points</span>
                      {history?.maxSpeedKph != null && (
                        <span>Max {Math.round(history.maxSpeedKph)} km/h</span>
                      )}
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {(history?.positions ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground p-6 text-center">No positions in this period.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                            <tr className="text-left text-muted-foreground">
                              <th className="px-3 py-2 font-medium">Time</th>
                              <th className="px-3 py-2 font-medium">Location</th>
                              <th className="px-3 py-2 font-medium">Speed</th>
                              <th className="px-3 py-2 font-medium">ACC</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {history?.positions.map((p) => (
                              <tr key={p.id} className="hover:bg-muted/30">
                                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                                  {formatWhen(p.recordedAt)}
                                </td>
                                <td className="px-3 py-2">
                                  <a
                                    href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline font-mono"
                                  >
                                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                                  </a>
                                </td>
                                <td className="px-3 py-2 tabular-nums">
                                  {p.speedKph != null ? `${Math.round(p.speedKph)}` : "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {p.ignitionOn === true ? "On" : p.ignitionOn === false ? "Off" : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
