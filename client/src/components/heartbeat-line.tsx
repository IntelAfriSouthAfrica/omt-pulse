export function HeartbeatLine({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 24"
      className={`text-primary ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes hb-draw {
          0%   { stroke-dashoffset: 220; opacity: 0; }
          8%   { opacity: 1; }
          55%  { stroke-dashoffset: 0; opacity: 1; }
          75%  { stroke-dashoffset: 0; opacity: 0.25; }
          100% { stroke-dashoffset: 220; opacity: 0; }
        }
      `}</style>
      <polyline
        points="0,12 18,12 24,12 30,3 34,21 38,8 42,12 60,12 66,12 72,3 76,21 80,8 84,12 120,12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="220"
        style={{ animation: "hb-draw 2.4s ease-in-out infinite" }}
      />
    </svg>
  );
}
