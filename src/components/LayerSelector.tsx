import React, { useState } from 'react';
import { Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { MapLayer } from '../types/map';

interface LayerSelectorProps {
  selectedLayers: MapLayer[];
  onLayerChange: (layers: MapLayer[]) => void;
}

const LayerSelector: React.FC<LayerSelectorProps> = ({
  selectedLayers,
  onLayerChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isMobile = window.innerWidth < 768;

  const layers = [
    { id: 'satellite' as MapLayer, name: 'Google Satellite', color: 'bg-green-500' },
    { id: 'hybrid' as MapLayer, name: 'Google Hybrid', color: 'bg-blue-500' },
    { id: 'openstreet' as MapLayer, name: 'OpenStreetMap', color: 'bg-orange-500' },
  ];

  const handleLayerToggle = (layerId: MapLayer) => {
    if (selectedLayers.includes(layerId)) {
      if (selectedLayers.length > 1) {
        onLayerChange(selectedLayers.filter(id => id !== layerId));
      }
    } else {
      onLayerChange([...selectedLayers, layerId]);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
      {/* Header - Collapsible on mobile */}
      <div 
        className={`p-3 border-b border-gray-200 ${isMobile ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors duration-200`}
        onClick={() => isMobile && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-700`} />
            <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm' : ''}`}>Map Layers</h3>
          </div>
          {isMobile && (
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {(!isMobile || isExpanded) && (
        <div className={`p-3 space-y-2 ${isMobile ? 'p-4' : ''}`}>
          {layers.map((layer) => (
            <label
              key={layer.id}
              className={`flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 ${
                isMobile ? 'min-h-[44px]' : ''
              }`}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={selectedLayers.includes(layer.id)}
                  onChange={() => handleLayerToggle(layer.id)}
                  className="sr-only"
                />
                <div className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} rounded border-2 border-gray-300 flex items-center justify-center ${
                  selectedLayers.includes(layer.id) ? layer.color : 'bg-white'
                }`}>
                  {selectedLayers.includes(layer.id) && (
                    <svg className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-white`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className={`font-medium text-gray-700 ${isMobile ? 'text-sm' : 'text-sm'}`}>{layer.name}</span>
            </label>
          ))}
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              Select multiple layers to overlay them
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerSelector;