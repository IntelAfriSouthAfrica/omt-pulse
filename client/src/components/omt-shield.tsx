interface OmtShieldProps {
  className?: string;
}

export function OmtShield({ className = "w-10 h-10" }: OmtShieldProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="OMT Pulse"
    >
      <defs>
        <linearGradient id="shieldGrad" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#007a47" />
          <stop offset="100%" stopColor="#004d2e" />
        </linearGradient>
      </defs>

      {/* Outer shield — gradient fill, spec stroke #003d24 */}
      <path
        d="M50 3 C50 3 9 14 9 14 L9 55 C9 78 50 97 50 97 C50 97 91 78 91 55 L91 14 Z"
        fill="url(#shieldGrad)"
        stroke="#003d24"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Inner bevel shield — flat #006039, no gradient */}
      <path
        d="M50 9 C50 9 15 19 15 19 L15 57 C15 77 50 92 50 92 C50 92 85 77 85 57 L85 19 Z"
        fill="#006039"
        strokeLinejoin="round"
      />

      {/* Document body — white, rounded rect */}
      <rect x="32" y="26" width="28" height="36" rx="2" fill="white" fillOpacity="0.95" />

      {/* Folded corner — top-right */}
      <polygon points="52,26 60,26 60,34" fill="#004d2e" fillOpacity="0.55" />
      <polyline points="52,26 52,34 60,34" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" fill="none" />

      {/* Text-row lines — white, ~30% opacity as per spec */}
      <rect x="36" y="38" width="16" height="1.5" rx="0.75" fill="white" fillOpacity="0.30" />
      <rect x="36" y="42" width="19" height="1.5" rx="0.75" fill="white" fillOpacity="0.30" />
      <rect x="36" y="46" width="13" height="1.5" rx="0.75" fill="white" fillOpacity="0.30" />

      {/* Bar-chart bars — 5 px wide, heights 8/12/10 per spec */}
      <rect x="35" y="52" width="5" height="8"  rx="0.75" fill="#4ade80" fillOpacity="0.9" />
      <rect x="42" y="48" width="5" height="12" rx="0.75" fill="#4ade80" />
      <rect x="49" y="50" width="5" height="10" rx="0.75" fill="#4ade80" fillOpacity="0.85" />
    </svg>
  );
}
