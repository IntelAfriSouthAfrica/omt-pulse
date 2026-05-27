import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, Clock, AlertCircle, Users, XCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type BillingStatus = {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  breakdown: {
    role: string;
    count: number;
    rate: number;
    subtotal: number;
  }[];
  totalMonthly: number;
};

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  supervisor: "Supervisor",
  reporter: "Reporter",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "numeric", month: "long", year: "numeric"
  });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} remaining`;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} remaining`;
}

function useCountdown(targetDateStr: string | null | undefined) {
  const [msLeft, setMsLeft] = useState(() =>
    targetDateStr ? Math.max(0, new Date(targetDateStr).getTime() - Date.now()) : 0
  );

  useEffect(() => {
    if (!targetDateStr) return;
    const tick = () => setMsLeft(Math.max(0, new Date(targetDateStr).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);

  return msLeft;
}

function StatusBadge({ status, trialEndsAt, periodEnd }: { status: string; trialEndsAt?: string | null; periodEnd?: string | null }) {
  const msLeft = useCountdown(status === "trial" ? trialEndsAt : null);

  if (status === "complimentary") {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-emerald-600 text-white gap-1.5">
          <Gift className="h-3 w-3" /> Complimentary Plan
        </Badge>
        <span className="text-sm text-muted-foreground">Courtesy of IntelAfri — no subscription required</span>
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-600 text-white gap-1.5">
          <CheckCircle2 className="h-3 w-3" /> Active
        </Badge>
        <span className="text-sm text-muted-foreground">Renews {formatDate(periodEnd)}</span>
      </div>
    );
  }
  if (status === "trial") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <Clock className="h-3 w-3" /> Trial
        </Badge>
        <span className="text-sm tabular-nums text-muted-foreground" data-testid="text-trial-countdown">
          {formatCountdown(msLeft)}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="h-3 w-3" /> Expired
      </Badge>
      <span className="text-sm text-muted-foreground">Subscribe to restore access</span>
    </div>
  );
}

export default function BillingPage() {
  const { toast } = useToast();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: billing, isLoading } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/cancel", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setCancelDialogOpen(false);
      toast({ title: "Subscription cancelled", description: "Your subscription has been cancelled. Access will end immediately." });
    },
    onError: (err: any) => {
      setCancelDialogOpen(false);
      toast({ title: "Error", description: err.message || "Failed to cancel subscription", variant: "destructive" });
    },
  });

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/initiate", {});
      return res.json() as Promise<{ payFastUrl: string; fields: Record<string, string> }>;
    },
    onSuccess: (data) => {
      // Build and submit a form to PayFast
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.payFastUrl;
      Object.entries(data.fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to initiate payment", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-billing-title">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your organization's subscription</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : billing ? (
        <>
          {/* Status card */}
          <div className="border rounded-xl p-5 bg-card space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Subscription Status</p>
            <StatusBadge
              status={billing.subscriptionStatus}
              trialEndsAt={billing.trialEndsAt}
              periodEnd={billing.subscriptionCurrentPeriodEnd}
            />
            {billing.subscriptionStatus === "trial" && (
              <p className="text-xs text-muted-foreground pt-1">
                Your trial expires on {formatDate(billing.trialEndsAt)}. Subscribe before then to avoid interruption.
              </p>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="border rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-muted/50 border-b flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Monthly Subscription Breakdown</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">Role</th>
                  <th className="text-right px-5 py-2.5 font-medium">Users</th>
                </tr>
              </thead>
              <tbody>
                {billing.breakdown.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-4 text-center text-muted-foreground">No users in organization</td>
                  </tr>
                ) : (
                  billing.breakdown.map((row) => (
                    <tr key={row.role} className="border-b last:border-0" data-testid={`row-billing-${row.role}`}>
                      <td className="px-5 py-3 capitalize">{ROLE_LABELS[row.role] ?? row.role}</td>
                      <td className="px-5 py-3 text-right">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr className="border-t">
                  <td colSpan={1} className="px-5 py-3 text-sm font-medium text-muted-foreground">Next Payment Date</td>
                  <td className="px-5 py-3 text-right text-sm font-medium" data-testid="text-next-payment-date">
                    {billing.subscriptionStatus === "active" && billing.subscriptionCurrentPeriodEnd
                      ? formatDate(billing.subscriptionCurrentPeriodEnd)
                      : billing.subscriptionStatus === "trial"
                        ? "Upon subscription"
                        : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cancel button — shown below breakdown for all cancellable statuses */}
          {(billing.subscriptionStatus === "active" || billing.subscriptionStatus === "trial" || billing.subscriptionStatus === "complimentary") && (
            <div>
              <Button
                variant="outline"
                className="w-full gap-2 min-h-[44px] [touch-action:manipulation] text-destructive border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                onClick={() => setCancelDialogOpen(true)}
                disabled={cancelMutation.isPending}
                data-testid="button-cancel-subscription"
              >
                <XCircle className="h-4 w-4" />
                Cancel Subscription
              </Button>
            </div>
          )}

          {/* Subscribe — hidden for complimentary plan */}
          {billing.subscriptionStatus !== "complimentary" && (
            <div className="space-y-3">
              <Button
                className="w-full gap-2 min-h-[44px] [touch-action:manipulation]"
                size="lg"
                onClick={() => initiateMutation.mutate()}
                disabled={initiateMutation.isPending}
                data-testid="button-subscribe"
              >
                <CreditCard className="h-4 w-4" />
                {initiateMutation.isPending
                  ? "Redirecting to PayFast..."
                  : billing.subscriptionStatus === "active"
                    ? "Manage / Renew Subscription"
                    : "Subscribe Now — R" + billing.totalMonthly + "/month"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You will be redirected to PayFast's secure payment page. Monthly recurring payments will be charged automatically.
              </p>
            </div>
          )}

          <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your access will end immediately. You will not be charged again. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-[44px] [touch-action:manipulation]" data-testid="button-keep-subscription">Keep Subscription</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px] [touch-action:manipulation]"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  data-testid="button-confirm-cancel"
                >
                  {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <p className="text-muted-foreground">Failed to load billing information.</p>
      )}
    </div>
  );
}
