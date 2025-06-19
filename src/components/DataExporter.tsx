import React, { useState, useEffect } from 'react';
import { Download, FileText, Database, Filter, X } from 'lucide-react';
import { DrawnFeature } from '../types/map';

interface DataExporterProps {
  drawnFeatures: DrawnFeature[];
  isOpen: boolean;
  onClose: () => void;
}

const DataExporter: React.FC<DataExporterProps> = ({
  drawnFeatures,
  isOpen,
  onClose,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['marker', 'polyline', 'polygon', 'rectangle', 'circle']);
  const [includeGeometry, setIncludeGeometry] = useState(true);
  const [includeAttributes, setIncludeAttributes] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getFeaturesByType = () => {
    const grouped = {
      point: drawnFeatures.filter(f => f.type === 'marker'),
      line: drawnFeatures.filter(f => f.type === 'polyline'),
      polygon: drawnFeatures.filter(f => ['polygon', 'rectangle', 'circle'].includes(f.type)),
    };
    return grouped;
  };

  const formatCoordinates = (feature: DrawnFeature): string => {
    if (feature.type === 'marker') {
      return `"POINT(${feature.coordinates[0][0]} ${feature.coordinates[0][1]})"`;
    } else if (feature.type === 'polyline') {
      const coords = feature.coordinates.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      return `"LINESTRING(${coords})"`;
    } else if (feature.type === 'circle') {
      const center = feature.coordinates[0];
      const radius = feature.properties.radius || 100;
      return `"POINT(${center[0]} ${center[1]})" BUFFER ${radius}`;
    } else {
      // Polygon or rectangle
      const coords = feature.coordinates[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      return `"POLYGON((${coords}))"`;
    }
  };

  const getAllAttributeKeys = (features: DrawnFeature[]): string[] => {
    const keys = new Set<string>();
    features.forEach(feature => {
      if (feature.properties.attributes) {
        Object.keys(feature.properties.attributes).forEach(key => keys.add(key));
      }
    });
    return Array.from(keys).sort();
  };

  const generateCSV = (features: DrawnFeature[], type: 'point' | 'line' | 'polygon'): string => {
    if (features.length === 0) return '';

    const attributeKeys = getAllAttributeKeys(features);
    
    // Check if any features have these properties
    const hasArea = features.some(f => f.properties?.area !== undefined);
    const hasDistance = features.some(f => f.properties?.distance !== undefined);
    const hasRadius = features.some(f => f.properties?.radius !== undefined);
    
    // CSV Headers
    const headers = [
      'id',
      'feature_type',
      'created_date',
      'created_time',
      ...(includeGeometry ? ['geometry_wkt'] : []),
      ...(hasArea ? ['area_m2'] : []),
      ...(hasDistance ? ['length_m'] : []),
      ...(hasRadius ? ['radius_m'] : []),
      ...(includeAttributes ? attributeKeys : [])
    ];

    // CSV Rows
    const rows = features.map(feature => {
      const createdDate = new Date(feature.timestamp);
      const row = [
        feature.id,
        feature.type,
        createdDate.toLocaleDateString(),
        createdDate.toLocaleTimeString(),
        ...(includeGeometry ? [formatCoordinates(feature)] : []),
        ...(hasArea ? [feature.properties?.area?.toFixed(2) || ''] : []),
        ...(hasDistance ? [feature.properties?.distance?.toFixed(2) || ''] : []),
        ...(hasRadius ? [feature.properties?.radius?.toFixed(2) || ''] : []),
        ...(includeAttributes ? attributeKeys.map(key => 
          feature.properties.attributes?.[key] || ''
        ) : [])
      ];
      
      // Escape commas and quotes in CSV values, ensure UTF-8 encoding
      return row.map(value => {
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
    });

    // Add UTF-8 BOM for proper character encoding
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return '\uFEFF' + csvContent; // UTF-8 BOM
  };

  const handleExport = () => {
    const grouped = getFeaturesByType();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

    // Export each geometry type separately
    Object.entries(grouped).forEach(([geometryType, features]) => {
      if (features.length > 0) {
        const csv = generateCSV(features, geometryType as 'point' | 'line' | 'polygon');
        if (csv) {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `map_features_${geometryType}_${timestamp}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    });

    onClose();
  };

  const handleExportAll = () => {
    const allFeatures = drawnFeatures.filter(f => selectedTypes.includes(f.type));
    if (allFeatures.length === 0) return;

    const csv = generateCSV(allFeatures, 'point'); // Use generic format
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `map_features_all_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  if (!isOpen) return null;

  const grouped = getFeaturesByType();
  const totalFeatures = drawnFeatures.length;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${
        isMobile ? 'max-w-sm max-h-[90vh]' : 'max-w-3xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
              <div>
                <h2 className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>Export Data</h2>
                <p className={`text-green-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Export {totalFeatures} features to CSV format
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 hover:bg-white/20 rounded-lg transition-colors duration-200 ${
                isMobile ? 'min-w-[44px] min-h-[44px]' : ''
              }`}
            >
              <X className={`${isMobile ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'p-4' : 'p-6'} max-h-[60vh] overflow-y-auto mobile-panel`}>
          {/* Feature Summary */}
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 mb-6`}>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className={`font-bold text-blue-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{grouped.point.length}</div>
              <div className={`text-blue-700 ${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Points</div>
              <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>Markers</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className={`font-bold text-green-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{grouped.line.length}</div>
              <div className={`text-green-700 ${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Lines</div>
              <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>Polylines</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className={`font-bold text-purple-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{grouped.polygon.length}</div>
              <div className={`text-purple-700 ${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Polygons</div>
              <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>Areas & Shapes</div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-6">
            <div>
              <h3 className={`font-semibold text-gray-800 mb-3 flex items-center ${isMobile ? 'text-sm' : ''}`}>
                <Filter className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
                Export Options
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={includeGeometry}
                      onChange={(e) => setIncludeGeometry(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Include Geometry (WKT format)</span>
                  </label>
                  <p className={`text-gray-500 ml-6 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    Exports coordinates in Well-Known Text format for GIS applications
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={includeAttributes}
                      onChange={(e) => setIncludeAttributes(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Include Custom Attributes</span>
                  </label>
                  <p className={`text-gray-500 ml-6 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    Exports all custom attributes with proper UTF-8 encoding
                  </p>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className={`font-semibold text-gray-800 mb-3 ${isMobile ? 'text-sm' : ''}`}>CSV Preview</h3>
              <div className={`bg-gray-50 rounded-lg p-4 font-mono overflow-x-auto ${isMobile ? 'text-xs' : 'text-xs'}`}>
                <div className="text-gray-600 mb-2">Sample columns that will be included:</div>
                <div className="text-gray-800">
                  id, feature_type, created_date, created_time
                  {includeGeometry && ', geometry_wkt'}
                  {', area_m2, length_m, radius_m (when applicable)'}
                  {includeAttributes && ', [custom_attributes...]'}
                </div>
                <div className={`text-green-600 mt-2 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  ✓ UTF-8 BOM included for proper character display
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`bg-gray-50 px-4 py-4 flex ${isMobile ? 'flex-col space-y-3' : 'justify-between'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 ${
              isMobile ? 'w-full min-h-[48px] text-base' : ''
            }`}
          >
            Cancel
          </button>
          
          <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'space-x-3'}`}>
            <button
              onClick={handleExport}
              disabled={totalFeatures === 0}
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2 ${
                isMobile ? 'w-full min-h-[48px] text-base' : ''
              }`}
            >
              <Download className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              <span className="font-medium">Export by Type</span>
            </button>
            
            <button
              onClick={handleExportAll}
              disabled={totalFeatures === 0}
              className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2 ${
                isMobile ? 'w-full min-h-[48px] text-base' : ''
              }`}
            >
              <FileText className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              <span className="font-medium">Export All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExporter;