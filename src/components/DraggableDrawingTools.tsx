import React, { useState, useRef, useEffect } from 'react';
import { Move, Eraser, Undo2, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { DrawingMode } from '../types/map';

interface DraggableDrawingToolsProps {
  drawingMode: DrawingMode;
  onDrawingModeChange: (mode: DrawingMode) => void;
  onEraseMode: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onExport: () => void;
}

const DraggableDrawingTools: React.FC<DraggableDrawingToolsProps> = ({
  drawingMode,
  onDrawingModeChange,
  onEraseMode,
  onUndo,
  canUndo,
  onExport,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const tools = [
    { mode: 'marker' as DrawingMode, icon: '📍', label: 'Marker', color: 'hover:bg-red-100' },
    { mode: 'polyline' as DrawingMode, icon: '📏', label: 'Line', color: 'hover:bg-blue-100' },
    { mode: 'polygon' as DrawingMode, icon: '⬟', label: 'Polygon', color: 'hover:bg-green-100' },
    { mode: 'rectangle' as DrawingMode, icon: '⬜', label: 'Rectangle', color: 'hover:bg-yellow-100' },
    { mode: 'circle' as DrawingMode, icon: '⭕', label: 'Circle', color: 'hover:bg-purple-100' },
  ];

  const getInstructionText = () => {
    switch (drawingMode) {
      case 'marker':
        return '📍 Tap to place markers continuously';
      case 'polyline':
        return '📏 Tap points, double-tap to finish';
      case 'polygon':
        return '⬟ Tap vertices, double-tap to close';
      case 'rectangle':
        return '⬜ Tap 3 points: corner → side → height';
      case 'circle':
        return '⭕ Tap center, drag to set radius';
      case 'erase':
        return '🗑️ Tap features to delete';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 max-w-[90vw]">
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-3 border-b border-gray-200 ${
          isMobile ? 'cursor-pointer hover:bg-gray-50' : ''
        } transition-colors duration-200`}
        onClick={() => isMobile && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center space-x-2">
          {!isMobile && <Move className="h-4 w-4 text-gray-400" />}
          <span className={`text-gray-700 font-bold ${isMobile ? 'text-sm' : 'text-sm'}`}>
            🎯 Drawing Tools
          </span>
          {drawingMode !== 'none' && (
            <div className={`px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold ${
              isMobile ? 'text-xs' : 'text-xs'
            }`}>
              {drawingMode.toUpperCase()}
            </div>
          )}
        </div>
        
        {isMobile && (
          <button className="p-1 hover:bg-gray-100 rounded">
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Tool Buttons - Always visible on desktop, collapsible on mobile */}
      {(!isMobile || !isCollapsed) && (
        <div className={`p-3 ${isMobile ? 'p-4' : ''}`}>
          {/* Drawing Tools Row */}
          <div className={`flex space-x-2 mb-3 ${isMobile ? 'flex-wrap gap-2' : ''}`}>
            {tools.map((tool) => (
              <button
                key={tool.mode}
                onClick={() => onDrawingModeChange(drawingMode === tool.mode ? 'none' : tool.mode)}
                className={`${
                  isMobile ? 'p-3 min-w-[48px] min-h-[48px]' : 'p-3'
                } rounded-lg transition-all duration-200 flex items-center justify-center font-bold ${
                  drawingMode === tool.mode
                    ? 'bg-blue-500 text-white shadow-md scale-105 ring-2 ring-blue-300'
                    : `bg-gray-100 ${tool.color} text-gray-700 hover:scale-105 active:bg-gray-200 hover:shadow-md`
                }`}
                title={tool.label}
              >
                <span className={`${isMobile ? 'text-lg' : 'text-xl'}`}>{tool.icon}</span>
              </button>
            ))}
          </div>

          {/* Action Tools Row - REMOVED PHOTO BUTTON */}
          <div className={`flex space-x-2 pt-2 border-t border-gray-200 ${isMobile ? 'gap-2' : ''}`}>
            <button
              onClick={onEraseMode}
              className={`flex-1 flex items-center justify-center space-x-2 ${
                isMobile ? 'p-3 min-h-[48px]' : 'p-2'
              } rounded-lg transition-all duration-200 font-bold ${
                drawingMode === 'erase'
                  ? 'bg-red-500 text-white shadow-md ring-2 ring-red-300'
                  : 'bg-gray-100 hover:bg-red-100 text-gray-700 hover:scale-105 active:bg-gray-200 hover:shadow-md'
              }`}
              title="Eraser - Tap features to delete"
            >
              <Eraser className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              {!isMobile && <span className="text-xs font-bold">ERASE</span>}
            </button>
            
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex-1 flex items-center justify-center space-x-2 ${
                isMobile ? 'p-3 min-h-[48px]' : 'p-2'
              } rounded-lg transition-all duration-200 font-bold ${
                canUndo
                  ? 'bg-gray-100 hover:bg-orange-100 text-gray-700 hover:scale-105 active:bg-gray-200 hover:shadow-md'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              title="Undo last action"
            >
              <Undo2 className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              {!isMobile && <span className="text-xs font-bold">UNDO</span>}
            </button>

            <button
              onClick={onExport}
              className={`flex-1 flex items-center justify-center space-x-2 ${
                isMobile ? 'p-3 min-h-[48px]' : 'p-2'
              } rounded-lg transition-all duration-200 bg-gray-100 hover:bg-green-100 text-gray-700 hover:scale-105 active:bg-gray-200 hover:shadow-md font-bold`}
              title="Export data to CSV"
            >
              <Download className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              {!isMobile && <span className="text-xs font-bold">EXPORT</span>}
            </button>
          </div>
        </div>
      )}

      {/* Instructions - Only show when expanded and active */}
      {(!isMobile || !isCollapsed) && drawingMode !== 'none' && (
        <div className={`px-3 pb-3 ${isMobile ? 'px-4 pb-4' : ''}`}>
          <div className={`border rounded-lg p-3 ${
            drawingMode === 'erase' 
              ? 'bg-red-50 border-red-200' 
              : drawingMode === 'rectangle'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`font-bold ${
              drawingMode === 'erase' 
                ? 'text-red-700' 
                : drawingMode === 'rectangle'
                ? 'text-yellow-700'
                : 'text-blue-700'
            } ${isMobile ? 'text-sm' : 'text-sm'}`}>
              {getInstructionText()}
            </p>
            {!isMobile && (
              <p className={`text-xs mt-1 font-medium ${
                drawingMode === 'erase' 
                  ? 'text-red-600' 
                  : drawingMode === 'rectangle'
                  ? 'text-yellow-600'
                  : 'text-blue-600'
              }`}>
                {drawingMode === 'rectangle' 
                  ? 'Three-point method for precise rectangles'
                  : drawingMode === 'marker'
                  ? 'Tool stays active - keep tapping to add more'
                  : drawingMode === 'circle'
                  ? 'Tool stays active - create multiple circles'
                  : 'Press ESC to exit • Tap popup button for attributes'
                }
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableDrawingTools;