import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapControls from './MapControls';
import LayerSelector from './LayerSelector';
import CompassRose from './CompassRose';
import GPSIndicator from './GPSIndicator';
import DrawingTools from './DrawingTools';
import DraggableDrawingTools from './DraggableDrawingTools';
import MobileDrawingTools from './MobileDrawingTools';
import MobileBottomPanel from './MobileBottomPanel';
import VectorLayerManager from './VectorLayerManager';
import VectorLayerRenderer from './VectorLayerRenderer';
import AttributeForm from './AttributeForm';
import DataExporter from './DataExporter';
import MeasurementTools from './MeasurementTools';
import CameraCapture from './CameraCapture';
import { MapLayer, DrawingMode, GPSPosition, VectorLayer, DrawnFeature } from '../types/map';

// Fix for default markers in react-leaflet
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (error) {
  console.warn('Could not fix Leaflet default markers:', error);
}

// Create GPS position icon
const createGPSIcon = () => {
  try {
    return L.divIcon({
      className: 'gps-position-marker',
      html: `
        <div class="relative">
          <div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  } catch (error) {
    console.error('Error creating GPS icon:', error);
    return L.marker([0, 0]).options.icon;
  }
};

const MapPlayground: React.FC = () => {
  // State management
  const [selectedLayers, setSelectedLayers] = useState<MapLayer[]>(['satellite']);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [gpsPosition, setGpsPosition] = useState<GPSPosition | null>(null);
  const [mapRotation, setMapRotation] = useState(0);
  const [isGPSTracking, setIsGPSTracking] = useState(false);
  const [vectorLayers, setVectorLayers] = useState<VectorLayer[]>([]);
  const [drawnFeatures, setDrawnFeatures] = useState<DrawnFeature[]>([]);
  const [undoStack, setUndoStack] = useState<DrawnFeature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<DrawnFeature | null>(null);
  const [isAttributeFormOpen, setIsAttributeFormOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [gpsAccuracyRadius, setGpsAccuracyRadius] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [fieldPhotos, setFieldPhotos] = useState<Array<{
    id: string;
    imageUrl: string;
    timestamp: number;
    location?: { lat: number; lng: number; accuracy: number };
    featureId?: string;
  }>>([]);
  
  // Track which feature the camera should be linked to
  const [cameraLinkedFeatureId, setCameraLinkedFeatureId] = useState<string | null>(null);
  
  // Measurement tool states
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementType, setMeasurementType] = useState<'distance' | 'area' | null>(null);
  
  const mapRef = useRef<L.Map | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // GPS tracking
  useEffect(() => {
    let watchId: number;

    if (isGPSTracking && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || 0,
          };
          
          setGpsPosition(newPosition);
          setGpsAccuracyRadius(position.coords.accuracy);
          
          // Auto-center on first GPS fix
          if (mapRef.current && !gpsPosition) {
            mapRef.current.setView([newPosition.lat, newPosition.lng], 18);
          }
        },
        (error) => {
          console.error('GPS Error:', error);
          setIsGPSTracking(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 1000,
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isGPSTracking, gpsPosition]);

  // Listen for camera events from feature popups
  useEffect(() => {
    const handleCameraForFeature = (event: CustomEvent) => {
      const { featureId } = event.detail;
      handleTakePhoto(featureId);
    };

    window.addEventListener('triggerCameraForFeature', handleCameraForFeature as EventListener);

    return () => {
      window.removeEventListener('triggerCameraForFeature', handleCameraForFeature as EventListener);
    };
  }, []);

  const mapLayers = {
    satellite: {
      url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: '© Google Satellite',
    },
    hybrid: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '© Google Hybrid',
    },
    openstreet: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
    },
  };

  // Event handlers
  const handleFeatureDrawn = (feature: DrawnFeature) => {
    setDrawnFeatures(prev => [...prev, feature]);
    setUndoStack([]);
  };

  const handleFeatureDoubleClick = (feature: DrawnFeature) => {
    setSelectedFeature(feature);
    setIsAttributeFormOpen(true);
  };

  const handleAttributeSave = (attributes: Record<string, string>) => {
    if (selectedFeature) {
      const updatedFeature = {
        ...selectedFeature,
        properties: {
          ...selectedFeature.properties,
          attributes
        }
      };

      setDrawnFeatures(prev => 
        prev.map(f => f.id === selectedFeature.id ? updatedFeature : f)
      );
    }
  };

  const handleEraseMode = () => {
    setDrawingMode(drawingMode === 'erase' ? 'none' : 'erase');
  };

  const handleUndo = () => {
    if (drawnFeatures.length === 0) return;

    const lastFeature = drawnFeatures[drawnFeatures.length - 1];
    
    if (mapRef.current && lastFeature.layer && mapRef.current.hasLayer(lastFeature.layer)) {
      mapRef.current.removeLayer(lastFeature.layer);
    }

    setUndoStack(prev => [...prev, lastFeature]);
    setDrawnFeatures(prev => prev.slice(0, -1));
  };

  const handleFeatureClick = (feature: DrawnFeature) => {
    if (drawingMode === 'erase') {
      if (mapRef.current && feature.layer && mapRef.current.hasLayer(feature.layer)) {
        mapRef.current.removeLayer(feature.layer);
      }
      
      setDrawnFeatures(prev => prev.filter(f => f.id !== feature.id));
      setUndoStack(prev => [...prev, feature]);
    }
  };

  const handleToggleGPS = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by this browser.');
      return;
    }
    
    setIsGPSTracking(!isGPSTracking);
  };

  const handleResetView = () => {
    if (gpsPosition && mapRef.current) {
      mapRef.current.setView([gpsPosition.lat, gpsPosition.lng], 18);
    } else if (mapRef.current) {
      mapRef.current.setView([13.7563, 100.5018], 13);
    }
  };

  const handleStartMeasurement = (type: 'distance' | 'area') => {
    if (isMeasuring && measurementType === type) {
      setIsMeasuring(false);
      setMeasurementType(null);
    } else {
      setDrawingMode('none');
      setIsMeasuring(true);
      setMeasurementType(type);
    }
  };

  const handleMeasurementComplete = (result: {value: number; unit: string; type: 'distance' | 'area'}) => {
    setIsMeasuring(false);
    setMeasurementType(null);
  };

  const handleMeasurementCancel = () => {
    setIsMeasuring(false);
    setMeasurementType(null);
  };

  // Camera functionality with feature linking
  const handleTakePhoto = (featureId?: string) => {
    setCameraLinkedFeatureId(featureId || null);
    setIsCameraOpen(true);
  };

  const handlePhotoTaken = (photoData: {
    imageUrl: string;
    timestamp: number;
    location?: { lat: number; lng: number; accuracy: number };
    featureId?: string;
  }) => {
    const newPhoto = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...photoData,
      featureId: cameraLinkedFeatureId || photoData.featureId
    };
    
    setFieldPhotos(prev => [...prev, newPhoto]);
    
    // Show success notification with feature link info
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm';
    
    if (cameraLinkedFeatureId) {
      notification.innerHTML = `📸 Photo saved as ${cameraLinkedFeatureId}.jpg`;
    } else {
      notification.innerHTML = `📸 Photo saved with ${photoData.location ? 'GPS location' : 'timestamp'}`;
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
    
    // Reset camera link
    setCameraLinkedFeatureId(null);
  };

  const MapEventHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      mapRef.current = map;
      
      if (isMobile) {
        map.getContainer().style.touchAction = 'pan-x pan-y';
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
      }
    }, [map]);

    useMapEvents({
      rotate: (e) => {
        setMapRotation(e.target.getBearing());
      },
    });

    return null;
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[13.7563, 100.5018]}
        zoom={isMobile ? 15 : 13}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        preferCanvas={isMobile}
      >
        <MapEventHandler />
        
        {selectedLayers.map((layerType) => (
          <TileLayer
            key={layerType}
            url={mapLayers[layerType].url}
            attribution={mapLayers[layerType].attribution}
            opacity={layerType === selectedLayers[0] ? 1 : 0.7}
          />
        ))}

        {/* GPS Position Marker and Accuracy Circle */}
        {gpsPosition && isGPSTracking && (
          <>
            <Circle
              center={[gpsPosition.lat, gpsPosition.lng]}
              radius={gpsAccuracyRadius}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
                opacity: 0.5,
              }}
            />
            
            <Marker
              position={[gpsPosition.lat, gpsPosition.lng]}
              icon={createGPSIcon()}
            >
              <div className="bg-white p-3 rounded-lg shadow-lg min-w-[200px]">
                <div className="font-semibold text-blue-600 mb-2 flex items-center">
                  <span className="mr-2">📍</span>
                  Current Position
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Latitude:</strong> {gpsPosition.lat.toFixed(6)}</div>
                  <div><strong>Longitude:</strong> {gpsPosition.lng.toFixed(6)}</div>
                  <div><strong>Accuracy:</strong> ±{Math.round(gpsPosition.accuracy)}m</div>
                  {gpsPosition.heading !== null && gpsPosition.heading > 0 && (
                    <div><strong>Heading:</strong> {Math.round(gpsPosition.heading)}°</div>
                  )}
                  <div className="text-gray-500 text-xs mt-2">
                    Updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </Marker>
          </>
        )}

        {/* Only render ONE tool at a time */}
        {!isMeasuring && (
          <DrawingTools 
            drawingMode={drawingMode} 
            onDrawingComplete={() => setDrawingMode('none')}
            onFeatureDrawn={handleFeatureDrawn}
            onFeatureClick={handleFeatureClick}
            onFeatureDoubleClick={handleFeatureDoubleClick}
            drawnFeatures={drawnFeatures}
          />
        )}

        {isMeasuring && (
          <MeasurementTools
            isActive={isMeasuring}
            measurementType={measurementType}
            onMeasurementComplete={handleMeasurementComplete}
            onCancel={handleMeasurementCancel}
          />
        )}

        <VectorLayerRenderer vectorLayers={vectorLayers} />
      </MapContainer>

      {/* MOBILE LAYOUT */}
      {isMobile ? (
        <>
          <MobileDrawingTools
            drawingMode={drawingMode}
            onDrawingModeChange={setDrawingMode}
            onEraseMode={handleEraseMode}
            onUndo={handleUndo}
            canUndo={drawnFeatures.length > 0}
            onExport={() => setIsExportDialogOpen(true)}
          />

          <MobileBottomPanel
            selectedLayers={selectedLayers}
            onLayerChange={setSelectedLayers}
            vectorLayers={vectorLayers}
            onVectorLayersChange={setVectorLayers}
            gpsPosition={gpsPosition}
            isGPSTracking={isGPSTracking}
          />

          <div className="fixed top-4 right-4 z-[1500]">
            <MapControls 
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              onResetView={handleResetView}
              onToggleGPS={handleToggleGPS}
              isGPSActive={isGPSTracking}
              onStartMeasurement={handleStartMeasurement}
              isMeasuring={isMeasuring}
              measurementType={measurementType}
            />
          </div>

          {/* Mobile Photo Counter with Feature Links */}
          {fieldPhotos.length > 0 && (
            <div className="fixed top-4 left-4 z-[1200]">
              <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg px-3 py-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-gray-600 font-medium">📸 {fieldPhotos.length}</span>
                  {fieldPhotos.filter(p => p.featureId).length > 0 && (
                    <span className="text-blue-600 text-xs">
                      🔗 {fieldPhotos.filter(p => p.featureId).length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* DESKTOP LAYOUT */
        <>
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] max-w-[95vw]">
            <DraggableDrawingTools
              drawingMode={drawingMode}
              onDrawingModeChange={setDrawingMode}
              onEraseMode={handleEraseMode}
              onUndo={handleUndo}
              canUndo={drawnFeatures.length > 0}
              onExport={() => setIsExportDialogOpen(true)}
            />
          </div>

          <div className="fixed top-4 right-4 z-[1500]">
            <MapControls 
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
              onResetView={handleResetView}
              onToggleGPS={handleToggleGPS}
              isGPSActive={isGPSTracking}
              onStartMeasurement={handleStartMeasurement}
              isMeasuring={isMeasuring}
              measurementType={measurementType}
            />
          </div>

          <div className="fixed top-4 left-4 z-[1000]">
            <CompassRose rotation={mapRotation} />
          </div>

          <div className="fixed left-4 top-32 bottom-4 max-w-sm z-[1400] flex flex-col space-y-4">
            <VectorLayerManager
              vectorLayers={vectorLayers}
              onLayersChange={setVectorLayers}
            />
            <LayerSelector
              selectedLayers={selectedLayers}
              onLayerChange={setSelectedLayers}
            />
          </div>

          <div className="fixed bottom-4 right-4 z-[1300]">
            <GPSIndicator 
              position={gpsPosition} 
              isTracking={isGPSTracking}
            />
          </div>

          {/* Desktop Photo Counter with Feature Links */}
          {fieldPhotos.length > 0 && (
            <div className="fixed bottom-4 left-4 z-[1200]">
              <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg px-4 py-2">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span className="text-gray-600">Photos:</span>
                    <span className="font-semibold text-indigo-600">{fieldPhotos.length}</span>
                  </div>
                  {fieldPhotos.filter(p => p.featureId).length > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Linked:</span>
                      <span className="font-semibold text-blue-600">
                        {fieldPhotos.filter(p => p.featureId).length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      <AttributeForm
        feature={selectedFeature}
        isOpen={isAttributeFormOpen}
        onClose={() => {
          setIsAttributeFormOpen(false);
          setSelectedFeature(null);
        }}
        onSave={handleAttributeSave}
      />

      <DataExporter
        drawnFeatures={drawnFeatures}
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />

      {/* Camera Modal with Feature ID */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setCameraLinkedFeatureId(null);
        }}
        onPhotoTaken={handlePhotoTaken}
        currentLocation={gpsPosition}
        selectedFeatureId={cameraLinkedFeatureId}
      />

      {/* COPYRIGHT FOOTER */}
      <div className={`fixed bottom-0 left-0 right-0 z-[999] bg-black/70 backdrop-blur-sm text-white text-center ${isMobile ? 'py-1' : 'py-2'}`}>
        <p className={`${isMobile ? 'text-xs' : 'text-xs'} font-medium`}>
          Copyright © 2025 The Mapper Co., Ltd. : Dr. Taravudh Tipdecho
        </p>
      </div>
    </div>
  );
};

export default MapPlayground;