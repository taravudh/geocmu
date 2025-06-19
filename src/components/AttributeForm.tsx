import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Tag } from 'lucide-react';
import { DrawnFeature } from '../types/map';

interface AttributeFormProps {
  feature: DrawnFeature | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (attributes: Record<string, string>) => void;
}

const AttributeForm: React.FC<AttributeFormProps> = ({
  feature,
  isOpen,
  onClose,
  onSave,
}) => {
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
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

  // Common attribute suggestions based on feature type
  const getAttributeSuggestions = (type: string) => {
    const suggestions = {
      marker: ['name', 'type', 'description', 'category', 'status'],
      polyline: ['name', 'type', 'length', 'material', 'condition', 'usage'],
      polygon: ['landuse', 'name', 'area', 'zoning', 'ownership', 'description'],
      rectangle: ['landuse', 'building_type', 'name', 'area', 'floors', 'usage'],
      circle: ['name', 'type', 'radius', 'category', 'description', 'buffer_zone'],
    };
    return suggestions[type as keyof typeof suggestions] || ['name', 'type', 'description'];
  };

  useEffect(() => {
    if (feature && isOpen) {
      // Load existing attributes or set defaults
      const existingAttributes = feature.properties.attributes || {};
      setAttributes(existingAttributes);
    }
  }, [feature, isOpen]);

  const handleAddAttribute = () => {
    if (newKey.trim() && newValue.trim()) {
      setAttributes(prev => ({
        ...prev,
        [newKey.trim()]: newValue.trim()
      }));
      setNewKey('');
      setNewValue('');
    }
  };

  const handleRemoveAttribute = (key: string) => {
    setAttributes(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleUpdateAttribute = (key: string, value: string) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSave(attributes);
    onClose();
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!attributes[suggestion]) {
      setNewKey(suggestion);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKey.trim() && newValue.trim()) {
      handleAddAttribute();
    }
  };

  if (!isOpen || !feature) return null;

  const suggestions = getAttributeSuggestions(feature.type);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${
        isMobile ? 'max-w-sm max-h-[90vh]' : 'max-w-2xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Tag className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
              <div>
                <h2 className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>Feature Attributes</h2>
                <p className={`text-blue-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {feature.type.charAt(0).toUpperCase() + feature.type.slice(1)} • ID: {feature.id.slice(-8)}
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
          {/* Feature Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className={`font-semibold text-gray-800 mb-2 ${isMobile ? 'text-sm' : ''}`}>Feature Information</h3>
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 ${isMobile ? 'text-sm' : 'text-sm'}`}>
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium">{feature.type}</span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 font-medium">{feature.properties.created}</span>
              </div>
              {feature.properties.area && (
                <div>
                  <span className="text-gray-600">Area:</span>
                  <span className="ml-2 font-medium">{feature.properties.area.toFixed(2)} m²</span>
                </div>
              )}
              {feature.properties.distance && (
                <div>
                  <span className="text-gray-600">Distance:</span>
                  <span className="ml-2 font-medium">{feature.properties.distance.toFixed(2)} m</span>
                </div>
              )}
            </div>
          </div>

          {/* Attribute Suggestions */}
          <div className="mb-6">
            <h3 className={`font-semibold text-gray-800 mb-3 ${isMobile ? 'text-sm' : ''}`}>Quick Add Attributes</h3>
            <div className={`flex flex-wrap gap-2 ${isMobile ? 'gap-3' : ''}`}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={!!attributes[suggestion]}
                  className={`px-3 py-2 rounded-full font-medium transition-colors duration-200 ${
                    isMobile ? 'text-sm min-h-[44px]' : 'text-sm'
                  } ${
                    attributes[suggestion]
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Existing Attributes */}
          {Object.keys(attributes).length > 0 && (
            <div className="mb-6">
              <h3 className={`font-semibold text-gray-800 mb-3 ${isMobile ? 'text-sm' : ''}`}>Current Attributes</h3>
              <div className="space-y-3">
                {Object.entries(attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
                    <div className={`flex-1 ${isMobile ? 'space-y-2' : 'grid grid-cols-2 gap-3'}`}>
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          const oldValue = attributes[key];
                          setAttributes(prev => {
                            const updated = { ...prev };
                            delete updated[key];
                            if (newKey.trim()) {
                              updated[newKey.trim()] = oldValue;
                            }
                            return updated;
                          });
                        }}
                        className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium ${
                          isMobile ? 'text-base w-full' : 'text-sm'
                        }`}
                        placeholder="Attribute name"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleUpdateAttribute(key, e.target.value)}
                        className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isMobile ? 'text-base w-full' : 'text-sm'
                        }`}
                        placeholder="Attribute value"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveAttribute(key)}
                      className={`p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors duration-200 ${
                        isMobile ? 'min-w-[44px] min-h-[44px]' : ''
                      }`}
                    >
                      <Trash2 className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Attribute */}
          <div className="mb-6">
            <h3 className={`font-semibold text-gray-800 mb-3 ${isMobile ? 'text-sm' : ''}`}>Add New Attribute</h3>
            <div className={`${isMobile ? 'space-y-3' : 'flex items-center space-x-3'}`}>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile ? 'text-base w-full' : 'flex-1 text-sm'
                }`}
                placeholder="Attribute name (e.g., landuse, building_type)"
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile ? 'text-base w-full' : 'flex-1 text-sm'
                }`}
                placeholder="Attribute value (e.g., residential, commercial)"
              />
              <button
                onClick={handleAddAttribute}
                disabled={!newKey.trim() || !newValue.trim()}
                className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center ${
                  isMobile ? 'w-full py-3 px-4' : 'p-2'
                }`}
              >
                <Plus className={`${isMobile ? 'h-5 w-5 mr-2' : 'h-4 w-4'}`} />
                {isMobile && <span className="font-medium">Add Attribute</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`bg-gray-50 px-4 py-4 flex ${isMobile ? 'flex-col space-y-3' : 'justify-end space-x-3'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 ${
              isMobile ? 'w-full min-h-[48px] text-base' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 ${
              isMobile ? 'w-full min-h-[48px] text-base' : ''
            }`}
          >
            <Save className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
            <span className="font-medium">Save Attributes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttributeForm;