import React, { useState, useRef } from 'react';
import { Upload, FileText, Eye, EyeOff, Trash2, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { VectorLayer } from '../types/map';

interface VectorLayerManagerProps {
  vectorLayers: VectorLayer[];
  onLayersChange: (layers: VectorLayer[]) => void;
}

const VectorLayerManager: React.FC<VectorLayerManagerProps> = ({
  vectorLayers,
  onLayersChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = window.innerWidth < 768;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const geoJsonData = JSON.parse(content);
        
        // Validate GeoJSON structure
        if (!geoJsonData.type || (geoJsonData.type !== 'FeatureCollection' && geoJsonData.type !== 'Feature')) {
          throw new Error('Invalid GeoJSON format');
        }

        const newLayer: VectorLayer = {
          id: Date.now().toString(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          data: geoJsonData,
          visible: true,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          opacity: 0.7,
          type: 'geojson',
        };

        onLayersChange([...vectorLayers, newLayer]);
      } catch (error) {
        alert('Error parsing JSON file. Please ensure it\'s a valid GeoJSON format.');
        console.error('JSON parsing error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    onLayersChange(
      vectorLayers.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const removeLayer = (layerId: string) => {
    onLayersChange(vectorLayers.filter(layer => layer.id !== layerId));
  };

  const updateLayerColor = (layerId: string, color: string) => {
    onLayersChange(
      vectorLayers.map(layer =>
        layer.id === layerId ? { ...layer, color } : layer
      )
    );
  };

  const updateLayerOpacity = (layerId: string, opacity: number) => {
    onLayersChange(
      vectorLayers.map(layer =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
  };

  const exportLayer = (layer: VectorLayer) => {
    const dataStr = JSON.stringify(layer.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${layer.name}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div 
        className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-700`} />
            <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm' : ''}`}>Vector Layers</h3>
            {vectorLayers.length > 0 && (
              <span className={`bg-blue-100 text-blue-800 px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>
                {vectorLayers.length}
              </span>
            )}
          </div>
          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className={`p-3 ${isMobile ? 'p-4' : ''}`}>
          {/* Upload Button */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.geojson"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-gray-600 hover:text-blue-600 ${
                isMobile ? 'min-h-[44px]' : ''
              }`}
            >
              <Upload className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Upload GeoJSON</span>
            </button>
            <p className={`text-gray-500 mt-2 text-center ${isMobile ? 'text-xs' : 'text-xs'}`}>
              Supports .json and .geojson files
            </p>
          </div>

          {/* Layer List */}
          {vectorLayers.length > 0 ? (
            <div className={`space-y-3 ${isMobile ? 'max-h-48' : 'max-h-64'} overflow-y-auto`}>
              {vectorLayers.map((layer) => (
                <div key={layer.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <button
                        onClick={() => toggleLayerVisibility(layer.id)}
                        className={`p-1 rounded transition-colors duration-200 ${
                          layer.visible ? 'text-blue-600 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-200'
                        } ${isMobile ? 'min-w-[32px] min-h-[32px]' : ''}`}
                      >
                        {layer.visible ? <Eye className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} /> : <EyeOff className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />}
                      </button>
                      <span className={`font-medium text-gray-800 truncate ${isMobile ? 'text-sm' : 'text-sm'}`} title={layer.name}>
                        {layer.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => exportLayer(layer)}
                        className={`p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors duration-200 ${
                          isMobile ? 'min-w-[32px] min-h-[32px]' : ''
                        }`}
                        title="Export layer"
                      >
                        <Download className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                      </button>
                      <button
                        onClick={() => removeLayer(layer.id)}
                        className={`p-1 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded transition-colors duration-200 ${
                          isMobile ? 'min-w-[32px] min-h-[32px]' : ''
                        }`}
                        title="Remove layer"
                      >
                        <Trash2 className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Layer Controls */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className={`text-gray-600 w-12 ${isMobile ? 'text-xs' : 'text-xs'}`}>Color:</label>
                      <input
                        type="color"
                        value={layer.color}
                        onChange={(e) => updateLayerColor(layer.id, e.target.value)}
                        className={`rounded border border-gray-300 cursor-pointer ${isMobile ? 'w-10 h-8' : 'w-8 h-6'}`}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className={`text-gray-600 w-12 ${isMobile ? 'text-xs' : 'text-xs'}`}>Opacity:</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity}
                        onChange={(e) => updateLayerOpacity(layer.id, parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className={`text-gray-600 w-8 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Layer Info */}
                  <div className={`mt-2 text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    {layer.data.type === 'FeatureCollection' 
                      ? `${layer.data.features?.length || 0} features`
                      : '1 feature'
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileText className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} mx-auto mb-2 opacity-50`} />
              <p className={`${isMobile ? 'text-sm' : 'text-sm'}`}>No vector layers loaded</p>
              <p className={`mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>Upload GeoJSON files to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VectorLayerManager;