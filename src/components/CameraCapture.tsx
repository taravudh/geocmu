import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCcw, Check, Download, MapPin } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (photoData: { 
    imageUrl: string; 
    timestamp: number; 
    location?: { lat: number; lng: number; accuracy: number };
    featureId?: string;
  }) => void;
  currentLocation?: { lat: number; lng: number; accuracy: number } | null;
  selectedFeatureId?: string | null; // NEW: Pass the selected feature ID
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onPhotoTaken,
  currentLocation,
  selectedFeatureId,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen, facingMode]);

  // Generate filename using Feature ID or fallback to timestamp
  const generatePhotoFilename = (): string => {
    if (selectedFeatureId) {
      // Use feature ID as filename
      return `${selectedFeatureId}.jpg`;
    } else {
      // Fallback to Thai time if no feature selected
      const now = new Date();
      const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      
      const year = thaiTime.getUTCFullYear();
      const month = String(thaiTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(thaiTime.getUTCDate()).padStart(2, '0');
      const hours = String(thaiTime.getUTCHours()).padStart(2, '0');
      const minutes = String(thaiTime.getUTCMinutes()).padStart(2, '0');
      const seconds = String(thaiTime.getUTCSeconds()).padStart(2, '0');
      
      return `field-photo-${year}-${month}-${day}_${hours}-${minutes}-${seconds}.jpg`;
    }
  };

  // Get Thai local time display string
  const getThaiTimeDisplay = (): string => {
    const now = new Date();
    
    return now.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const initializeCamera = async () => {
    try {
      setError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: isMobile ? 1280 : 1920 },
          height: { ideal: isMobile ? 720 : 1080 },
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      let errorMessage = 'Failed to access camera. ';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera permissions in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported on this device.';
        } else {
          errorMessage += err.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    
    setTimeout(() => setIsCapturing(false), 200);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const savePhoto = () => {
    if (!capturedImage) return;

    const photoData = {
      imageUrl: capturedImage,
      timestamp: Date.now(),
      location: currentLocation || undefined,
      featureId: selectedFeatureId || undefined
    };

    onPhotoTaken(photoData);
    onClose();
  };

  const downloadPhoto = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.download = generatePhotoFilename(); // Use feature ID or Thai time
    link.href = capturedImage;
    link.click();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className={`p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200 ${
              isMobile ? 'min-w-[44px] min-h-[44px]' : ''
            }`}
          >
            <X className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-white`} />
          </button>
          
          <div className="text-center">
            <h2 className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>
              📸 Field Camera
            </h2>
            {selectedFeatureId && (
              <div className="flex items-center justify-center space-x-1 mt-1">
                <span className="text-xs text-blue-400 font-medium">
                  🔗 Feature: {selectedFeatureId.slice(-8)}
                </span>
              </div>
            )}
            {currentLocation && (
              <div className="flex items-center justify-center space-x-1 mt-1">
                <MapPin className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400 font-medium">GPS Location</span>
              </div>
            )}
          </div>

          {!capturedImage && (
            <button
              onClick={switchCamera}
              className={`p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200 ${
                isMobile ? 'min-w-[44px] min-h-[44px]' : ''
              }`}
              title="Switch Camera"
            >
              <RotateCcw className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-white`} />
            </button>
          )}
        </div>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full flex items-center justify-center">
        {error ? (
          <div className="text-center text-white p-6">
            <div className="text-6xl mb-4">📷</div>
            <h3 className={`font-bold mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>Camera Error</h3>
            <p className={`text-gray-300 mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>{error}</p>
            <button
              onClick={initializeCamera}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        ) : capturedImage ? (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            
            {/* Photo Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={retakePhoto}
                  className={`flex items-center space-x-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 ${
                    isMobile ? 'min-h-[48px]' : ''
                  }`}
                >
                  <RotateCcw className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  <span>Retake</span>
                </button>

                <button
                  onClick={downloadPhoto}
                  className={`flex items-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 ${
                    isMobile ? 'min-h-[48px]' : ''
                  }`}
                >
                  <Download className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  <span>Download</span>
                </button>

                <button
                  onClick={savePhoto}
                  className={`flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 ${
                    isMobile ? 'min-h-[48px]' : ''
                  }`}
                >
                  <Check className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  <span>Save Photo</span>
                </button>
              </div>

              {/* Photo Info */}
              <div className="mt-3 text-center space-y-1">
                {selectedFeatureId && (
                  <div className={`text-blue-400 font-mono ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    📁 Filename: {generatePhotoFilename()}
                  </div>
                )}
                <div className={`text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  📅 {getThaiTimeDisplay()} (Thai Time)
                </div>
                {currentLocation && (
                  <div className={`text-green-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)} (±{Math.round(currentLocation.accuracy)}m)
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Capture Animation Overlay */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white opacity-50 animate-pulse"></div>
            )}

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-6">
              <div className="flex items-center justify-center">
                <button
                  onClick={capturePhoto}
                  disabled={!stream}
                  className={`${
                    isMobile ? 'w-20 h-20' : 'w-16 h-16'
                  } bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 active:scale-95`}
                >
                  <Camera className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} text-gray-700`} />
                </button>
              </div>

              {/* Camera Info */}
              <div className="mt-4 text-center space-y-1">
                <div className={`text-white ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  📷 {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
                </div>
                {selectedFeatureId && (
                  <div className={`text-blue-400 font-mono ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    🔗 Linked to Feature: {selectedFeatureId.slice(-8)}
                  </div>
                )}
                <div className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  🕐 {getThaiTimeDisplay()} (Thai Time)
                </div>
                {currentLocation && (
                  <div className={`text-green-400 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    📍 GPS: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraCapture;