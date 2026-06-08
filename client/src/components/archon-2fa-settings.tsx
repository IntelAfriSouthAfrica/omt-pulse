import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, ShieldOff, ShieldAlert, Copy, CheckCheck,
  Download, Loader2, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type TwoFaStatus = { enabled: boolean; enabledAt: string | null; backupCodesRemaining: number };

type SetupData = { qrDataUrl: string; secret: string };

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

/** Display a secret in groups of 4 for readability: XXXX XXXX XXXX … */
function formatSecret(s: string) {
  return s.replace(/(.{4})/g, "$1 ").trim();
}

type Props = { open: boolean; onOpenChange: (v: boolean) => void; panelBg?: React.CSSProperties };

export function Archon2FASettings({ open, onOpenChange, panelBg }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wizard state
  const [view, setView] = useState<"menu" | "setup-qr" | "setup-confirm" | "backup-codes" | "disable">("menu");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [disableShowCode, setDisableShowCode] = useState(false);

  const { data: status } = useQuery<TwoFaStatus>({
    queryKey: ["/api/archon/2fa/status"],
    enabled: open,
  });

  function reset() {
    setView("menu");
    setSetupData(null);
    setBackupCodes([]);
    setConfirmCode("");
    setDisableCode("");
    setShowSecret(false);
    setCopiedCodes(false);
    setSavedConfirm(false);
    setDisableShowCode(false);
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/archon/2fa/setup", { method: "POST", credentials: "include" });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? "Setup failed"); }
      return res.json() as Promise<SetupData>;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setView("setup-qr");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const enableMutation = useMutation({
    mutationFn: async ({ code, secret }: { code: string; secret: string }) => {
      const res = await fetch("/api/archon/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, secret }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? "Enable failed"); }
      return res.json() as Promise<{ backupCodes: string[] }>;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setConfirmCode("");
      setView("backup-codes");
      queryClient.invalidateQueries({ queryKey: ["/api/archon/2fa/status"] });
    },
    onError: (e: Error) => toast({ title: "Could not enable 2FA", description: e.message, variant: "destructive" }),
  });

  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/archon/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? "Disable failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archon/2fa/status"] });
      toast({ title: "2FA disabled", description: "Two-factor authentication has been removed from Archon." });
      reset();
    },
    onError: (e: Error) => toast({ title: "Verification failed", description: e.message, variant: "destructive" }),
  });

  // ── Copy / download helpers ────────────────────────────────────────────────

  function handleCopyCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
    });
  }

  function handleDownloadCodes() {
    const content = [
      "OMT Pulse — Archon Backup Codes",
      `Generated: ${new Date().toLocaleString("en-ZA")}`,
      "Keep these codes safe. Each code can only be used once.",
      "",
      ...backupCodes,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "archon-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const inputCls = "bg-white/5 border-white/20 text-white placeholder:text-white/30 h-9 text-sm focus-visible:ring-primary/50";

  function MenuView() {
    const isEnabled = !!status?.enabled;
    return (
      <div className="space-y-5">
        {/* Status card */}
        <div className="rounded-lg border border-white/10 p-4 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className={`rounded-full p-2.5 ${isEnabled ? "bg-green-500/15" : "bg-white/10"}`}>
            {isEnabled
              ? <ShieldCheck className="h-5 w-5 text-green-400" />
              : <ShieldOff className="h-5 w-5 text-white/40" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm">Two-Factor Authentication</p>
              {isEnabled
                ? <Badge className="bg-green-700 text-white text-xs">Enabled</Badge>
                : <Badge variant="secondary" className="text-xs">Disabled</Badge>}
            </div>
            {isEnabled
              ? <p className="text-white/40 text-xs mt-0.5">
                  Enabled {fmtDate(status?.enabledAt)} · {status?.backupCodesRemaining ?? 0} backup {status?.backupCodesRemaining === 1 ? "code" : "codes"} remaining
                </p>
              : <p className="text-white/40 text-xs mt-0.5">
                  Login requires only the Archon password. Enable 2FA for stronger security.
                </p>}
          </div>
        </div>

        {isEnabled ? (
          <Button
            variant="ghost"
            className="w-full border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setView("disable")}
            data-testid="button-archon-2fa-disable-start"
          >
            <ShieldOff className="h-4 w-4 mr-2" />
            Disable 2FA…
          </Button>
        ) : (
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white"
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            data-testid="button-archon-2fa-enable-start"
          >
            {setupMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Setting up…</>
              : <><ShieldCheck className="h-4 w-4 mr-2" /> Enable 2FA</>}
          </Button>
        )}
      </div>
    );
  }

  function QrView() {
    if (!setupData) return null;
    return (
      <div className="space-y-4">
        <p className="text-white/70 text-sm leading-relaxed">
          Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy), then click <strong className="text-white">Next</strong>.
        </p>

        <div className="flex justify-center">
          <div className="rounded-xl p-3 bg-white shadow-md">
            <img src={setupData.qrDataUrl} alt="TOTP QR code" className="w-52 h-52 block" data-testid="img-archon-2fa-qr" />
          </div>
        </div>

        {/* Manual entry key */}
        <div className="space-y-1.5">
          <p className="text-white/50 text-xs">Can't scan? Enter this key manually in your app:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-white/80 bg-white/5 border border-white/10 rounded px-3 py-2 tracking-widest break-all" data-testid="text-archon-2fa-secret">
              {showSecret ? formatSecret(setupData.secret) : "••••• ••••• ••••• •••••"}
            </code>
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="text-white/40 hover:text-white/70 transition-colors p-1 shrink-0"
              title={showSecret ? "Hide key" : "Reveal key"}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={reset} data-testid="button-archon-2fa-cancel">
            Cancel
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => setView("setup-confirm")} data-testid="button-archon-2fa-qr-next">
            Next — Verify code
          </Button>
        </DialogFooter>
      </div>
    );
  }

  function ConfirmView() {
    return (
      <div className="space-y-4">
        <p className="text-white/70 text-sm">
          Enter the 6-digit code currently shown in your authenticator app to confirm 2FA is set up correctly.
        </p>
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Verification code</Label>
          <Input
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            className={`${inputCls} text-center text-xl tracking-[0.4em] font-mono`}
            autoFocus
            data-testid="input-archon-2fa-confirm-code"
          />
        </div>
        <DialogFooter className="gap-2 pt-1">
          <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => setView("setup-qr")}>
            Back
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={confirmCode.length !== 6 || enableMutation.isPending}
            onClick={() => setupData && enableMutation.mutate({ code: confirmCode, secret: setupData.secret })}
            data-testid="button-archon-2fa-enable-confirm"
          >
            {enableMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enabling…</> : "Enable 2FA"}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  function BackupCodesView() {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <p className="text-amber-300 text-xs font-semibold">Save these codes now — they will not be shown again.</p>
          <p className="text-amber-200/70 text-xs mt-0.5">
            Each code is single-use. Store them somewhere safe (password manager, printed copy).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {backupCodes.map((c) => (
            <code key={c} className="text-xs font-mono text-white/80 bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-center tracking-widest" data-testid="text-archon-backup-code">
              {c}
            </code>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10 gap-1.5" onClick={handleCopyCodes} data-testid="button-archon-backup-copy">
            {copiedCodes ? <><CheckCheck className="h-3.5 w-3.5 text-green-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy all</>}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10 gap-1.5" onClick={handleDownloadCodes} data-testid="button-archon-backup-download">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer group" data-testid="label-archon-backup-saved">
          <input
            type="checkbox"
            checked={savedConfirm}
            onChange={(e) => setSavedConfirm(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span className="text-white/60 text-xs group-hover:text-white/80 transition-colors">
            I have saved my backup codes in a secure location
          </span>
        </label>

        <DialogFooter className="pt-1">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white"
            disabled={!savedConfirm}
            onClick={() => handleOpenChange(false)}
            data-testid="button-archon-backup-done"
          >
            Done — 2FA is active
          </Button>
        </DialogFooter>
      </div>
    );
  }

  function DisableView() {
    return (
      <div className="space-y-4">
        <p className="text-white/70 text-sm">
          To disable 2FA, confirm with a valid authenticator code or one of your backup codes.
        </p>
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Verification code</Label>
          <div className="relative">
            <Input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.toUpperCase())}
              placeholder="000000 or XXXXX-XXXXX"
              type={disableShowCode ? "text" : "password"}
              className={`${inputCls} pr-10`}
              autoFocus
              data-testid="input-archon-2fa-disable-code"
            />
            <button
              type="button"
              onClick={() => setDisableShowCode((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              {disableShowCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-1">
          <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={() => setView("menu")}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500 text-white"
            disabled={!disableCode.trim() || disableMutation.isPending}
            onClick={() => disableMutation.mutate(disableCode.trim())}
            data-testid="button-archon-2fa-disable-confirm"
          >
            {disableMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Disabling…</> : "Disable 2FA"}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const titles: Record<typeof view, string> = {
    "menu": "Security — Two-Factor Auth",
    "setup-qr": "Step 1 of 2 — Scan QR Code",
    "setup-confirm": "Step 2 of 2 — Verify Code",
    "backup-codes": "Save Your Backup Codes",
    "disable": "Disable 2FA",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-white/20 sm:max-w-md max-h-[90vh] overflow-y-auto" style={panelBg}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            {titles[view]}
          </DialogTitle>
        </DialogHeader>

        {view === "menu"           && <MenuView />}
        {view === "setup-qr"       && <QrView />}
        {view === "setup-confirm"  && <ConfirmView />}
        {view === "backup-codes"   && <BackupCodesView />}
        {view === "disable"        && <DisableView />}
      </DialogContent>
    </Dialog>
  );
}
