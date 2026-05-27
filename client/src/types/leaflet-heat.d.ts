import * as L from "leaflet";

declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number] | [number, number, number]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<string, string>;
    }
  ): HeatLayer;

  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: Array<[number, number] | [number, number, number]>): this;
    addLatLng(latlng: [number, number] | [number, number, number]): this;
    setOptions(options: object): this;
    redraw(): this;
  }
}
