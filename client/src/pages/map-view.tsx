import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Incident, Category, Location, CustomMap } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertTriangle, Globe, Layers, Radio } from "lucide-react";
import { getIconSvg, buildMarkerSvgUrl } from "@/lib/incident-icons";
import { CustomMapLayerView } from "@/components/custom-map-layer-view";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

function GeographicMap({ incidents, categories, locations, liveIncidents }: {
  incidents: Incident[];
  categories: Category[];
  locations: Location[];
  liveIncidents: Incident[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const liveMarkersRef = useRef<google.maps.Marker[]>([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const [mapsErrorMsg, setMapsErrorMsg] = useState<string | null>(null);

  const getCategoryColor = (id: number | null) => categories.find((c) => c.id === id)?.color ?? "#3B82F6";
  const getCategoryIcon = (id: number | null) => categories.find((c) => c.id === id)?.icon ?? "alert";
  const getCategoryName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "Unknown";

  function resolveLatLng(inc: Incident): { lat: number; lng: number } | null {
    if (inc.latitude != null && inc.longitude != null) {
      return { lat: inc.latitude, lng: inc.longitude };
    }
    if (inc.locationId != null) {
      const loc = locations.find((l) => l.id === inc.locationId);
      if (loc?.latitude != null && loc?.longitude != null) {
        return { lat: loc.latitude, lng: loc.longitude };
      }
    }
    if (inc.liveStartLat != null && inc.liveStartLng != null) {
      return { lat: inc.liveStartLat, lng: inc.liveStartLng };
    }
    return null;
  }

  const geoIncidents = incidents.filter((i) => resolveLatLng(i) !== null);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[MapView] loadGoogleMaps failed:", msg);
        setMapsErrorMsg(msg);
        setMapsError(true);
      });
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: -26.2041, lng: 28.0473 },
      zoom: 6,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.TOP_RIGHT,
        mapTypeIds: ["roadmap", "satellite", "terrain"],
      },
      streetViewControl: false,
      fullscreenControl: true,
    });
  }, [mapsReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapsReady) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const incidentCoordKeys = new Set(
      geoIncidents.map((i) => { const c = resolveLatLng(i); return c ? `${c.lat},${c.lng}` : null; }).filter(Boolean) as string[]
    );
    const geoLocations = locations.filter(
      (loc) => loc.latitude != null && loc.longitude != null && !incidentCoordKeys.has(`${loc.latitude},${loc.longitude}`)
    );

    geoLocations.forEach((loc) => {
      const marker = new google.maps.Marker({
        position: { lat: loc.latitude!, lng: loc.longitude! },
        map,
        icon: {
          url: buildMarkerSvgUrl(loc.color ?? "#6B7280", getIconSvg(loc.icon ?? "map-pin")),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
        zIndex: 1,
        title: loc.name,
      });
      const info = new google.maps.InfoWindow({
        content: `<div style="min-width:160px;font-family:system-ui,sans-serif;"><div style="font-weight:600;margin-bottom:4px;font-size:14px;">${loc.name}</div>${loc.address ? `<div style="font-size:12px;color:#666;">${loc.address}</div>` : ""}</div>`,
      });
      marker.addListener("click", () => info.open(map, marker));
      markersRef.current.push(marker);
    });

    geoIncidents.forEach((incident) => {
      const coords = resolveLatLng(incident);
      if (!coords) return;
      const marker = new google.maps.Marker({
        position: { lat: coords.lat, lng: coords.lng },
        map,
        icon: {
          url: buildMarkerSvgUrl(getCategoryColor(incident.categoryId), getIconSvg(getCategoryIcon(incident.categoryId))),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
        zIndex: 2,
      });
      const info = new google.maps.InfoWindow({
        content: `<div style="min-width:200px;font-family:system-ui,sans-serif;"><div style="font-weight:600;margin-bottom:6px;font-size:14px;">${getCategoryName(incident.categoryId)}</div><div style="font-size:12px;color:#666;margin-bottom:4px;"><strong>Date:</strong> ${incident.incidentDate} ${incident.incidentTime}</div><div style="font-size:12px;color:#666;margin-bottom:4px;"><strong>Location:</strong> ${incident.locationName || "N/A"}</div>${incident.description ? `<div style="font-size:12px;color:#666;margin-top:6px;border-top:1px solid #eee;padding-top:6px;">${incident.description.substring(0, 100)}${incident.description.length > 100 ? "…" : ""}</div>` : ""}</div>`,
      });
      marker.addListener("click", () => info.open(map, marker));
      markersRef.current.push(marker);
    });

    const incidentCoords = geoIncidents
      .map((i) => resolveLatLng(i))
      .filter((c): c is { lat: number; lng: number } => c !== null);
    const allCoords = [
      ...geoLocations.map((l) => ({ lat: l.latitude!, lng: l.longitude! })),
      ...incidentCoords,
    ];
    if (allCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allCoords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, 50);
    }
  }, [incidents, categories, locations, mapsReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapsReady) return;

    liveMarkersRef.current.forEach((m) => m.setMap(null));
    liveMarkersRef.current = [];

    liveIncidents.forEach((incident) => {
      // Only render a separate live marker when we have a real-time responder position.
      // If no responder coords yet, the existing category-colored incident pin (rendered
      // by the incidents effect above) already marks the destination — no duplicate needed.
      if (incident.responderLat == null || incident.responderLng == null) return;

      const respSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" fill="#22c55e" fill-opacity="0.2"><animate attributeName="r" values="11;19;11" dur="2s" repeatCount="indefinite"/><animate attributeName="fill-opacity" values="0.35;0.07;0.35" dur="2s" repeatCount="indefinite"/></circle><circle cx="22" cy="22" r="11" fill="#22c55e" stroke="white" stroke-width="2.5"/><circle cx="22" cy="22" r="4" fill="white" fill-opacity="0.9"/></svg>`;
      const respMarker = new google.maps.Marker({
        position: { lat: incident.responderLat, lng: incident.responderLng },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(respSvg)}`,
          scaledSize: new google.maps.Size(44, 44),
          anchor: new google.maps.Point(22, 22),
        },
        zIndex: 9999,
        title: "Responder (live)",
      });
      const liveInfo = new google.maps.InfoWindow({
        content: `<div style="min-width:200px;font-family:system-ui,sans-serif;"><div style="font-weight:700;margin-bottom:6px;font-size:14px;color:#16a34a;">&#9679; LIVE — Responder Active</div><div style="font-size:12px;color:#666;margin-bottom:4px;"><strong>Started:</strong> ${incident.incidentTime}</div><div style="font-size:12px;color:#666;"><strong>Destination:</strong> ${incident.locationName || "N/A"}</div></div>`,
      });
      respMarker.addListener("click", () => liveInfo.open(map, respMarker));
      liveMarkersRef.current.push(respMarker);
    });
  }, [liveIncidents, mapsReady]);

  if (mapsError) {
    const keyConfigured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
    return (
      <div
        style={{ height: "500px" }}
        className="rounded-md flex items-center justify-center bg-destructive/5 border border-destructive/20"
        data-testid="map-error"
      >
        <div className="text-center px-6 py-8 space-y-2 max-w-md">
          <MapPin className="h-8 w-8 mx-auto text-destructive/60" />
          <p className="text-sm font-medium">Failed to load Google Maps</p>
          <p className="text-xs text-muted-foreground break-words">
            {mapsErrorMsg ?? "Unknown error — check your API key and network connection."}
          </p>
          <p className="text-xs text-muted-foreground">
            API key in build: {keyConfigured ? "configured" : "missing (VITE_GOOGLE_MAPS_API_KEY)"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ height: "500px" }}
      className="rounded-md"
      data-testid="map-incidents"
    />
  );
}

