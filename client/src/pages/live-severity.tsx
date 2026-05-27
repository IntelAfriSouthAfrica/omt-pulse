import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Category } from "@shared/schema";

const LIVE_SEV_KEY = "omt_live_severity_sel";
const LIVE_CAT_KEY = "omt_live_category_sel";

type Severity = "red" | "orange" | "yellow";

const SEVERITY_CONFIG: Record<Severity, { label: string; emoji: string; bgClass: string; borderClass: string; textClass: string; hoverClass: string; tileClass: string; description: string }> = {
  red: {
    label: "Red",
    emoji: "🔴",
    bgClass: "bg-red-600",
    borderClass: "border-red-600",
    textClass: "text-red-600",
    hoverClass: "hover:bg-red-700",
    tileClass: "bg-red-600/10 border-red-500 dark:border-red-500/70",
    description: "Immediate threat — all users notified",
  },
  orange: {
    label: "Orange",
    emoji: "🟠",
    bgClass: "bg-orange-500",
    borderClass: "border-orange-500",
    textClass: "text-orange-500",
    hoverClass: "hover:bg-orange-600",
    tileClass: "bg-orange-500/10 border-orange-400 dark:border-orange-400/70",
    description: "High priority — supervisors & admins notified",
  },
  yellow: {
    label: "Yellow",
    emoji: "🟡",
    bgClass: "bg-yellow-400",
    borderClass: "border-yellow-400",
    textClass: "text-yellow-600 dark:text-yellow-400",
    hoverClass: "hover:bg-yellow-500",
    tileClass: "bg-yellow-400/10 border-yellow-400 dark:border-yellow-400/70",
    description: "Monitoring — silent tracking, no push notification",
  },
};

export default function LiveSeverityPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Severity | null>(null);
  const [notifying, setNotifying] = useState(false);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const severityCategories = (sev: Severity) =>
    categories.filter((c) => c.severity === sev);

  async function handleSelectCategory(sev: Severity, cat: Category) {
    if (notifying) return;
    try {
      setNotifying(true);
      try {
        localStorage.setItem(LIVE_SEV_KEY, sev);
        localStorage.setItem(LIVE_CAT_KEY, String(cat.id));
        localStorage.setItem("omt_live_autostart", "1");
      } catch { /* ignore storage errors */ }

      if (sev !== "yellow") {
        const resp = await apiRequest("POST", "/api/live-incidents/notify-severity", {
          categoryId: cat.id,
          severity: sev,
        });
        await resp.json();
      }

      navigate("/live-incident");
    } catch (e: unknown) {
      toast({
        title: "Notification failed",
        description: e instanceof Error ? e.message : "Could not send alert. Proceeding anyway.",
        variant: "destructive",
      });
      navigate("/live-incident");
    } finally {
      setNotifying(false);
    }
  }

  function toggleExpand(sev: Severity) {
    setExpanded((prev) => (prev === sev ? null : sev));
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3 border-b bg-black text-white shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold">Select Incident Severity</div>
            <div className="text-sm text-white/80">Choose severity before responding</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back-severity">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500" />
          <span className="font-semibold text-lg">Live Incident</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-sm text-muted-foreground text-center mb-5">
          Select the severity level, then tap a category to begin responding.
          A push alert will fire immediately based on your selection.
        </p>

        {(["red", "orange", "yellow"] as Severity[]).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          const cats = severityCategories(sev);
          const isOpen = expanded === sev;

          return (
            <div
              key={sev}
              className={`rounded-xl border-2 overflow-hidden transition-all ${cfg.tileClass}`}
              data-testid={`severity-tile-${sev}`}
            >
              <button
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                  isOpen ? "bg-black/5 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                onClick={() => toggleExpand(sev)}
                data-testid={`button-expand-severity-${sev}`}
              >
                <span className="text-3xl shrink-0">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-lg font-bold ${cfg.textClass}`}>{cfg.label} Alert</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{cfg.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {isLoading ? "Loading categories…" : cats.length === 0 ? "No categories assigned" : `${cats.length} categor${cats.length === 1 ? "y" : "ies"}`}
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className={`h-5 w-5 shrink-0 ${cfg.textClass}`} />
                ) : (
                  <ChevronRight className={`h-5 w-5 shrink-0 ${cfg.textClass}`} />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-current/10 divide-y divide-border/50">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  ) : cats.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No categories have been assigned to this severity level.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ask your administrator to assign categories in Field Admin.
                      </p>
                    </div>
                  ) : (
                    cats.map((cat) => (
                      <button
                        key={cat.id}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                        onClick={() => handleSelectCategory(sev, cat)}
                        disabled={notifying}
                        data-testid={`button-select-category-${cat.id}`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30 shadow-sm"
                          style={{ backgroundColor: cat.color ?? "#6B7280" }}
                        />
                        <span className="font-medium text-sm flex-1">{cat.name}</span>
                        {notifying ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/live-incident")}
            data-testid="button-skip-severity"
          >
            Skip — proceed without severity
          </Button>
        </div>
      </div>
    </div>
  );
}
