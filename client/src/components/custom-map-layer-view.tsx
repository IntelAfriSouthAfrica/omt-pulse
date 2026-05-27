import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Incident, Category, CustomMap } from "@shared/schema";
import { getIconSvg, buildMarkerHtml } from "@/lib/incident-icons";

interface CustomMapLayerViewProps {
  customMap: CustomMap;
  incidents: Incident[];
  categories: Category[];
  height?: string;
}

export function CustomMapLayerView({ customMap, incidents, categories, height = "500px" }: CustomMapLayerViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const imageW = customMap.imageWidth || 1000;
  const imageH = customMap.imageHeight || 1000;

  const getCategoryName = (id: number | null) =>
    categories.find((c) => c.id === id)?.name || "Unknown";
  const getCategoryColor = (id: number | null) =>
    categories.find((c) => c.id === id)?.color || "#3B82F6";
  const getCategoryIcon = (id: number | null) =>
    categories.find((c) => c.id === id)?.icon || "alert";

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const bounds: L.LatLngBoundsLiteral = [[0, 0], [imageH, imageW]];
    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 4,
      zoomSnap: 0.5,
      attributionControl: false,
    });
    L.imageOverlay(customMap.imageUrl, bounds).addTo(map);
    map.fitBounds(bounds, { padding: [20, 20] });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    incidents.forEach((incident) => {
      if (incident.customMapX == null || incident.customMapY == null) return;
      const catColor = getCategoryColor(incident.categoryId);
      const catName = getCategoryName(incident.categoryId);
      const catIconKey = getCategoryIcon(incident.categoryId);
      const icon = L.divIcon({
        className: "custom-marker",
        html: buildMarkerHtml(catColor, getIconSvg(catIconKey)),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });
      const marker = L.marker([incident.customMapY, incident.customMapX], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:200px;font-family:system-ui,sans-serif;">
          <div style="font-weight:600;margin-bottom:6px;font-size:14px;">${catName}</div>
          <div style="font-size:12px;color:#666;margin-bottom:4px;">
            <strong>Date:</strong> ${incident.incidentDate} ${incident.incidentTime}
          </div>
          ${incident.description ? `<div style="font-size:12px;color:#666;margin-top:6px;border-top:1px solid #eee;padding-top:6px;">${incident.description.substring(0, 100)}${incident.description.length > 100 ? "..." : ""}</div>` : ""}
        </div>
      `);
    });
  }, [incidents, categories]);

  const hasIncidents = incidents.some((i) => i.customMapX != null && i.customMapY != null);

  return (
    <div className="relative w-full" style={{ height }}>
      <div
        ref={containerRef}
        className="w-full h-full rounded-md"
        data-testid="custom-map-layer-view"
      />
      {!hasIncidents && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400]">
          <div className="bg-background/85 backdrop-blur-sm rounded-md px-5 py-3 text-sm text-muted-foreground shadow">
            No incidents recorded on this map yet
          </div>
        </div>
      )}
    </div>
  );
}
