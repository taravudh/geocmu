import React from 'react';
import { Plus, Minus, Navigation, RotateCcw, Ruler, Square } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleGPS: () => void;
  isGPSActive: boolean;
  onStartMeasurement: (type: 'distance' | 'area') => void;
  isMeasuring: boolean;
  measurementType: 'distance' | 'area' | null;
}

const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleGPS,
  isGPSActive,
  onStartMeasurement,
  isMeasuring,
  measurementType,
}) => {
  const isMobile = window.innerWidth < 768;
  const buttonSize = isMobile ? 'w-11 h-11' : 'w-12 h-12';
  const iconSize = isMobile ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} z-[1000] flex flex-col space-y-2`}>
      {/* Zoom Controls */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={onZoomIn}
          className={`block ${buttonSize} flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 border-b border-gray-200 active:bg-gray-200`}
        >
          <Plus className={`${iconSize} text-gray-700`} />
        </button>
        <button
          onClick={onZoomOut}
          className={`block ${buttonSize} flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 active:bg-gray-200`}
        >
          <Minus className={`${iconSize} text-gray-700`} />
        </button>
      </div>

      {/* GPS and Reset Controls */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={onToggleGPS}
          className={`block ${buttonSize} flex items-center justify-center transition-all duration-200 border-b border-gray-200 active:scale-95 ${
            isGPSActive 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'hover:bg-gray-100 text-gray-700 active:bg-gray-200'
          }`}
          title="Toggle GPS Tracking"
        >
          <Navigation className={`${iconSize} ${isGPSActive ? 'animate-pulse' : ''}`} />
        </button>
        <button
          onClick={onResetView}
          className={`block ${buttonSize} flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 text-gray-700 active:bg-gray-200`}
          title="Reset View"
        >
          <RotateCcw className={iconSize} />
        </button>
      </div>

      {/* Measurement Tools */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => onStartMeasurement('distance')}
          className={`block ${buttonSize} flex items-center justify-center transition-all duration-200 border-b border-gray-200 active:scale-95 ${
            isMeasuring && measurementType === 'distance'
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'hover:bg-gray-100 text-gray-700 active:bg-gray-200'
          }`}
          title="Measure Distance"
        >
          <Ruler className={iconSize} />
        </button>
        <button
          onClick={() => onStartMeasurement('area')}
          className={`block ${buttonSize} flex items-center justify-center transition-all duration-200 active:scale-95 ${
            isMeasuring && measurementType === 'area'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'hover:bg-gray-100 text-gray-700 active:bg-gray-200'
          }`}
          title="Measure Area"
        >
          <Square className={iconSize} />
        </button>
      </div>
    </div>
  );
};

export default MapControls;