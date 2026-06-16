import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

type ConnectivityBadgeProps = {
  className?: string;
};

export function ConnectivityBadge({ className }: ConnectivityBadgeProps) {
  const online = useOnlineStatus();

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid={online ? "badge-online" : "badge-offline"}
      title={online ? "Connected — data will sync normally" : "No connection — some actions may be saved locally"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm select-none",
        online
          ? "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400"
          : "border-amber-600/40 bg-amber-500/15 text-amber-800 dark:text-amber-300",
        className,
      )}
    >
      {online ? (
        <Wifi className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <WifiOff className="h-3 w-3 shrink-0" aria-hidden />
      )}
      {online ? "Online" : "Offline"}
    </span>
  );
}
