import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MeResponse = { authed: boolean; requiresTotp: boolean };

export default function ArchonTotpPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading } = useQuery<MeResponse>({
    queryKey: ["/api/archon/me"],
    retry: false,
  });

  useEffect(() => {
    if (isLoading) return;
    if (me?.authed) { navigate("/archon/dashboard"); return; }
    if (!me?.requiresTotp) { navigate("/archon"); return; }
    inputRef.current?.focus();
  }, [me, isLoading]);

  const verifyMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/archon/login/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Invalid code");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/archon/me"] });
      navigate("/archon/dashboard");
    },
    onError: (err: Error) => {
      setError(err.message);
      setCode("");
      inputRef.current?.focus();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setError(null);
    verifyMutation.mutate(trimmed);
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (useBackup) {
      setCode(val.toUpperCase());
    } else {
      const digits = val.replace(/\D/g, "").slice(0, 6);
      setCode(digits);
      // Auto-submit when 6 digits are entered
      if (digits.length === 6 && !verifyMutation.isPending) {
        setError(null);
        verifyMutation.mutate(digits);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-white">
          <div className="rounded-full p-3 border border-primary/30" style={{ background: "rgba(26,107,60,0.15)" }}>
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Two-Factor Auth</h1>
          <p className="text-sm text-white/50 text-center">
            {useBackup
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6 bg-black/40 backdrop-blur-xl border border-primary/20 shadow-2xl shadow-primary/5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-white/80 text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-white/40" />
                {useBackup ? "Backup code" : "Authenticator code"}
              </label>
              {useBackup ? (
                <Input
                  ref={inputRef}
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="XXXXX-XXXXX"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary/50 text-center text-base tracking-widest"
                  autoComplete="one-time-code"
                  disabled={verifyMutation.isPending}
                  data-testid="input-archon-backup-code"
                />
              ) : (
                <Input
                  ref={inputRef}
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary/50 text-center text-2xl tracking-[0.5em] font-mono"
                  autoComplete="one-time-code"
                  disabled={verifyMutation.isPending}
                  data-testid="input-archon-totp-code"
                />
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400" data-testid="text-archon-totp-error">
                {error}
              </p>
            )}

            {(!useBackup || code.trim().length > 0) && (
              <Button
                type="submit"
                className="w-full"
                disabled={verifyMutation.isPending || code.trim().length === 0}
                data-testid="button-archon-totp-submit"
              >
                {verifyMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</>
                ) : (
                  "Verify"
                )}
              </Button>
            )}
          </form>

          {/* Toggle TOTP / Backup */}
          <button
            type="button"
            onClick={() => { setUseBackup((v) => !v); setCode(""); setError(null); }}
            className="w-full text-xs text-white/40 hover:text-white/70 transition-colors text-center"
            data-testid="button-archon-totp-toggle-backup"
          >
            {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
          </button>
        </div>

        {/* Back to login */}
        <button
          type="button"
          onClick={() => navigate("/archon")}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mx-auto"
          data-testid="button-archon-totp-back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </button>
      </div>
    </div>
  );
}
