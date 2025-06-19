import React, { useState } from 'react';
import { X, MapPin, Minus, Square, Circle, Trash2, Undo2, Download } from 'lucide-react';
import { DrawingMode } from '../types/map';

interface MobileDrawingToolsProps {
  drawingMode: DrawingMode;
  onDrawingModeChange: (mode: DrawingMode) => void;
  onEraseMode: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onExport: () => void;
}

const MobileDrawingTools: React.FC<MobileDrawingToolsProps> = ({
  drawingMode,
  onDrawingModeChange,
  onEraseMode,
  onUndo,
  canUndo,
  onExport,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tools = [
    { mode: 'marker' as DrawingMode, icon: MapPin, label: 'Point', color: 'bg-red-500', activeColor: 'bg-red-600' },
    { mode: 'polyline' as DrawingMode, icon: Minus, label: 'Line', color: 'bg-blue-500', activeColor: 'bg-blue-600' },
    { mode: 'polygon' as DrawingMode, icon: Square, label: 'Area', color: 'bg-green-500', activeColor: 'bg-green-600' },
    { mode: 'rectangle' as DrawingMode, icon: Square, label: 'Rect', color: 'bg-yellow-500', activeColor: 'bg-yellow-600' },
    { mode: 'circle' as DrawingMode, icon: Circle, label: 'Circle', color: 'bg-purple-500', activeColor: 'bg-purple-600' },
  ];

  return (
    <>
      {/* Floating Action Button - Much Smaller */}
      <div className="fixed bottom-20 right-3 z-[2000]">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-300 ${
            drawingMode !== 'none' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          {isExpanded ? (
            <X className="h-4 w-4" />
          ) : drawingMode !== 'none' ? (
            <div className="text-xs">
              {drawingMode === 'marker' && '📍'}
              {drawingMode === 'polyline' && '📏'}
              {drawingMode === 'polygon' && '⬟'}
              {drawingMode === 'rectangle' && '⬜'}
              {drawingMode === 'circle' && '⭕'}
              {drawingMode === 'erase' && '🗑️'}
            </div>
          ) : (
            <div className="text-sm">🎯</div>
          )}
        </button>
      </div>

      {/* Expanded Tool Panel - Much Smaller */}
      {isExpanded && (
        <div className="fixed inset-0 z-[1999] bg-black/40 backdrop-blur-sm">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl max-h-[40vh] overflow-hidden">
            {/* Header - Minimal */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-800">Tools</h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            {/* Current Mode Status - Very Compact */}
            {drawingMode !== 'none' && (
              <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-blue-800 capitalize font-medium">{drawingMode} Active</div>
                  </div>
                  <button
                    onClick={() => {
                      onDrawingModeChange('none');
                      setIsExpanded(false);
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}

            {/* Tool Grid - Much Smaller */}
            <div className="p-3 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 mb-3">
                {tools.map((tool) => {
                  const IconComponent = tool.icon;
                  const isActive = drawingMode === tool.mode;
                  
                  return (
                    <button
                      key={tool.mode}
                      onClick={() => {
                        onDrawingModeChange(isActive ? 'none' : tool.mode);
                        setIsExpanded(false);
                      }}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? `${tool.activeColor} text-white shadow-md scale-105`
                          : `${tool.color} text-white hover:scale-105 active:scale-95`
                      }`}
                    >
                      <IconComponent className="h-4 w-4 mx-auto mb-1" />
                      <div className="text-xs font-medium">{tool.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons - REMOVED PHOTO BUTTON */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    onEraseMode();
                    setIsExpanded(false);
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 flex flex-col items-center ${
                    drawingMode === 'erase'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <Trash2 className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Erase</span>
                </button>

                <button
                  onClick={() => {
                    onUndo();
                    setIsExpanded(false);
                  }}
                  disabled={!canUndo}
                  className={`p-2 rounded-lg transition-all duration-200 flex flex-col items-center ${
                    canUndo
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Undo2 className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Undo</span>
                </button>

                <button
                  onClick={() => {
                    onExport();
                    setIsExpanded(false);
                  }}
                  className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-all duration-200 flex flex-col items-center"
                >
                  <Download className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileDrawingTools;