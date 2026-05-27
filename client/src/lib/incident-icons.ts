export interface IncidentIcon {
  key: string;
  label: string;
  svg: string;
}

export const INCIDENT_ICONS: IncidentIcon[] = [
  {
    key: "alert",
    label: "Alert",
    svg: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>`,
  },
  {
    key: "firearm",
    label: "Firearm",
    svg: `<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>`,
  },
  {
    key: "military",
    label: "Military",
    svg: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  },
  {
    key: "biohazard",
    label: "Biohazard",
    svg: `<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>`,
  },
  {
    key: "chemical",
    label: "Chemical",
    svg: `<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>`,
  },
  {
    key: "bomb",
    label: "Bomb",
    svg: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  },
  {
    key: "criminal",
    label: "Criminal",
    svg: `<path d="M12 2a8 8 0 0 0-8 8v1a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-1a8 8 0 0 0-8-8z"/><path d="M9 21h6"/><path d="M12 17v4"/><path d="m15 8-3 3-3-3"/>`,
  },
  {
    key: "law",
    label: "Law",
    svg: `<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21H17"/><path d="M12 21V7"/><path d="M3 7h18"/>`,
  },
  {
    key: "fire",
    label: "Fire",
    svg: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
  },
  {
    key: "medical",
    label: "Medical",
    svg: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l1.5-2 2 4.5 2-7 1.5 3.5 1-2H21"/>`,
  },
  {
    key: "vehicle",
    label: "Vehicle",
    svg: `<path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="9" cy="17" r="2"/><circle cx="15" cy="17" r="2"/>`,
  },
  {
    key: "theft",
    label: "Theft",
    svg: `<rect width="11" height="11" x="1" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>`,
  },
  {
    key: "fight",
    label: "Fight",
    svg: `<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/>`,
  },
  {
    key: "vandalism",
    label: "Vandalism",
    svg: `<path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/>`,
  },
  {
    key: "default",
    label: "Pin",
    svg: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  },

  // --- Individuals / Persons ---
  {
    key: "person",
    label: "Person",
    svg: `<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>`,
  },
  {
    key: "crowd",
    label: "Crowd",
    svg: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  },
  {
    key: "child",
    label: "Child",
    svg: `<circle cx="12" cy="7" r="3"/><path d="M12 10v5"/><path d="M9 13h6"/><path d="M9 21v-4"/><path d="M15 21v-4"/>`,
  },
  {
    key: "suspect",
    label: "Suspect",
    svg: `<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="18" cy="5" r="3"/><path d="M18 4v1"/><path d="M18 7.01V7"/>`,
  },
  {
    key: "victim",
    label: "Victim",
    svg: `<circle cx="12" cy="5" r="3"/><path d="M5 22l1.5-7.5L3 12l4-1 5 2 5-2 4 1-3.5 2.5L19 22"/><path d="m9 17 3 2 3-2"/>`,
  },
  {
    key: "witness",
    label: "Witness",
    svg: `<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/><path d="M2 12s3-4 10-4 10 4 10 4-3 4-10 4-10-4-10-4Z" stroke-dasharray="3 2"/>`,
  },

  // --- Crime ---
  {
    key: "knife",
    label: "Knife",
    svg: `<path d="M14.5 2l-8.5 8.5 7.5 7.5 8.5-8.5z"/><path d="M3.5 20.5l3-3"/>`,
  },
  {
    key: "drug",
    label: "Drug",
    svg: `<path d="m18 2 4 4-14 14H4v-4Z"/><path d="m14.5 5.5 4 4"/><circle cx="5.5" cy="18.5" r="2.5"/>`,
  },
  {
    key: "robbery",
    label: "Robbery",
    svg: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>`,
  },
  {
    key: "handcuffs",
    label: "Handcuffs",
    svg: `<circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><path d="M11 12h2"/><path d="M5 12H2"/><path d="M19 12h3"/>`,
  },
  {
    key: "cctv",
    label: "CCTV",
    svg: `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="M13 13h4"/>`,
  },
  {
    key: "burglary",
    label: "Burglary",
    svg: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/><path d="M12 7v2"/><circle cx="12" cy="11" r="1"/>`,
  },
  {
    key: "gang",
    label: "Gang",
    svg: `<circle cx="6" cy="8" r="3"/><circle cx="18" cy="8" r="3"/><circle cx="12" cy="6" r="3"/><path d="M2 21a6 6 0 0 1 12 0"/><path d="M14 21a6 6 0 0 1 10 0"/>`,
  },

  // --- Military ---
  {
    key: "soldier",
    label: "Soldier",
    svg: `<circle cx="12" cy="6" r="3"/><path d="M12 9v5"/><path d="M9 21v-5l3-2 3 2v5"/><path d="M9 10h6"/><path d="M8 4h8"/>`,
  },
  {
    key: "checkpoint",
    label: "Checkpoint",
    svg: `<path d="M3 6h18"/><path d="M3 18h18"/><rect x="9" y="6" width="6" height="12"/><path d="M3 12h6"/><path d="M15 12h6"/>`,
  },
  {
    key: "rifle",
    label: "Rifle",
    svg: `<path d="M4 12h14"/><path d="M18 12l2-2"/><path d="M4 12v2h2v-2"/><path d="M8 10v4"/><path d="M20 10h2"/><path d="M3 14h1"/>`,
  },
  {
    key: "radio",
    label: "Radio",
    svg: `<rect x="5" y="9" width="14" height="12" rx="2"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><circle cx="12" cy="15" r="2"/><path d="M9 3l3 3 3-3"/>`,
  },
  {
    key: "rank",
    label: "Rank",
    svg: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  },

  // --- Transport ---
  {
    key: "car",
    label: "Car",
    svg: `<path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/><path d="M5 9l2-4h10l2 4"/>`,
  },
  {
    key: "truck",
    label: "Truck",
    svg: `<path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="9" cy="17" r="2"/><circle cx="15" cy="17" r="2"/><path d="M14 3v5h5"/>`,
  },
  {
    key: "motorcycle",
    label: "Motorcycle",
    svg: `<circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M6 16h4l2-4h4"/><path d="M12 12l2-4h4l2 4"/><path d="M10 16l2-8"/>`,
  },
  {
    key: "aircraft",
    label: "Aircraft",
    svg: `<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 7.2l-1.9 1.9 7 3.1L7 16H4l-1 1 4 2 2 4 1-1v-3l3.9-3.9 3.1 7 1.9-1.9z"/>`,
  },
  {
    key: "train",
    label: "Train",
    svg: `<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8.5" cy="17" r="1.5"/><circle cx="15.5" cy="17" r="1.5"/><path d="M8 20l-2 2"/><path d="M16 20l2 2"/>`,
  },
  {
    key: "ship",
    label: "Ship",
    svg: `<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 3V7"/>`,
  },
];

export function getIconSvg(key: string | null | undefined): string {
  const found = INCIDENT_ICONS.find((i) => i.key === (key || "alert"));
  return found ? found.svg : INCIDENT_ICONS[0].svg;
}

export function buildMarkerSvgUrl(color: string, iconSvg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="${color}" stroke="white" stroke-width="2"/><svg x="9" y="9" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function buildMarkerHtml(color: string, iconSvg: string): string {
  return `<div style="
    width:36px;height:36px;border-radius:50%;
    background-color:${color};
    border:2px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    ">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${iconSvg}
    </svg>
  </div>`;
}
