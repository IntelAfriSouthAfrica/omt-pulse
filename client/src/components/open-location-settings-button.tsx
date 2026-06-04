import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { locationSettingsHint, openLocationSettings } from "@/lib/open-location-settings";

type Props = {
  onAfterOpen?: () => void;
  className?: string;
  testId?: string;
  /** Dark overlays (panic confirm) vs light panels (panicker view). */
  variant?: "dark" | "light";
};

export function OpenLocationSettingsButton({
  onAfterOpen,
  className = "",
  testId = "button-open-location-settings",
  variant = "dark",
}: Props) {
  const { toast } = useToast();

  async function handleClick() {
    const result = await openLocationSettings();
    onAfterOpen?.();
    if (result === "opened") {
      toast({
        title: "Location settings",
        description: "Turn on Location for OMT Pulse, then return to this app.",
      });
      return;
    }
    if (result === "prompted") {
      toast({
        title: "Location",
        description: "If you allowed access, your GPS should work now.",
      });
      return;
    }
    toast({
      title: "Turn on location manually",
      description: locationSettingsHint(),
      variant: "destructive",
    });
  }

  const styles =
    variant === "dark"
      ? "w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
      : "w-full h-11 rounded-lg border border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 dark:text-amber-100 font-semibold text-sm";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={`inline-flex items-center justify-center gap-2 transition-colors touch-manipulation ${styles} ${className}`}
      data-testid={testId}
    >
      <Settings className="h-4 w-4 shrink-0" />
      Open location settings
    </button>
  );
}
