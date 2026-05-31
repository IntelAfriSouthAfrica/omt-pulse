import type { ReactNode } from "react";

/** Lightweight CSS mockups for the landing "See it in action" section — no screenshot assets required. */

function PhoneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="w-full max-w-[280px] rounded-[1.75rem] border-[3px] border-foreground/10 bg-card p-2 shadow-lg shadow-primary/5">
        <div className="overflow-hidden rounded-[1.35rem] border border-border bg-background aspect-[9/16]">
          {children}
        </div>
      </div>
      <figcaption className="text-center text-sm font-medium text-foreground">{label}</figcaption>
    </figure>
  );
}

function LiveMapPreview() {
  return (
    <div className="relative h-full w-full bg-[#e8ecef]">
      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(135deg,#c5d4c9_25%,transparent_25%),linear-gradient(225deg,#c5d4c9_25%,transparent_25%),linear-gradient(45deg,#c5d4c9_25%,transparent_25%),linear-gradient(315deg,#c5d4c9_25%,#e8ecef_25%)] bg-[length:20px_20px]" />
      <div className="absolute left-3 top-3 rounded-md bg-background/95 px-2 py-1 text-[10px] font-semibold text-primary shadow-sm">
        Live Monitor
      </div>
      <div className="absolute left-1/2 top-[38%] h-3 w-3 -translate-x-1/2 rounded-full bg-green-500 ring-4 ring-green-500/30 animate-pulse" />
      <div className="absolute left-[30%] top-[55%] h-2.5 w-2.5 rounded-full bg-primary shadow" />
      <div className="absolute right-[28%] top-[48%] h-2.5 w-2.5 rounded-full bg-amber-500 shadow" />
      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-background/95 p-2 text-[9px] shadow-sm">
        <span className="font-semibold text-green-600">● LIVE</span>
        <span className="text-muted-foreground"> — 2 responders en route</span>
      </div>
    </div>
  );
}

function OccurrenceBookPreview() {
  const rows = [
    { color: "bg-red-500", title: "Panic / SOS", time: "02:14" },
    { color: "bg-amber-500", title: "Perimeter breach", time: "23:41" },
    { color: "bg-primary", title: "Patrol complete", time: "22:05" },
  ];
  return (
    <div className="flex h-full flex-col bg-background p-2">
      <div className="mb-2 text-[10px] font-semibold text-foreground">Occurrence Book</div>
      <div className="flex-1 space-y-1.5">
        {rows.map((r) => (
          <div key={r.title} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${r.color}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[9px] font-medium">{r.title}</div>
              <div className="text-[8px] text-muted-foreground">Gate 3 · Today</div>
            </div>
            <span className="text-[8px] tabular-nums text-muted-foreground">{r.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanicPreview() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-background p-3">
      <div className="mb-4 text-center text-[10px] font-semibold text-foreground">Field responder</div>
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-500/40">
        <span className="text-[11px] font-bold uppercase tracking-wide text-white">SOS</span>
        <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
      </div>
      <p className="mt-4 max-w-[140px] text-center text-[8px] leading-relaxed text-muted-foreground">
        One tap alerts your control room with live GPS
      </p>
      <div className="absolute bottom-3 left-3 right-3 rounded-md bg-green-500/10 px-2 py-1.5 text-center text-[8px] text-green-700 dark:text-green-400">
        Acknowledged · Unit 4 responding
      </div>
    </div>
  );
}

const PREVIEWS = [
  { id: "live-map", label: "Live response map", Preview: LiveMapPreview },
  { id: "occurrence-book", label: "Digital occurrence book", Preview: OccurrenceBookPreview },
  { id: "panic", label: "One-tap panic / SOS", Preview: PanicPreview },
] as const;

export function ProductPreviewsSection() {
  return (
    <section id="product" className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">See it in action</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            From the control room to the patrol officer's pocket — one connected workflow.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
          {PREVIEWS.map(({ id, label, Preview }) => (
            <PhoneFrame key={id} label={label}>
              <Preview />
            </PhoneFrame>
          ))}
        </div>
      </div>
    </section>
  );
}
