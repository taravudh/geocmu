import React from 'react';
import { MapPin, Satellite } from 'lucide-react';
import { GPSPosition } from '../types/map';

interface GPSIndicatorProps {
  position: GPSPosition | null;
  isTracking: boolean;
}

const GPSIndicator: React.FC<GPSIndicatorProps> = ({ position, isTracking }) => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <div className={`bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-3 ${
      isMobile ? 'min-w-[200px] text-sm' : 'min-w-[250px]'
    }`}>
      <div className="flex items-center space-x-2 mb-3">
        <Satellite className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} ${isTracking ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
        <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm' : ''}`}>GPS Status</h3>
      </div>
      
      {isTracking ? (
        position ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-500`} />
              <span className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>Position Found</span>
            </div>
            <div className={`font-mono space-y-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              <div>Lat: {position.lat.toFixed(6)}</div>
              <div>Lng: {position.lng.toFixed(6)}</div>
              <div>Accuracy: ±{Math.round(position.accuracy)}m</div>
              {position.heading !== null && (
                <div>Heading: {Math.round(position.heading)}°</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className={`animate-spin rounded-full border-2 border-blue-500 border-t-transparent ${
              isMobile ? 'h-3 w-3' : 'h-4 w-4'
            }`}></div>
            <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Searching for GPS...</span>
          </div>
        )
      ) : (
        <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>GPS tracking disabled</div>
      )}
    </div>
  );
};

export default GPSIndicator;