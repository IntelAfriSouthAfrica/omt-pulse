import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const formTileClass = cn(
  "flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3.5 w-full",
  "hover:border-primary/35 hover:bg-muted/35 active:scale-[0.98] transition-all touch-manipulation",
  "min-h-[4.75rem]",
);

type Props = {
  value: string;
  onChange: (value: string | null) => void;
  error?: string;
};

export function IncidentDescriptionSection({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(() => Boolean(value.trim()));

  useEffect(() => {
    if (value.trim()) setOpen(true);
  }, [value]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!next) onChange(null);
        }}
        className={cn(
          formTileClass,
          open
            ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20 text-primary"
            : "border-border/70 bg-card text-muted-foreground",
        )}
        data-testid="toggle-description"
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            open ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary",
          )}
        >
          <FileText className="h-4 w-4 shrink-0" />
        </span>
        <span className="text-[11px] font-medium leading-tight text-center">
          Description
          <span className="block text-[10px] font-normal text-muted-foreground">optional</span>
        </span>
      </button>

      {open && (
        <div
          className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-2 shadow-sm"
          data-testid="section-description"
        >
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary/70" />
            Incident description
          </Label>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="Describe what happened…"
            className="min-h-[100px] resize-none bg-background border-border/60"
            maxLength={500}
            data-testid="input-description"
          />
          <p className="text-xs text-muted-foreground text-right">{value.length}/500</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
