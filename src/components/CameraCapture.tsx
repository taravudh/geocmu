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
  selectedFeatureId?: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isMobile, setIsMobile] = useState(false);

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

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError(null);

      // Mobile-optimized camera constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          // Mobile-specific optimizations for stability
          width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1920 },
          height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 1080 },
          // Reduce frame rate for stability on mobile
          frameRate: isMobile ? { ideal: 15, max: 30 } : { ideal: 30 },
          // Enable image stabilization if available
          ...(isMobile && {
            advanced: [
              { imageStabilization: true },
              { focusMode: 'continuous' },
              { whiteBalanceMode: 'continuous' }
            ]
          })
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Mobile-specific video settings for stability
        if (isMobile) {
          videoRef.current.playsInline = true;
          videoRef.current.muted = true;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');

          // Wait for video to be ready before allowing capture
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play();
            }
          };
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      let errorMessage = 'Camera access denied. ';

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

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setError(null);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Ensure video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.warn('Video not ready for capture');
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mobile-specific image capture optimizations
    if (isMobile) {
      // Enable image smoothing for better quality
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
    }

    // Capture the frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image with high quality for mobile
    const imageDataUrl = canvas.toDataURL('image/jpeg', isMobile ? 0.9 : 0.8);
    setCapturedImage(imageDataUrl);

    // Provide haptic feedback on mobile if available
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
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
    link.download = selectedFeatureId ? `${selectedFeatureId}.jpg` : `photo-${Date.now()}.jpg`;
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
            className={`p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors ${
              isMobile ? 'min-w-[48px] min-h-[48px]' : ''
            }`}
          >
            <X className={`${isMobile ? 'h-6 w-6' : 'h-6 w-6'} text-white`} />
          </button>

          <div className="text-center">
            <h2 className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-lg'}`}>
              📸 Camera
            </h2>
            {selectedFeatureId && (
              <div className={`text-blue-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                Feature: {selectedFeatureId.slice(-8)}
              </div>
            )}
          </div>

          {!capturedImage && (
            <button
              onClick={switchCamera}
              className={`p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors ${
                isMobile ? 'min-w-[48px] min-h-[48px]' : ''
              }`}
            >
              <RotateCcw className={`${isMobile ? 'h-6 w-6' : 'h-6 w-6'} text-white`} />
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
              onClick={startCamera}
              className={`bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium ${
                isMobile ? 'min-h-[48px]' : ''
              }`}
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
              <div className={`flex items-center justify-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
                <button
                  onClick={retakePhoto}
                  className={`flex items-center space-x-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors ${
                    isMobile ? 'min-h-[48px]' : ''
                  }`}
                >
                  <RotateCcw className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  <span>Retake</span>
                </button>

                <button
                  onClick={downloadPhoto}
                  className={`flex items-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors ${
                    isMobile ? 'min-h-[48px]' : ''
                  }`}
                >
                  <Download className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  <span>Download</span>
                </button>

                <button
                  onClick={savePhoto}
                  className={`flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors ${
                    isMobile ? 'min-h-[48px]' : ''
                  }`}
                >
                  <Check className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  <span>Save</span>
                </button>
              </div>

              {/* Photo Info */}
              <div className="mt-3 text-center space-y-1">
                {selectedFeatureId && (
                  <div className={`text-blue-400 font-mono ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    📁 {selectedFeatureId}.jpg
                  </div>
                )}
                <div className={`text-white ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  📅 {new Date().toLocaleString()}
                </div>
                {currentLocation && (
                  <div className={`text-green-400 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
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
              autoPlay
              // Mobile-specific attributes for stability
              {...(isMobile && {
                'webkit-playsinline': 'true',
                'x5-playsinline': 'true',
                'x5-video-player-type': 'h5',
                'x5-video-player-fullscreen': 'true'
              })}
            />

            {/* Mobile Camera Stabilization Overlay */}
            {isMobile && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Grid lines for better composition */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/20"></div>
                  ))}
                </div>

                {/* Center focus indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-16 h-16 border-2 border-white/50 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white/70 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-6">
              <div className="flex items-center justify-center">
                <button
                  onClick={takePhoto}
                  disabled={!stream}
                  className={`${
                    isMobile ? 'w-24 h-24' : 'w-20 h-20'
                  } bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 transition-all duration-200 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Camera className={`${isMobile ? 'h-10 w-10' : 'h-8 w-8'} text-gray-700`} />
                </button>
              </div>

              {/* Camera Info */}
              <div className="mt-4 text-center space-y-1">
                <div className={`text-white ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  📷 {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
                </div>
                {selectedFeatureId && (
                  <div className={`text-blue-400 font-mono ${isMobile ? 'text-sm' : 'text-xs'}`}>
                    🔗 Feature: {selectedFeatureId.slice(-8)}
                  </div>
                )}
                <div className={`text-gray-300 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                  🕐 {new Date().toLocaleString()}
                </div>
                {currentLocation && (
                  <div className={`text-green-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                    📍 GPS: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                )}

                {/* Mobile-specific instructions */}
                {isMobile && (
                  <div className="text-yellow-400 text-xs mt-2">
                    💡 Hold device steady • Tap center to focus
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