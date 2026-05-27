import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Bell, WifiOff, Zap, Share, ArrowDown, AlertTriangle } from "lucide-react";

const DISMISSED_KEY = "pwa-gate-dismissed";

function isGateDismissed() {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

function HeartbeatLine() {
  return (
    <svg
      width="90"
      height="20"
      viewBox="0 0 90 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M 0,10 L 18,10 L 26,3 L 34,17 L 42,3 L 50,10 L 90,10"
        stroke="#006039"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PwaInstallGate({ children }: { children: React.ReactNode }) {
  const { installPrompt, isIos, isInStandaloneMode, triggerInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(isGateDismissed);
  const [installing, setInstalling] = useState(false);
  const [showIosSkipWarning, setShowIosSkipWarning] = useState(false);

  const { data: me } = useQuery<{ firstName?: string }>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 60_000,
  });

  const firstName = me?.firstName ?? null;

  // Already installed as PWA — never show the gate
  if (isInStandaloneMode) return <>{children}</>;
  // User chose "Continue in browser" — let them through for this session
  if (dismissed) return <>{children}</>;
  // No install prompt and not iOS — can't do anything useful (e.g. desktop Chrome
  // that already prompted, or Firefox). Let them through.
  if (!installPrompt && !isIos) return <>{children}</>;

  async function handleInstall() {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
  }

  function handleDismiss() {
    // iOS users need to be warned: without "Add to Home Screen", push notifications
    // won't work at all — alerts won't ring when the phone is asleep.
    if (isIos && !showIosSkipWarning) {
      setShowIosSkipWarning(true);
      return;
    }
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black overflow-y-auto">
      {/* Top fade */}
      <div className="w-full h-24 bg-gradient-to-b from-[#001a0e] to-transparent absolute top-0 left-0 pointer-events-none" />

      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 w-full max-w-md mx-auto gap-8">

        {/* Branded header: heartbeat — shield — heartbeat */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <HeartbeatLine />
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#006039] blur-2xl opacity-40 scale-110" />
              <img
                src="/icon-512.png"
                alt="OMT Pulse"
                className="relative w-20 h-20 rounded-2xl shadow-2xl shadow-[#006039]/40"
              />
            </div>
            {/* Mirror the heartbeat line (flipped) */}
            <svg
              width="90"
              height="20"
              viewBox="0 0 90 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M 90,10 L 72,10 L 64,3 L 56,17 L 48,3 L 40,10 L 0,10"
                stroke="#006039"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Wordmark + greeting */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              OMT Pulse
            </h1>
            {firstName ? (
              <p className="text-[#4ade80] text-sm font-medium">
                Welcome to OMT Pulse, {firstName}.
              </p>
            ) : (
              <p className="text-gray-500 text-sm">
                Your organisation's incident management platform
              </p>
            )}
          </div>
        </div>

        {/* iOS skip warning — replaces the normal CTA area */}
        {showIosSkipWarning ? (
          <div className="w-full space-y-4">
            <div className="bg-red-950/60 border border-red-500/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-red-200 font-semibold text-sm">
                    You won't receive panic alerts
                  </p>
                  <p className="text-red-300/80 text-xs leading-relaxed">
                    On iPhone, push notifications only work when OMT Pulse is added to your Home Screen.
                    If you skip this, your phone will <strong className="text-red-200">not ring</strong> for
                    panic or live incident alerts — even if you've allowed notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Add to Home Screen steps (repeat for convenience) */}
            <div className="w-full bg-[#006039]/20 border border-[#006039]/40 rounded-2xl p-5 space-y-3">
              <p className="text-white font-semibold text-center text-sm">Add to Home Screen now</p>
              <div className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="bg-white/10 rounded-lg p-2"><Share className="w-4 h-4" /></span>
                <span>Tap the <strong className="text-white">Share</strong> button in Safari</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="bg-white/10 rounded-lg p-2"><ArrowDown className="w-4 h-4" /></span>
                <span>Then tap <strong className="text-white">"Add to Home Screen"</strong></span>
              </div>
            </div>

            <button
              onClick={() => setShowIosSkipWarning(false)}
              className="w-full text-gray-500 text-xs hover:text-gray-400 transition-colors underline underline-offset-2"
              data-testid="button-ios-go-back"
            >
              ← Go back
            </button>

            <button
              onClick={() => { localStorage.setItem(DISMISSED_KEY, "1"); setDismissed(true); }}
              className="w-full text-red-700 text-xs hover:text-red-500 transition-colors underline underline-offset-2"
              data-testid="button-ios-skip-anyway"
            >
              I understand — skip anyway (I won't receive alerts)
            </button>
          </div>
        ) : (
          <>
            {/* Install prompt headline */}
            <div className="text-center space-y-1">
              <p className="text-xl font-bold text-white tracking-tight">
                Install the App
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Always one tap away — no browser bar.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-col gap-3 w-full">
              {[
                { icon: Bell,    text: "Instant panic & incident alerts" },
                { icon: WifiOff, text: "Works offline — no signal required" },
                { icon: Zap,     text: "Faster than opening a browser" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-[#006039]/80 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            {isIos ? (
              <div className="w-full bg-[#006039]/20 border border-[#006039]/40 rounded-2xl p-5 space-y-3">
                <p className="text-white font-semibold text-center text-sm">Add to Home Screen</p>
                <div className="flex items-center gap-3 text-gray-300 text-sm">
                  <span className="bg-white/10 rounded-lg p-2"><Share className="w-4 h-4" /></span>
                  <span>Tap the <strong className="text-white">Share</strong> button in Safari</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300 text-sm">
                  <span className="bg-white/10 rounded-lg p-2"><ArrowDown className="w-4 h-4" /></span>
                  <span>Then tap <strong className="text-white">"Add to Home Screen"</strong></span>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleInstall}
                disabled={installing}
                className="w-full h-14 text-lg font-bold bg-[#006039] hover:bg-[#007a48] text-white rounded-2xl shadow-lg shadow-[#006039]/40 transition-all active:scale-95"
                data-testid="button-install-pwa"
              >
                {installing ? "Installing…" : "Install App — It's Free"}
              </Button>
            )}

            {/* Escape hatch */}
            <button
              onClick={handleDismiss}
              className="text-gray-600 text-sm hover:text-gray-400 transition-colors underline underline-offset-2"
              data-testid="button-continue-browser"
            >
              Continue in browser instead
            </button>
          </>
        )}
      </div>

      {/* Bottom fade */}
      <div className="w-full h-16 bg-gradient-to-t from-[#001a0e] to-transparent absolute bottom-0 left-0 pointer-events-none" />
    </div>
  );
}
