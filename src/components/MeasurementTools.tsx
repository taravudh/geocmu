import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface MeasurementToolsProps {
  isActive: boolean;
  measurementType: 'distance' | 'area' | null;
  onMeasurementComplete: (result: { value: number; unit: string; type: 'distance' | 'area' }) => void;
  onCancel: () => void;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  isActive,
  measurementType,
  onMeasurementComplete,
  onCancel,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !isActive || !measurementType) return;

    let isDrawing = false;
    let measurementPoints: L.LatLng[] = [];
    let tempMarkers: L.Marker[] = [];
    let measurementLine: L.Polyline | null = null;
    let measurementPolygon: L.Polygon | null = null;
    let measurementLabel: L.Marker | null = null;
    let previewLine: L.Polyline | null = null;

    const createMeasurementIcon = (color: string = '#ff6b35') => {
      return L.divIcon({
        className: 'measurement-marker',
        html: `<div class="w-4 h-4 bg-white border-2 rounded-full shadow-lg" style="border-color: ${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    };

    const createLabelIcon = (text: string, bgColor: string = '#ff6b35') => {
      return L.divIcon({
        className: 'measurement-label',
        html: `
          <div class="bg-white border-2 rounded-lg px-3 py-2 shadow-lg text-sm font-bold whitespace-nowrap" 
               style="border-color: ${bgColor}; color: ${bgColor};">
            ${text}
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
    };

    const addTempMarker = (latlng: L.LatLng, color: string = '#ff6b35') => {
      const marker = L.marker(latlng, { icon: createMeasurementIcon(color) }).addTo(map);
      tempMarkers.push(marker);
      return marker;
    };

    const clearMeasurement = () => {
      tempMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
      tempMarkers = [];
      
      if (measurementLine && map.hasLayer(measurementLine)) {
        map.removeLayer(measurementLine);
        measurementLine = null;
      }
      
      if (measurementPolygon && map.hasLayer(measurementPolygon)) {
        map.removeLayer(measurementPolygon);
        measurementPolygon = null;
      }
      
      if (measurementLabel && map.hasLayer(measurementLabel)) {
        map.removeLayer(measurementLabel);
        measurementLabel = null;
      }

      if (previewLine && map.hasLayer(previewLine)) {
        map.removeLayer(previewLine);
        previewLine = null;
      }
    };

    // METRIC DISTANCE CALCULATION - Uses Earth's radius in meters
    const calculateDistance = (points: L.LatLng[]): number => {
      let totalDistance = 0;
      for (let i = 1; i < points.length; i++) {
        totalDistance += points[i - 1].distanceTo(points[i]); // Returns meters
      }
      return totalDistance; // Always in meters
    };

    // METRIC AREA CALCULATION - Uses proper Earth radius for accuracy
    const calculateArea = (points: L.LatLng[]): number => {
      if (points.length < 3) return 0;
      
      // Use spherical excess formula for accurate area calculation on Earth's surface
      let area = 0;
      const n = points.length;
      const earthRadius = 6378137; // Earth radius in meters (WGS84)
      
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const lat1 = points[i].lat * Math.PI / 180;
        const lat2 = points[j].lat * Math.PI / 180;
        const lng1 = points[i].lng * Math.PI / 180;
        const lng2 = points[j].lng * Math.PI / 180;
        
        area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
      }
      
      area = Math.abs(area) * earthRadius * earthRadius / 2;
      return area; // Always in square meters (m²)
    };

    // METRIC UNIT FORMATTING
    const formatDistance = (meters: number): { value: number; unit: string } => {
      if (meters < 1000) {
        return { value: meters, unit: 'm' };        // Meters
      } else {
        return { value: meters / 1000, unit: 'km' }; // Kilometers
      }
    };

    // UPDATED: Area formatting to use SQUARE KILOMETERS as requested
    const formatArea = (squareMeters: number): { value: number; unit: string } => {
      if (squareMeters < 1000000) {
        return { value: squareMeters, unit: 'm²' };     // Square meters for small areas
      } else {
        return { value: squareMeters / 1000000, unit: 'sq.km' }; // Square kilometers for large areas
      }
    };

    const updateMeasurement = () => {
      if (measurementPoints.length < 2) return;

      if (measurementType === 'distance') {
        // Update or create line
        if (measurementLine) {
          measurementLine.setLatLngs(measurementPoints);
        } else {
          measurementLine = L.polyline(measurementPoints, {
            color: '#ff6b35',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 10'
          }).addTo(map);
        }

        // Calculate and display distance in metric units
        const distance = calculateDistance(measurementPoints);
        const formatted = formatDistance(distance);
        const midPoint = measurementPoints[Math.floor(measurementPoints.length / 2)];
        
        if (measurementLabel && map.hasLayer(measurementLabel)) {
          map.removeLayer(measurementLabel);
        }
        
        measurementLabel = L.marker(midPoint, {
          icon: createLabelIcon(`${formatted.value.toFixed(formatted.unit === 'km' ? 2 : 1)} ${formatted.unit}`, '#ff6b35')
        }).addTo(map);

      } else if (measurementType === 'area' && measurementPoints.length >= 3) {
        // Update or create polygon
        if (measurementPolygon) {
          measurementPolygon.setLatLngs(measurementPoints);
        } else {
          measurementPolygon = L.polygon(measurementPoints, {
            color: '#10b981',
            weight: 3,
            fillOpacity: 0.2,
            fillColor: '#10b981',
            opacity: 0.8,
            dashArray: '5, 10'
          }).addTo(map);
        }

        // Calculate and display area in SQUARE KILOMETERS
        const area = calculateArea(measurementPoints);
        const formatted = formatArea(area);
        const bounds = L.latLngBounds(measurementPoints);
        const center = bounds.getCenter();
        
        if (measurementLabel && map.hasLayer(measurementLabel)) {
          map.removeLayer(measurementLabel);
        }
        
        measurementLabel = L.marker(center, {
          icon: createLabelIcon(`${formatted.value.toFixed(formatted.unit === 'sq.km' ? 3 : 1)} ${formatted.unit}`, '#10b981')
        }).addTo(map);
      }
    };

    const updatePreview = (currentPoint: L.LatLng) => {
      if (measurementPoints.length === 0) return;

      if (measurementType === 'distance') {
        // Show preview line from last point to current mouse position
        const previewPoints = [...measurementPoints, currentPoint];
        
        if (previewLine && map.hasLayer(previewLine)) {
          map.removeLayer(previewLine);
        }
        
        previewLine = L.polyline(previewPoints, {
          color: '#ff6b35',
          weight: 2,
          opacity: 0.5,
          dashArray: '10, 10'
        }).addTo(map);

      } else if (measurementType === 'area' && measurementPoints.length >= 2) {
        // Show preview polygon
        const previewPoints = [...measurementPoints, currentPoint];
        
        if (previewLine && map.hasLayer(previewLine)) {
          map.removeLayer(previewLine);
        }
        
        previewLine = L.polygon(previewPoints, {
          color: '#10b981',
          weight: 2,
          fillOpacity: 0.1,
          fillColor: '#10b981',
          opacity: 0.5,
          dashArray: '10, 10'
        }).addTo(map);
      }
    };

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      console.log('Measurement click:', measurementType, 'Points:', measurementPoints.length);
      
      if (measurementType === 'distance') {
        measurementPoints.push(e.latlng);
        addTempMarker(e.latlng, '#ff6b35');
        updateMeasurement();
        
        // Show live preview
        if (measurementPoints.length === 1) {
          isDrawing = true;
        }
        
      } else if (measurementType === 'area') {
        if (!isDrawing) {
          isDrawing = true;
          measurementPoints = [e.latlng];
          addTempMarker(e.latlng, '#10b981');
        } else {
          measurementPoints.push(e.latlng);
          addTempMarker(e.latlng, '#10b981');
          updateMeasurement();
        }
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (isDrawing && measurementPoints.length > 0) {
        updatePreview(e.latlng);
      }
    };

    const handleDoubleClick = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      console.log('Measurement double-click:', measurementType, 'Points:', measurementPoints.length);
      
      if (measurementType === 'distance' && measurementPoints.length >= 2) {
        const distance = calculateDistance(measurementPoints);
        const formatted = formatDistance(distance);
        
        console.log('Distance measurement complete:', formatted);
        onMeasurementComplete({
          value: formatted.value,
          unit: formatted.unit,
          type: 'distance'
        });
        
      } else if (measurementType === 'area' && measurementPoints.length >= 3) {
        const area = calculateArea(measurementPoints);
        const formatted = formatArea(area);
        
        console.log('Area measurement complete:', formatted);
        onMeasurementComplete({
          value: formatted.value,
          unit: formatted.unit,
          type: 'area'
        });
      }
      
      // Clear measurement after completion
      setTimeout(() => {
        clearMeasurement();
      }, 100);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('Measurement cancelled');
        clearMeasurement();
        onCancel();
      }
    };

    // Event listeners
    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('dblclick', handleDoubleClick);
    document.addEventListener('keydown', handleKeyPress);

    // Change cursor
    const mapContainer = map.getContainer();
    mapContainer.style.cursor = 'crosshair';

    // Disable double-click zoom
    map.doubleClickZoom.disable();

    console.log('Measurement tool activated:', measurementType);

    return () => {
      console.log('Measurement tool cleanup');
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.off('dblclick', handleDoubleClick);
      document.removeEventListener('keydown', handleKeyPress);
      mapContainer.style.cursor = 'grab';
      map.doubleClickZoom.enable();
      clearMeasurement();
    };
  }, [map, isActive, measurementType, onMeasurementComplete, onCancel]);

  return null;
};

export default MeasurementTools;