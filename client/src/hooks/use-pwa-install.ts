import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

// Capture `beforeinstallprompt` once at module load and share the result
// across all hook instances via a subscriber set.  The browser fires this
// event at most once per page load, so any component that mounts after the
// event would miss it if each call to usePwaInstall registered its own listener.
let _installPrompt: BeforeInstallPromptEvent | null = null;
const _isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const _isInStandaloneMode =
  (navigator as NavigatorWithStandalone).standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

type Listener = () => void;
const _listeners = new Set<Listener>();
function _notify() { _listeners.forEach((fn) => fn()); }

window.addEventListener("beforeinstallprompt", (e: Event) => {
  e.preventDefault();
  _installPrompt = e as BeforeInstallPromptEvent;
  _notify();
});
window.addEventListener("appinstalled", () => {
  _installPrompt = null;
  _notify();
});

export function usePwaInstall() {
  const [, rerender] = useState(0);
  const [showIosHint, setShowIosHint] = useState(() => {
    if (!_isIos || _isInStandaloneMode) return false;
    const dismissed = localStorage.getItem("pwa-install-dismissed") === "1";
    const shown = localStorage.getItem("pwa-ios-hint-shown") === "1";
    return !dismissed && !shown;
  });

  useEffect(() => {
    const listener: Listener = () => rerender((n) => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  async function triggerInstall() {
    if (!_installPrompt) return;
    await _installPrompt.prompt();
    await _installPrompt.userChoice;
    _installPrompt = null;
    _notify();
  }

  function dismissIosHint() {
    setShowIosHint(false);
    localStorage.setItem("pwa-ios-hint-shown", "1");
  }

  return {
    installPrompt: _installPrompt,
    dismissed: localStorage.getItem("pwa-install-dismissed") === "1",
    showIosHint,
    isIos: _isIos,
    isInStandaloneMode: _isInStandaloneMode,
    triggerInstall,
    dismissIosHint,
  };
}
