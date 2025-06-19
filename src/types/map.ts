export type MapLayer = 'satellite' | 'hybrid' | 'openstreet';

export type DrawingMode = 'none' | 'marker' | 'polyline' | 'polygon' | 'rectangle' | 'circle' | 'erase';

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
}

export interface DrawnFeature {
  id: string;
  type: 'marker' | 'polyline' | 'polygon' | 'rectangle' | 'circle';
  layer: L.Layer;
  coordinates: number[][];
  properties: {
    timestamp: number;
    created: string;
    attributes: Record<string, string>;
    [key: string]: any;
  };
  timestamp: number;
}

export interface VectorLayer {
  id: string;
  name: string;
  data: GeoJSON.FeatureCollection | GeoJSON.Feature;
  visible: boolean;
  color: string;
  opacity: number;
  type: 'geojson';
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}