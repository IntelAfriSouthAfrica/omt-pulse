import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CustomMapPickerProps {
  imageUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  pinX?: number | null;
  pinY?: number | null;
  onPinSelect: (x: number, y: number) => void;
  height?: string;
}

function buildPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
      <ellipse cx="12" cy="30" rx="5" ry="2" fill="rgba(0,0,0,0.25)"/>
      <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 20 8 20s8-14.5 8-20c0-4.42-3.58-8-8-8z" fill="#dc2626"/>
      <circle cx="12" cy="8" r="3.5" fill="white" fill-opacity="0.9"/>
    </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
}

export function CustomMapPicker({
  imageUrl,
  imageWidth,
  imageHeight,
  pinX,
  pinY,
  onPinSelect,
  height = "360px",
}: CustomMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const onPinSelectRef = useRef(onPinSelect);
  const dimensionsRef = useRef({ w: imageWidth || 1000, h: imageHeight || 1000 });

  onPinSelectRef.current = onPinSelect;
  dimensionsRef.current = { w: imageWidth || 1000, h: imageHeight || 1000 };

  const w = imageWidth || 1000;
  const h = imageHeight || 1000;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const bounds: L.LatLngBoundsLiteral = [[0, 0], [h, w]];

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 4,
      zoomSnap: 0.5,
      scrollWheelZoom: true,
      attributionControl: false,
    });

    const overlay = L.imageOverlay(imageUrl, bounds);
    overlay.addTo(map);
    overlayRef.current = overlay;

    map.fitBounds(bounds, { padding: [16, 16] });

    if (pinX != null && pinY != null) {
      const marker = L.marker([pinY, pinX], { icon: buildPinIcon() });
      marker.addTo(map);
      markerRef.current = marker;
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const { w: cw, h: ch } = dimensionsRef.current;
      const clampedX = Math.round(Math.max(0, Math.min(cw, lng)));
      const clampedY = Math.round(Math.max(0, Math.min(ch, lat)));
      if (markerRef.current) {
        markerRef.current.setLatLng([clampedY, clampedX]);
      } else {
        markerRef.current = L.marker([clampedY, clampedX], { icon: buildPinIcon() }).addTo(map);
      }
      onPinSelectRef.current(clampedX, clampedY);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pinX != null && pinY != null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([pinY, pinX]);
      } else {
        markerRef.current = L.marker([pinY, pinX], { icon: buildPinIcon() }).addTo(map);
      }
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [pinX, pinY]);

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        style={{ height, width: "100%" }}
        className="rounded-md border bg-muted/30"
        data-testid="custom-map-picker"
      />
      <p className="text-xs text-muted-foreground">Click anywhere on the map to place the incident pin.</p>
    </div>
  );
}
