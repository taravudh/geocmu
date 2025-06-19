import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCcw, Check, Download, MapPin, AlertCircle, Settings } from 'lucide-react';

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasTriedBasic, setHasTriedBasic] = useState(false);

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
      setError(null);
      setHasTriedBasic(false);
      initializeCamera();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen, facingMode]);

  // Generate filename using Feature ID or fallback to timestamp
  const generatePhotoFilename = (): string => {
    if (selectedFeatureId) {
      return `${selectedFeatureId}.jpg`;
    } else {
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
    setIsInitializing(true);
    setError(null);

    try {
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('UNSUPPORTED');
      }

      // Try advanced constraints first
      if (!hasTriedBasic) {
        await tryAdvancedConstraints();
      } else {
        await tryBasicConstraints();
      }

    } catch (err) {
      console.error('Camera initialization error:', err);
      handleCameraError(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const tryAdvancedConstraints = async () => {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: isMobile ? 1280 : 1920, min: 320 },
        height: { ideal: isMobile ? 720 : 1080, min: 240 },
        frameRate: { ideal: 30, min: 10 }
      },
      audio: false
    };

    console.log('Trying advanced camera constraints:', constraints);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      await setupVideoStream(mediaStream);
    } catch (error) {
      console.log('Advanced constraints failed, trying basic...');
      setHasTriedBasic(true);
      await tryBasicConstraints();
    }
  };

  const tryBasicConstraints = async () => {
    const basicConstraints: MediaStreamConstraints = {
      video: {
        facingMode: facingMode
      },
      audio: false
    };

    console.log('Trying basic camera constraints:', basicConstraints);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
      await setupVideoStream(mediaStream);
    } catch (error) {
      // Try the most basic constraints
      console.log('Basic constraints failed, trying minimal...');
      const minimalConstraints: MediaStreamConstraints = {
        video: true,
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(minimalConstraints);
      await setupVideoStream(mediaStream);
    }
  };

  const setupVideoStream = async (mediaStream: MediaStream): Promise<void> => {
    return new Promise((resolve, reject) => {
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        const handleLoadedMetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Camera started successfully');
                setError(null);
                resolve();
              })
              .catch((playError) => {
                console.error('Error playing video:', playError);
                reject(new Error('PLAY_FAILED'));
              });
          }
        };

        const handleError = (videoError: Event) => {
          console.error('Video error:', videoError);
          reject(new Error('VIDEO_ERROR'));
        };

        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        videoRef.current.addEventListener('error', handleError, { once: true });

        // Timeout fallback
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState === 0) {
            reject(new Error('TIMEOUT'));
          }
        }, 10000);
      } else {
        reject(new Error('NO_VIDEO_ELEMENT'));
      }
    });
  };

  const handleCameraError = (err: any) => {
    let errorMessage = 'Failed to access camera. ';
    let showInstructions = false;

    if (err instanceof Error) {
      switch (err.message) {
        case 'UNSUPPORTED':
          errorMessage = 'Camera not supported on this device or browser.';
          break;
        case 'PLAY_FAILED':
          errorMessage = 'Camera preview failed to start. Please try again.';
          break;
        case 'VIDEO_ERROR':
          errorMessage = 'Video stream error. Please check camera permissions.';
          showInstructions = true;
          break;
        case 'TIMEOUT':
          errorMessage = 'Camera took too long to start. Please try again.';
          break;
        default:
          switch (err.name) {
            case 'NotAllowedError':
              errorMessage = 'Camera access denied. Please allow camera permissions.';
              showInstructions = true;
              break;
            case 'NotFoundError':
              errorMessage = 'No camera found on this device.';
              break;
            case 'NotSupportedError':
              errorMessage = 'Camera not supported on this device.';
              break;
            case 'NotReadableError':
              errorMessage = 'Camera is already in use by another application.';
              break;
            case 'OverconstrainedError':
              errorMessage = 'Camera settings not supported. Trying simpler settings...';
              if (!hasTriedBasic) {
                setHasTriedBasic(true);
                setTimeout(() => initializeCamera(), 1000);
                return;
              }
              break;
            default:
              errorMessage += err.message;
          }
      }
    }

    setError(errorMessage);
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      setStream(null);
    }
    setCapturedImage(null);
    setError(null);
    setIsInitializing(false);
    setHasTriedBasic(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready for capture');
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to get canvas context');
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || video.clientWidth || 640;
      canvas.height = video.videoHeight || video.clientHeight || 480;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to image data
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);

      console.log('Photo captured successfully');
    } catch (captureError) {
      console.error('Photo capture error:', captureError);
      setError('Failed to capture photo. Please try again.');
    }

    setTimeout(() => setIsCapturing(false), 200);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null);
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

    try {
      const link = document.createElement('a');
      link.download = generatePhotoFilename();
      link.href = capturedImage;
      link.click();
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      setError('Failed to download photo');
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const openBrowserSettings = () => {
    // Show instructions for enabling camera permissions
    const instructions = `
To enable camera permissions:

1. Look for the camera icon 🎥 or lock icon 🔒 in your browser's address bar
2. Click on it and select "Allow" for camera
3. Or go to your browser settings:
   - Chrome: Settings > Privacy > Site Settings > Camera
   - Safari: Settings > Websites > Camera
   - Firefox: Settings > Privacy > Permissions > Camera
4. Refresh this page and try again

Current URL: ${window.location.href}
    `;

    alert(instructions);
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

          {!capturedImage && stream && (
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
        {isInitializing ? (
          <div className="text-center text-white p-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <h3 className={`font-bold mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>Starting Camera...</h3>
            <p className={`text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Please allow camera permissions when prompted
            </p>
          </div>
        ) : error ? (
          <div className="text-center text-white p-6 max-w-md mx-4">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h3 className={`font-bold mb-4 ${isMobile ? 'text-lg' : 'text-xl'}`}>Camera Error</h3>
            <p className={`text-gray-300 mb-6 ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
              {error}
            </p>

            <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-600">
              <h4 className="font-semibold text-blue-400 mb-3">📱 How to enable camera:</h4>
              <div className="text-left text-sm text-blue-200 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Look for the camera 🎥 or lock 🔒 icon in your browser's address bar</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Tap it and select "Allow" for camera permissions</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>If no icon appears, check your browser settings</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  <span>Refresh the page and try again</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setError(null);
                  setHasTriedBasic(false);
                  initializeCamera();
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Try Again
              </button>

              <button
                onClick={openBrowserSettings}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Settings className="h-5 w-5" />
                <span>Camera Settings Help</span>
              </button>

              <button
                onClick={onClose}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Close Camera
              </button>
            </div>
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
              autoPlay
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