import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
  readOnly?: boolean;
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function MapPicker({ latitude, longitude, onLocationSelect, height = "300px", readOnly = false }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const geoSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const hasCoords = latitude != null && longitude != null;
    const map = L.map(mapRef.current).setView(
      [hasCoords ? latitude : -26.2041, hasCoords ? longitude : 28.0473],
      hasCoords ? 14 : 6
    );

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    });

    street.addTo(map);
    L.control.layers({ "Street": street, "Topographic": topo, "Satellite": satellite }).addTo(map);

    if (hasCoords) {
      markerRef.current = L.marker([latitude, longitude], { icon: defaultIcon }).addTo(map);
    }

    if (!readOnly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
        }
        onLocationSelect(lat, lng);
        setGeoError(null);
        setGeoAccuracy(null);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && latitude != null && longitude != null) {
      mapInstanceRef.current.setView([latitude, longitude], 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.marker([latitude, longitude], { icon: defaultIcon }).addTo(mapInstanceRef.current);
      }
    }
  }, [latitude, longitude]);

  const handleUseCurrentLocation = () => {
    if (!geoSupported) return;
    setGeoLoading(true);
    setGeoError(null);
    setGeoAccuracy(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        const roundedAccuracy = Math.round(accuracy);
        setGeoAccuracy(roundedAccuracy);
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([lat, lng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
          }
        }
        onLocationSelect(lat, lng);
        setGeoLoading(false);
        if (accuracy > 150) {
          setGeoError(
            `Low GPS accuracy (±${roundedAccuracy} m) — your location may be approximate. Move outdoors for a better signal, or drag the pin to correct it.`
          );
        }
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location access denied — please allow location permission or place the pin manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location unavailable — your device could not determine your position.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out — please try again.");
            break;
          default:
            setGeoError("Could not get your location — please place the pin manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2">
      {!readOnly && geoSupported && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          data-testid="button-use-current-location"
        >
          {geoLoading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Locate className="h-3.5 w-3.5 mr-1.5" />
          )}
          {geoLoading
            ? geoAccuracy != null
              ? `Refining… ±${geoAccuracy} m`
              : "Locating…"
            : "Use my current location"}
        </Button>
      )}
      {!geoLoading && geoAccuracy != null && !geoError && (
        <p className="text-xs text-muted-foreground" data-testid="text-geo-accuracy">
          GPS accuracy: ±{geoAccuracy} m
        </p>
      )}
      {geoError && (
        <p className={`text-xs ${geoAccuracy != null && geoAccuracy > 150 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`} data-testid="text-geo-error">
          {geoError}{" "}
          {geoAccuracy == null && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="underline underline-offset-2 font-medium hover:opacity-80"
              data-testid="button-geo-retry"
            >
              Try again
            </button>
          )}
        </p>
      )}
      <div
        ref={mapRef}
        style={{ height, width: "100%" }}
        className="rounded-md border"
        data-testid="map-picker"
      />
    </div>
  );
}
