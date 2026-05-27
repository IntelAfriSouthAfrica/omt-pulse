import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, ArrowRight, Check, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MyCommands = {
  commands: Array<{ id: number; name: string; isCentral: boolean }>;
  activeCommandId: number | "all" | null;
  canSeeAll: boolean;
  otherCommands: Array<{ id: number; name: string; isCentral: boolean }>;
  ownedCommands: Array<{ id: number; name: string; isCentral: boolean }>;
};

type Request = {
  id: number;
  granteeCommandId: number;
  granterCommandId: number;
  granteeName: string;
  granterName: string;
  requestedByName: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  createdAt: string;
};

type MeResponse = { isSuperadmin?: boolean };

export default function VisibilityPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: me } = useQuery<MeResponse>({ queryKey: ["/api/auth/me"] });
  const { data: mine } = useQuery<MyCommands>({ queryKey: ["/api/me/commands"] });
  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: ["/api/commands/visibility-requests"],
  });

  const [granteeId, setGranteeId] = useState<string>("");
  const [granterId, setGranterId] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const create = useMutation({
    mutationFn: () => apiRequest("POST", "/api/commands/visibility-requests", {
      granteeCommandId: Number(granteeId),
      granterCommandId: Number(granterId),
      reason: reason.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/commands/visibility-requests"] });
      toast({ title: "Request submitted", description: "A superadmin will review your request." });
      setGranteeId(""); setGranterId(""); setReason("");
    },
    onError: (err: Error) => toast({ title: "Could not submit", description: err.message, variant: "destructive" }),
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "deny" }) =>
      apiRequest("PATCH", `/api/commands/visibility-requests/${id}`, { action }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/commands/visibility-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/commands/visibility-grants"] });
      toast({ title: vars.action === "approve" ? "Request approved" : "Request denied" });
    },
    onError: (err: Error) => toast({ title: "Could not decide", description: err.message, variant: "destructive" }),
  });

  const isSuperadmin = !!me?.isSuperadmin;
  const granteeOptions = mine?.ownedCommands ?? [];
  const granterOptions = mine?.otherCommands ?? [];

  const pending = requests.filter(r => r.status === "pending");
  const history = requests.filter(r => r.status !== "pending");

  return (
    <div className="container max-w-3xl mx-auto p-4 sm:p-6 space-y-6" data-testid="page-visibility">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Eye className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cross-Group Visibility</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Request read access from one of your Groups to another Group's incidents,
            locations, categories and form fields. A superadmin must approve.
          </p>
        </div>
      </div>

      {/* Request form */}
      {granteeOptions.length > 0 && granterOptions.length > 0 && (
        <Card className="p-5 space-y-3" data-testid="card-new-request">
          <h2 className="font-medium">New request</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From (your Group)</label>
              <Select value={granteeId} onValueChange={setGranteeId}>
                <SelectTrigger data-testid="select-grantee"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {granteeOptions.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:flex pb-2 justify-center text-muted-foreground"><ArrowRight className="h-4 w-4" /></div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To (target Group)</label>
              <Select value={granterId} onValueChange={setGranterId}>
                <SelectTrigger data-testid="select-granter"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {granterOptions.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            placeholder="Reason (optional) — give the superadmin context for why you need access."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            data-testid="input-reason"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => create.mutate()}
              disabled={!granteeId || !granterId || create.isPending}
              data-testid="button-submit-request"
            >Submit request</Button>
          </div>
        </Card>
      )}

      {/* Requests list */}
      <Card className="p-5 space-y-3" data-testid="card-requests-list">
        <h2 className="font-medium">{isSuperadmin ? "Pending approvals" : "Your requests"}</h2>
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2" data-testid="text-no-pending">No pending requests.</p>
        ) : (
          pending.map(r => (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-md border bg-card/60" data-testid={`row-pending-${r.id}`}>
              <Clock className="h-4 w-4 mt-1 text-amber-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{r.granteeName}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="secondary">{r.granterName}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Requested by {r.requestedByName} · {new Date(r.createdAt).toLocaleDateString()}
                </div>
                {r.reason && <div className="text-sm mt-1.5 italic">"{r.reason}"</div>}
              </div>
              {isSuperadmin && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => decide.mutate({ id: r.id, action: "approve" })}
                    disabled={decide.isPending}
                    data-testid={`button-approve-${r.id}`}
                  ><Check className="h-3.5 w-3.5 mr-1" />Approve</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide.mutate({ id: r.id, action: "deny" })}
                    disabled={decide.isPending}
                    data-testid={`button-deny-${r.id}`}
                  ><X className="h-3.5 w-3.5 mr-1" />Deny</Button>
                </div>
              )}
            </div>
          ))
        )}

        {history.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">History</h3>
            {history.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm py-1.5" data-testid={`row-history-${r.id}`}>
                <Badge variant={r.status === "approved" ? "default" : "destructive"} className="capitalize">{r.status}</Badge>
                <span className="text-muted-foreground">{r.granteeName} → {r.granterName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
