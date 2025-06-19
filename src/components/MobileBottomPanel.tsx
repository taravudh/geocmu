import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Layers, FileText, Satellite, MapPin } from 'lucide-react';
import { MapLayer, GPSPosition, VectorLayer } from '../types/map';
import LayerSelector from './LayerSelector';
import VectorLayerManager from './VectorLayerManager';
import GPSIndicator from './GPSIndicator';

interface MobileBottomPanelProps {
  selectedLayers: MapLayer[];
  onLayerChange: (layers: MapLayer[]) => void;
  vectorLayers: VectorLayer[];
  onVectorLayersChange: (layers: VectorLayer[]) => void;
  gpsPosition: GPSPosition | null;
  isGPSTracking: boolean;
}

const MobileBottomPanel: React.FC<MobileBottomPanelProps> = ({
  selectedLayers,
  onLayerChange,
  vectorLayers,
  onVectorLayersChange,
  gpsPosition,
  isGPSTracking,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'vectors' | 'gps'>('layers');

  const tabs = [
    { id: 'layers' as const, label: 'Map Layers', icon: Layers, count: selectedLayers.length },
    { id: 'vectors' as const, label: 'Data Layers', icon: FileText, count: vectorLayers.length },
    { id: 'gps' as const, label: 'GPS Status', icon: Satellite, count: isGPSTracking ? 1 : 0 },
  ];

  return (
    <>
      {/* Collapsed State - Bottom Tab Bar */}
      {!isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 z-[1500] bg-white border-t border-gray-200 shadow-lg">
          <div className="flex">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsExpanded(true);
                  }}
                  className={`flex-1 p-4 flex flex-col items-center space-y-1 transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 border-t-2 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <IconComponent className="h-5 w-5" />
                    {tab.count > 0 && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {tab.count}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded State - Full Panel */}
      {isExpanded && (
        <div className="fixed inset-0 z-[1999] bg-black/50 backdrop-blur-sm">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden">
            {/* Header with Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-gray-800">Map Controls</h2>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronDown className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative">
                        <IconComponent className="h-5 w-5" />
                        {tab.count > 0 && (
                          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                            {tab.count}
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {activeTab === 'layers' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Base Map Layers</h3>
                  <LayerSelector
                    selectedLayers={selectedLayers}
                    onLayerChange={onLayerChange}
                  />
                </div>
              )}

              {activeTab === 'vectors' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Data Layers</h3>
                  <VectorLayerManager
                    vectorLayers={vectorLayers}
                    onLayersChange={onVectorLayersChange}
                  />
                </div>
              )}

              {activeTab === 'gps' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">GPS Information</h3>
                  <GPSIndicator
                    position={gpsPosition}
                    isTracking={isGPSTracking}
                  />
                  
                  {gpsPosition && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                      <h4 className="font-bold text-blue-800 mb-3">Location Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Latitude:</span>
                          <span className="font-mono text-blue-900">{gpsPosition.lat.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Longitude:</span>
                          <span className="font-mono text-blue-900">{gpsPosition.lng.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Accuracy:</span>
                          <span className="font-mono text-blue-900">±{Math.round(gpsPosition.accuracy)}m</span>
                        </div>
                        {gpsPosition.heading !== null && gpsPosition.heading > 0 && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Heading:</span>
                            <span className="font-mono text-blue-900">{Math.round(gpsPosition.heading)}°</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isGPSTracking && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      <div className="text-center text-gray-600">
                        <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">GPS tracking is disabled</p>
                        <p className="text-sm mt-1">Enable GPS from the map controls to track your location</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomPanel;