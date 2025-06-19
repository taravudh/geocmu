import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { VectorLayer } from '../types/map';

interface VectorLayerRendererProps {
  vectorLayers: VectorLayer[];
}

const VectorLayerRenderer: React.FC<VectorLayerRendererProps> = ({ vectorLayers }) => {
  const map = useMap();

  useEffect(() => {
    const layerGroups: { [key: string]: L.LayerGroup } = {};

    // Create or update layers
    vectorLayers.forEach((vectorLayer) => {
      // Remove existing layer if it exists
      if (layerGroups[vectorLayer.id]) {
        map.removeLayer(layerGroups[vectorLayer.id]);
      }

      if (!vectorLayer.visible) return;

      // Create new layer group
      const layerGroup = L.layerGroup();

      // Style function for GeoJSON features
      const getFeatureStyle = (feature?: any) => ({
        color: vectorLayer.color,
        weight: 2,
        opacity: vectorLayer.opacity,
        fillColor: vectorLayer.color,
        fillOpacity: vectorLayer.opacity * 0.5,
      });

      // Point to layer function for markers
      const pointToLayer = (feature: any, latlng: L.LatLng) => {
        return L.circleMarker(latlng, {
          radius: 6,
          ...getFeatureStyle(feature),
        });
      };

      // Popup function
      const onEachFeature = (feature: any, layer: L.Layer) => {
        if (feature.properties) {
          const popupContent = Object.entries(feature.properties)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');
          
          layer.bindPopup(`
            <div class="p-2">
              <div class="font-semibold text-blue-600 mb-2">${vectorLayer.name}</div>
              ${popupContent}
            </div>
          `);
        }
      };

      // Create GeoJSON layer
      try {
        const geoJsonLayer = L.geoJSON(vectorLayer.data, {
          style: getFeatureStyle,
          pointToLayer,
          onEachFeature,
        });

        layerGroup.addLayer(geoJsonLayer);
        layerGroups[vectorLayer.id] = layerGroup;
        map.addLayer(layerGroup);
      } catch (error) {
        console.error(`Error rendering vector layer ${vectorLayer.name}:`, error);
      }
    });

    // Cleanup function
    return () => {
      Object.values(layerGroups).forEach((layerGroup) => {
        if (map.hasLayer(layerGroup)) {
          map.removeLayer(layerGroup);
        }
      });
    };
  }, [map, vectorLayers]);

  return null;
};

export default VectorLayerRenderer;