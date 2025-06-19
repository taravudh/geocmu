import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { DrawingMode, DrawnFeature } from '../types/map';

interface DrawingToolsProps {
  drawingMode: DrawingMode;
  onDrawingComplete: () => void;
  onFeatureDrawn: (feature: DrawnFeature) => void;
  onFeatureClick: (feature: DrawnFeature) => void;
  onFeatureDoubleClick: (feature: DrawnFeature) => void;
  drawnFeatures: DrawnFeature[];
}

const DrawingTools: React.FC<DrawingToolsProps> = ({ 
  drawingMode, 
  onDrawingComplete, 
  onFeatureDrawn, 
  onFeatureClick,
  onFeatureDoubleClick,
  drawnFeatures 
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || drawingMode === 'none') return;

    let isDrawing = false;
    let currentShape: L.Layer | null = null;
    let startPoint: L.LatLng | null = null;
    let polygonPoints: L.LatLng[] = [];
    let polylinePoints: L.LatLng[] = [];
    let tempMarkers: L.Marker[] = [];
    
    // Rectangle-specific state
    let rectanglePoints: L.LatLng[] = [];
    let rectangleStep = 0;
    let previewLine: L.Polyline | null = null;
    let previewRectangle: L.Polygon | null = null;

    const createCustomIcon = (color: string = '#3b82f6') => {
      return L.divIcon({
        className: 'custom-drawing-marker',
        html: `<div class="w-3 h-3 bg-white border-2 rounded-full shadow-lg" style="border-color: ${color}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
    };

    const addTempMarker = (latlng: L.LatLng, color: string = '#3b82f6') => {
      const marker = L.marker(latlng, { icon: createCustomIcon(color) }).addTo(map);
      tempMarkers.push(marker);
      return marker;
    };

    const clearTempMarkers = () => {
      tempMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
      tempMarkers = [];
    };

    const clearPreviewElements = () => {
      if (previewLine && map.hasLayer(previewLine)) {
        map.removeLayer(previewLine);
        previewLine = null;
      }
      if (previewRectangle && map.hasLayer(previewRectangle)) {
        map.removeLayer(previewRectangle);
        previewRectangle = null;
      }
    };

    // Calculate rectangle corners from three points
    const calculateRectangleCorners = (p1: L.LatLng, p2: L.LatLng, p3: L.LatLng): L.LatLng[] => {
      const v1 = {
        lat: p2.lat - p1.lat,
        lng: p2.lng - p1.lng
      };
      
      const v2 = {
        lat: p3.lat - p1.lat,
        lng: p3.lng - p1.lng
      };
      
      const dotProduct = v1.lat * v2.lat + v1.lng * v2.lng;
      const v1LengthSquared = v1.lat * v1.lat + v1.lng * v1.lng;
      
      if (v1LengthSquared === 0) return [p1, p2, p3, p1];
      
      const projection = dotProduct / v1LengthSquared;
      const projectedPoint = {
        lat: p1.lat + projection * v1.lat,
        lng: p1.lng + projection * v1.lng
      };
      
      const perpVector = {
        lat: p3.lat - projectedPoint.lat,
        lng: p3.lng - projectedPoint.lng
      };
      
      const corner1 = p1;
      const corner2 = p2;
      const corner3 = L.latLng(p2.lat + perpVector.lat, p2.lng + perpVector.lng);
      const corner4 = L.latLng(p1.lat + perpVector.lat, p1.lng + perpVector.lng);
      
      return [corner1, corner2, corner3, corner4, corner1];
    };

    const createPopupContent = (feature: DrawnFeature, basicInfo: string): HTMLElement => {
      const attributeCount = feature.properties.attributes ? Object.keys(feature.properties.attributes).length : 0;
      
      const container = document.createElement('div');
      container.className = 'p-3 min-w-[250px]';
      
      const infoDiv = document.createElement('div');
      infoDiv.innerHTML = basicInfo;
      container.appendChild(infoDiv);
      
      if (attributeCount > 0) {
        const attributesDiv = document.createElement('div');
        attributesDiv.className = 'mt-3 pt-3 border-t border-gray-200';
        
        const attributesTitle = document.createElement('div');
        attributesTitle.className = 'font-semibold text-gray-700 mb-2 flex items-center justify-between';
        attributesTitle.innerHTML = `
          <span>Custom Attributes</span>
          <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
            ${attributeCount}
          </span>
        `;
        attributesDiv.appendChild(attributesTitle);
        
        const attributesList = document.createElement('div');
        attributesList.className = 'space-y-1 text-sm';
        
        Object.entries(feature.properties.attributes).forEach(([key, value]) => {
          const attrDiv = document.createElement('div');
          attrDiv.className = 'flex justify-between items-center py-1 px-2 bg-gray-50 rounded';
          attrDiv.innerHTML = `
            <span class="font-medium text-gray-700">${key}:</span>
            <span class="text-gray-600 ml-2">${value}</span>
          `;
          attributesList.appendChild(attrDiv);
        });
        
        attributesDiv.appendChild(attributesList);
        container.appendChild(attributesDiv);
      }
      
      const separator = document.createElement('div');
      separator.className = 'mt-3 pt-3 border-t border-gray-200';
      container.appendChild(separator);
      
      // UPDATED: Add Camera Button for Feature-Linked Photos
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'space-y-2';
      
      // Attributes Button
      const attributesButton = document.createElement('button');
      attributesButton.className = 'w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2';
      attributesButton.innerHTML = `
        <span>📝</span>
        <span>${attributeCount > 0 ? `Edit Attributes (${attributeCount})` : 'Add Attributes'}</span>
      `;
      
      attributesButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onFeatureDoubleClick(feature);
      });
      
      buttonContainer.appendChild(attributesButton);
      
      // NEW: Camera Button for Feature-Linked Photos
      const cameraButton = document.createElement('button');
      cameraButton.className = 'w-full bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2';
      cameraButton.innerHTML = `
        <span>📸</span>
        <span>Take Photo for Feature</span>
      `;
      
      cameraButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Trigger camera with feature ID
        const event = new CustomEvent('takePhotoForFeature', { 
          detail: { featureId: feature.id } 
        });
        window.dispatchEvent(event);
      });
      
      buttonContainer.appendChild(cameraButton);
      separator.appendChild(buttonContainer);
      
      // Instructions
      const instructions = document.createElement('p');
      instructions.className = 'text-xs text-gray-500 mt-2 text-center';
      instructions.textContent = 'Click buttons to add attributes or take linked photos';
      separator.appendChild(instructions);
      
      return container;
    };

    const createFeature = (layer: L.Layer, type: DrawnFeature['type'], coordinates: number[][], properties: Record<string, any> = {}): DrawnFeature => {
      const feature: DrawnFeature = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        layer,
        coordinates,
        properties: {
          ...properties,
          timestamp: Date.now(),
          created: new Date().toLocaleString(),
          attributes: {},
        },
        timestamp: Date.now(),
      };

      (layer as any)._featureData = feature;
      (layer as any)._isDrawnFeature = true;

      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        
        if (drawingMode === 'erase') {
          onFeatureClick(feature);
          return false;
        }
      }, { passive: false });

      layer.on('mouseover', (e) => {
        if (drawingMode === 'erase') {
          if (layer instanceof L.Marker) {
            const element = layer.getElement();
            if (element) {
              element.style.filter = 'hue-rotate(0deg) saturate(2) brightness(1.2)';
              element.style.transform = 'scale(1.5)';
              element.style.transition = 'all 0.2s ease';
              element.style.zIndex = '10000';
            }
          } else {
            (layer as any).setStyle({ 
              color: '#ef4444', 
              fillColor: '#ef4444',
              weight: 4,
              opacity: 1,
              fillOpacity: 0.6 
            });
          }
          map.getContainer().style.cursor = 'pointer';
        }
      });

      layer.on('mouseout', () => {
        if (drawingMode === 'erase') {
          if (layer instanceof L.Marker) {
            const element = layer.getElement();
            if (element) {
              element.style.filter = '';
              element.style.transform = '';
              element.style.zIndex = '';
            }
          } else {
            const originalStyle = getOriginalStyle(type);
            (layer as any).setStyle(originalStyle);
          }
          map.getContainer().style.cursor = 'crosshair';
        }
      });

      return feature;
    };

    const getOriginalStyle = (type: DrawnFeature['type']) => {
      const styles = {
        polyline: { color: '#3b82f6', weight: 3, opacity: 0.8 },
        polygon: { color: '#10b981', weight: 2, fillOpacity: 0.2, fillColor: '#10b981', opacity: 0.8 },
        rectangle: { color: '#f59e0b', weight: 2, fillOpacity: 0.2, fillColor: '#f59e0b', opacity: 0.8 },
        circle: { color: '#8b5cf6', weight: 2, fillOpacity: 0.2, fillColor: '#8b5cf6', opacity: 0.8 },
        marker: {}
      };
      return styles[type] || {};
    };

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // Handle eraser mode
      if (drawingMode === 'erase') {
        let foundFeature = false;
        
        for (const feature of drawnFeatures) {
          if (!feature.layer || !map.hasLayer(feature.layer)) continue;
          
          let isWithinFeature = false;
          
          if (feature.layer instanceof L.Marker) {
            const markerLatLng = feature.layer.getLatLng();
            const distance = e.latlng.distanceTo(markerLatLng);
            isWithinFeature = distance < 50;
          } else if (feature.layer instanceof L.Circle) {
            const center = (feature.layer as L.Circle).getLatLng();
            const radius = (feature.layer as L.Circle).getRadius();
            const distance = e.latlng.distanceTo(center);
            isWithinFeature = distance <= radius;
          } else if (feature.layer instanceof L.Rectangle) {
            const bounds = (feature.layer as L.Rectangle).getBounds();
            isWithinFeature = bounds.contains(e.latlng);
          } else if (feature.layer instanceof L.Polygon) {
            const bounds = (feature.layer as L.Polygon).getBounds();
            if (bounds.contains(e.latlng)) {
              isWithinFeature = true;
            }
          } else if (feature.layer instanceof L.Polyline) {
            const latLngs = (feature.layer as L.Polyline).getLatLngs() as L.LatLng[];
            for (let i = 0; i < latLngs.length - 1; i++) {
              const distance = L.LineUtil.pointToSegmentDistance(
                map.latLngToLayerPoint(e.latlng),
                map.latLngToLayerPoint(latLngs[i]),
                map.latLngToLayerPoint(latLngs[i + 1])
              );
              if (distance < 20) {
                isWithinFeature = true;
                break;
              }
            }
          }
          
          if (isWithinFeature) {
            onFeatureClick(feature);
            foundFeature = true;
            break;
          }
        }
        
        if (!foundFeature) {
          const indicator = L.circleMarker(e.latlng, {
            radius: 12,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.3,
            weight: 2
          }).addTo(map);
          
          setTimeout(() => {
            if (map.hasLayer(indicator)) {
              map.removeLayer(indicator);
            }
          }, 800);
        }
        
        return;
      }

      // MARKER MODE
      if (drawingMode === 'marker') {
        const marker = L.marker(e.latlng, {
          icon: L.divIcon({
            className: 'custom-field-marker',
            html: '<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map);
        
        const feature = createFeature(
          marker, 
          'marker', 
          [[e.latlng.lng, e.latlng.lat]], 
          { lat: e.latlng.lat, lng: e.latlng.lng }
        );

        const basicInfo = `
          <div class="font-semibold text-red-600 mb-2">📍 Field Marker</div>
          <div class="text-sm space-y-1">
            <div><strong>ID:</strong> ${feature.id.slice(-8)}</div>
            <div><strong>Latitude:</strong> ${e.latlng.lat.toFixed(6)}</div>
            <div><strong>Longitude:</strong> ${e.latlng.lng.toFixed(6)}</div>
            <div class="text-gray-500 text-xs mt-2">
              Created: ${new Date().toLocaleString()}
            </div>
          </div>
        `;
        
        marker.bindPopup(createPopupContent(feature, basicInfo));
        onFeatureDrawn(feature);
        return;
      }

      // POLYLINE MODE
      if (drawingMode === 'polyline') {
        if (!isDrawing) {
          isDrawing = true;
          polylinePoints = [e.latlng];
          addTempMarker(e.latlng, '#3b82f6');
          
          currentShape = L.polyline(polylinePoints, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
        } else {
          polylinePoints.push(e.latlng);
          addTempMarker(e.latlng, '#3b82f6');
          
          if (currentShape) {
            (currentShape as L.Polyline).setLatLngs(polylinePoints);
          }
        }
        return;
      }

      // POLYGON MODE
      if (drawingMode === 'polygon') {
        if (!isDrawing) {
          isDrawing = true;
          polygonPoints = [e.latlng];
          addTempMarker(e.latlng, '#10b981');
        } else {
          polygonPoints.push(e.latlng);
          addTempMarker(e.latlng, '#10b981');
        }

        if (polygonPoints.length >= 2) {
          if (currentShape) {
            map.removeLayer(currentShape);
          }
          
          currentShape = L.polygon(polygonPoints, {
            color: '#10b981',
            weight: 2,
            fillOpacity: 0.2,
            fillColor: '#10b981',
            opacity: 0.8,
          }).addTo(map);
        }
        return;
      }

      // RECTANGLE MODE
      if (drawingMode === 'rectangle') {
        if (rectangleStep === 0) {
          rectanglePoints = [e.latlng];
          rectangleStep = 1;
          isDrawing = true;
          addTempMarker(e.latlng, '#f59e0b');
        } else if (rectangleStep === 1) {
          rectanglePoints.push(e.latlng);
          rectangleStep = 2;
          addTempMarker(e.latlng, '#f59e0b');
          
          clearPreviewElements();
          previewLine = L.polyline(rectanglePoints, {
            color: '#f59e0b',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 5'
          }).addTo(map);
        } else if (rectangleStep === 2) {
          rectanglePoints.push(e.latlng);
          
          const corners = calculateRectangleCorners(rectanglePoints[0], rectanglePoints[1], rectanglePoints[2]);
          
          clearPreviewElements();
          clearTempMarkers();
          
          currentShape = L.polygon(corners, {
            color: '#f59e0b',
            weight: 2,
            fillOpacity: 0.2,
            fillColor: '#f59e0b',
            opacity: 0.8,
          }).addTo(map);
          
          const bounds = (currentShape as L.Polygon).getBounds();
          const area = calculateRectangleArea(bounds);
          
          const feature = createFeature(
            currentShape, 
            'rectangle', 
            [corners.map(corner => [corner.lng, corner.lat])], 
            { area, method: 'three-point', basePoints: rectanglePoints.length }
          );

          const basicInfo = `
            <div class="font-semibold text-yellow-600 mb-2">⬜ Rectangle</div>
            <div class="text-sm">
              <div><strong>ID:</strong> ${feature.id.slice(-8)}</div>
              <div><strong>Area:</strong> ${area.toFixed(2)} m²</div>
              <div><strong>Method:</strong> Three-point construction</div>
              <div class="text-gray-500 text-xs mt-2">
                Created: ${new Date().toLocaleString()}
              </div>
            </div>
          `;
          
          (currentShape as L.Polygon).bindPopup(createPopupContent(feature, basicInfo));
          onFeatureDrawn(feature);
          
          rectangleStep = 0;
          rectanglePoints = [];
          isDrawing = false;
        }
        return;
      }

      // CIRCLE MODE
      if (drawingMode === 'circle') {
        if (!isDrawing) {
          isDrawing = true;
          startPoint = e.latlng;
          addTempMarker(e.latlng, '#8b5cf6');
        }
        return;
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (drawingMode === 'rectangle' && rectangleStep === 2 && rectanglePoints.length === 2) {
        clearPreviewElements();
        
        previewLine = L.polyline(rectanglePoints, {
          color: '#f59e0b',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        }).addTo(map);
        
        const previewCorners = calculateRectangleCorners(rectanglePoints[0], rectanglePoints[1], e.latlng);
        previewRectangle = L.polygon(previewCorners, {
          color: '#f59e0b',
          weight: 2,
          fillOpacity: 0.1,
          fillColor: '#f59e0b',
          opacity: 0.6,
          dashArray: '5, 5'
        }).addTo(map);
        
        return;
      }

      if (!isDrawing || !startPoint) return;
      if (drawingMode === 'polyline' || drawingMode === 'polygon' || drawingMode === 'erase' || drawingMode === 'rectangle') return;

      if (currentShape) {
        map.removeLayer(currentShape);
      }

      if (drawingMode === 'circle') {
        const radius = startPoint.distanceTo(e.latlng);
        currentShape = L.circle(startPoint, {
          radius,
          color: '#8b5cf6',
          weight: 2,
          fillOpacity: 0.2,
          fillColor: '#8b5cf6',
          opacity: 0.8,
        }).addTo(map);
      }
    };

    const handleDoubleClick = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      
      if (drawingMode === 'polyline' && isDrawing && polylinePoints.length >= 2) {
        if (currentShape) {
          const totalDistance = calculatePolylineDistance(polylinePoints);
          
          const feature = createFeature(
            currentShape, 
            'polyline', 
            polylinePoints.map(p => [p.lng, p.lat]), 
            { distance: totalDistance, points: polylinePoints.length }
          );

          const basicInfo = `
            <div class="font-semibold text-blue-600 mb-2">📏 Polyline</div>
            <div class="text-sm">
              <div><strong>ID:</strong> ${feature.id.slice(-8)}</div>
              <div><strong>Points:</strong> ${polylinePoints.length}</div>
              <div><strong>Distance:</strong> ${totalDistance.toFixed(2)} m</div>
              <div class="text-gray-500 text-xs mt-2">
                Created: ${new Date().toLocaleString()}
              </div>
            </div>
          `;
          
          (currentShape as L.Polyline).bindPopup(createPopupContent(feature, basicInfo));
          onFeatureDrawn(feature);
        }
        clearTempMarkers();
        isDrawing = false;
        polylinePoints = [];
      }
      
      if (drawingMode === 'polygon' && isDrawing && polygonPoints.length >= 3) {
        if (currentShape) {
          const area = calculatePolygonArea(polygonPoints);
          
          const feature = createFeature(
            currentShape, 
            'polygon', 
            [polygonPoints.map(p => [p.lng, p.lat])], 
            { area, points: polygonPoints.length }
          );

          const basicInfo = `
            <div class="font-semibold text-green-600 mb-2">⬟ Polygon</div>
            <div class="text-sm">
              <div><strong>ID:</strong> ${feature.id.slice(-8)}</div>
              <div><strong>Points:</strong> ${polygonPoints.length}</div>
              <div><strong>Area:</strong> ${area.toFixed(2)} m²</div>
              <div class="text-gray-500 text-xs mt-2">
                Created: ${new Date().toLocaleString()}
              </div>
            </div>
          `;
          
          (currentShape as L.Polygon).bindPopup(createPopupContent(feature, basicInfo));
          onFeatureDrawn(feature);
        }
        clearTempMarkers();
        isDrawing = false;
        polygonPoints = [];
      }
    };

    const handleMapMouseUp = (e: L.LeafletMouseEvent) => {
      if (!isDrawing || !startPoint) return;
      if (drawingMode === 'polyline' || drawingMode === 'polygon' || drawingMode === 'erase' || drawingMode === 'rectangle') return;

      if (drawingMode === 'circle' && currentShape) {
        const radius = (currentShape as L.Circle).getRadius();
        const area = Math.PI * radius * radius;
        
        const feature = createFeature(
          currentShape, 
          'circle', 
          [[(currentShape as L.Circle).getLatLng().lng, (currentShape as L.Circle).getLatLng().lat]], 
          { radius, area, center: [(currentShape as L.Circle).getLatLng().lat, (currentShape as L.Circle).getLatLng().lng] }
        );

        const basicInfo = `
          <div class="font-semibold text-purple-600 mb-2">⭕ Circle</div>
          <div class="text-sm">
            <div><strong>ID:</strong> ${feature.id.slice(-8)}</div>
            <div><strong>Radius:</strong> ${radius.toFixed(2)} m</div>
            <div><strong>Area:</strong> ${area.toFixed(2)} m²</div>
            <div class="text-gray-500 text-xs mt-2">
              Created: ${new Date().toLocaleString()}
            </div>
          </div>
        `;
        
        (currentShape as L.Circle).bindPopup(createPopupContent(feature, basicInfo));
        onFeatureDrawn(feature);
      }

      clearTempMarkers();
      isDrawing = false;
      startPoint = null;
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentShape) {
          map.removeLayer(currentShape);
        }
        clearTempMarkers();
        clearPreviewElements();
        isDrawing = false;
        polygonPoints = [];
        polylinePoints = [];
        rectanglePoints = [];
        rectangleStep = 0;
        startPoint = null;
        onDrawingComplete();
      }
    };

    // Helper functions
    const calculatePolylineDistance = (points: L.LatLng[]): number => {
      let totalDistance = 0;
      for (let i = 1; i < points.length; i++) {
        totalDistance += points[i - 1].distanceTo(points[i]);
      }
      return totalDistance;
    };

    const calculatePolygonArea = (points: L.LatLng[]): number => {
      if (points.length < 3) return 0;
      
      let area = 0;
      const n = points.length;
      
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].lat * points[j].lng;
        area -= points[j].lat * points[i].lng;
      }
      
      area = Math.abs(area) / 2;
      return area * 111320 * 111320 * Math.cos(points[0].lat * Math.PI / 180);
    };

    const calculateRectangleArea = (bounds: L.LatLngBounds): number => {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const width = ne.distanceTo(L.latLng(ne.lat, sw.lng));
      const height = ne.distanceTo(L.latLng(sw.lat, ne.lng));
      return width * height;
    };

    // Event listeners
    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('dblclick', handleDoubleClick);
    map.on('mouseup', handleMapMouseUp);
    document.addEventListener('keydown', handleKeyPress);

    // Change cursor
    const mapContainer = map.getContainer();
    mapContainer.style.cursor = drawingMode === 'none' ? 'grab' : 
                               drawingMode === 'erase' ? 'crosshair' : 'crosshair';

    // Disable double-click zoom when drawing
    if (drawingMode === 'polyline' || drawingMode === 'polygon') {
      map.doubleClickZoom.disable();
    }

    // UPDATED: Listen for camera events from popups
    const handleCameraEvent = (event: CustomEvent) => {
      const { featureId } = event.detail;
      
      // Trigger camera with feature ID
      const cameraEvent = new CustomEvent('openCameraForFeature', { 
        detail: { featureId } 
      });
      window.dispatchEvent(cameraEvent);
    };

    window.addEventListener('takePhotoForFeature', handleCameraEvent as EventListener);

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.off('dblclick', handleDoubleClick);
      map.off('mouseup', handleMapMouseUp);
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('takePhotoForFeature', handleCameraEvent as EventListener);
      mapContainer.style.cursor = 'grab';
      
      map.doubleClickZoom.enable();
      
      if (currentShape && isDrawing) {
        map.removeLayer(currentShape);
      }
      clearTempMarkers();
      clearPreviewElements();
    };
  }, [map, drawingMode, onDrawingComplete, onFeatureDrawn, onFeatureClick, onFeatureDoubleClick, drawnFeatures]);

  // UPDATED: Listen for camera events from feature popups
  useEffect(() => {
    const handleOpenCameraForFeature = (event: CustomEvent) => {
      const { featureId } = event.detail;
      
      // Find the MapPlayground component and trigger camera
      const mapPlaygroundEvent = new CustomEvent('triggerCameraForFeature', { 
        detail: { featureId } 
      });
      window.dispatchEvent(mapPlaygroundEvent);
    };

    window.addEventListener('openCameraForFeature', handleOpenCameraForFeature as EventListener);

    return () => {
      window.removeEventListener('openCameraForFeature', handleOpenCameraForFeature as EventListener);
    };
  }, []);

  return null;
};

export default DrawingTools;