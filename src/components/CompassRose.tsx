import React from 'react';
import { Compass } from 'lucide-react';

interface CompassRoseProps {
  rotation: number;
}

const CompassRose: React.FC<CompassRoseProps> = ({ rotation }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/95 backdrop-blur-md rounded-full shadow-lg p-4 w-20 h-20 flex items-center justify-center">
        <div className="relative">
          <Compass 
            className="h-10 w-10 text-gray-700" 
            style={{ transform: `rotate(${-rotation}deg)` }}
          />
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
            <div className="w-1 h-3 bg-red-500 rounded-full"></div>
          </div>
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-xs font-mono bg-white/95 backdrop-blur-md px-2 py-1 rounded text-gray-700">
          {Math.round(rotation)}°
        </span>
      </div>
    </div>
  );
};

export default CompassRose;