export default function MapViewPage() {
  const [selectedLayer, setSelectedLayer] = useState<"geographic" | number>("geographic");

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: liveIncidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents/live"],
    refetchInterval: 10000,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: customMaps = [] } = useQuery<CustomMap[]>({
    queryKey: ["/api/custom-maps"],
  });

  function resolveGeoCoords(inc: Incident): { lat: number; lng: number } | null {
    if (inc.latitude != null && inc.longitude != null) return { lat: inc.latitude, lng: inc.longitude };
    if (inc.locationId != null) {
      const loc = locations.find((l) => l.id === inc.locationId);
      if (loc?.latitude != null && loc?.longitude != null) return { lat: loc.latitude, lng: loc.longitude };
    }
    if (inc.liveStartLat != null && inc.liveStartLng != null) return { lat: inc.liveStartLat, lng: inc.liveStartLng };
    return null;
  }

  const geoIncidents = incidents.filter((i) => resolveGeoCoords(i) !== null);
  const customMapIncidents = typeof selectedLayer === "number"
    ? incidents.filter((i) => i.customMapId === selectedLayer)
    : [];
  const activeCustomMap = typeof selectedLayer === "number"
    ? customMaps.find((m) => m.id === selectedLayer) ?? null
    : null;

  const mappedCount = selectedLayer === "geographic"
    ? geoIncidents.length
    : customMapIncidents.filter((i) => i.customMapX != null && i.customMapY != null).length;

  const unmappedCount = selectedLayer === "geographic"
    ? incidents.filter((i) => resolveGeoCoords(i) === null && i.customMapId == null).length
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-map-title">
              <MapPin className="inline h-6 w-6 mr-2 -mt-0.5" />
              Map View
            </h1>
            {liveIncidents.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400" data-testid="badge-live-count">
                <Radio className="h-3 w-3" />
                {liveIncidents.length} Live
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize incident locations on an interactive map
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                {incidentsLoading ? (
                  <Skeleton className="h-[500px] rounded-md" />
                ) : selectedLayer === "geographic" ? (
                  <GeographicMap
                    incidents={incidents}
                    categories={categories}
                    locations={locations}
                    liveIncidents={liveIncidents}
                  />
                ) : activeCustomMap ? (
                  <CustomMapLayerView
                    key={activeCustomMap.id}
                    customMap={activeCustomMap}
                    incidents={customMapIncidents}
                    categories={categories}
                    height="500px"
                  />
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-sm text-muted-foreground rounded-md">
                    Map not found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {customMaps.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Map Layer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-1">
                  <button
                    onClick={() => setSelectedLayer("geographic")}
                    className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors ${
                      selectedLayer === "geographic"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                    data-testid="layer-geographic"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Geographic Map</span>
                  </button>
                  {customMaps.map((cm) => (
                    <button
                      key={cm.id}
                      onClick={() => setSelectedLayer(cm.id)}
                      className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors ${
                        selectedLayer === cm.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      }`}
                      data-testid={`layer-custom-map-${cm.id}`}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{cm.name}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedLayer === "geographic" && (
                  <div className="flex items-center gap-2 pb-1 mb-1 border-b">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Predefined Location</span>
                  </div>
                )}
                {liveIncidents.length > 0 && selectedLayer === "geographic" && (
                  <div className="flex items-center gap-2 pb-1 mb-1 border-b">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Live Incident</span>
                  </div>
                )}
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No categories defined</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || "#3B82F6" }}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedLayer === "geographic" ? "Mapped Incidents" : "On This Map"}
                  </span>
                  <span className="text-sm font-medium" data-testid="text-mapped-count">
                    {mappedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Incidents</span>
                  <span className="text-sm font-medium">{incidents.length}</span>
                </div>
                {selectedLayer === "geographic" && unmappedCount > 0 && (
                  <div className="flex items-start gap-1.5 pt-2 border-t">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      {unmappedCount} incident(s) without map coordinates
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
