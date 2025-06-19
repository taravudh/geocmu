import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Check, Download, MapPin, AlertCircle, Settings, RefreshCw } from 'lucide-react';

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
  const [videoReady, setVideoReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
      setVideoReady(false);
      setRetryCount(0);
      setCapturedImage(null);
      initializeCamera();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  // Handle facing mode changes
  useEffect(() => {
    if (isOpen && stream) {
      // Restart camera when facing mode changes
      cleanup();
      setTimeout(() => {
        initializeCamera();
      }, 500);
    }
  }, [facingMode]);

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

  const cleanup = useCallback(() => {
    console.log('Cleaning up camera resources...');

    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.kind);
      });
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset video element
    }

    setVideoReady(false);
    setIsInitializing(false);
  }, [stream]);

  const initializeCamera = async () => {
    console.log('Initializing camera...');
    setIsInitializing(true);
    setError(null);
    setVideoReady(false);

    try {
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device or browser');
      }

      // Ensure video element exists
      if (!videoRef.current) {
        console.error('Video element not found');
        throw new Error('Video element not available');
      }

      // Try different constraint levels
      const constraints = getConstraints();
      console.log('Trying camera constraints:', constraints);

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', mediaStream.getTracks().map(t => t.kind));

      await setupVideoStream(mediaStream);

    } catch (err) {
      console.error('Camera initialization error:', err);
      handleCameraError(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const getConstraints = () => {
    // Progressive fallback constraints
    const constraintLevels = [
      // Level 1: Full constraints
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: isMobile ? 1280 : 1920, min: 320 },
          height: { ideal: isMobile ? 720 : 1080, min: 240 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      },
      // Level 2: Basic constraints
      {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      },
      // Level 3: Minimal constraints
      {
        video: {
          facingMode: facingMode
        },
        audio: false
      },
      // Level 4: Any camera
      {
        video: true,
        audio: false
      }
    ];

    return constraintLevels[Math.min(retryCount, constraintLevels.length - 1)];
  };

  const setupVideoStream = async (mediaStream: MediaStream): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;

      if (!video) {
        reject(new Error('Video element not available'));
        return;
      }

      console.log('Setting up video stream...');

      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded');
        video.play()
          .then(() => {
            console.log('Video playing successfully');
            setStream(mediaStream);
            setVideoReady(true);
            setError(null);
            resolve();
          })
          .catch((playError) => {
            console.error('Video play error:', playError);
            reject(new Error('Failed to start video playback'));
          });
      };

      const handleCanPlay = () => {
        console.log('Video can play');
        if (!videoReady) {
          setVideoReady(true);
        }
      };

      const handleError = (videoError: Event) => {
        console.error('Video element error:', videoError);
        reject(new Error('Video element error'));
      };

      const handleLoadStart = () => {
        console.log('Video load started');
      };

      // Set up event listeners
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.addEventListener('error', handleError, { once: true });
      video.addEventListener('loadstart', handleLoadStart, { once: true });

      // Set video properties for mobile compatibility
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;

      // Set the stream
      video.srcObject = mediaStream;

      // Timeout fallback
      const timeout = setTimeout(() => {
        console.warn('Video setup timeout');
        if (!videoReady) {
          reject(new Error('Video setup timeout'));
        }
      }, 15000);

      // Clean up timeout when resolved
      const originalResolve = resolve;
      resolve = () => {
        clearTimeout(timeout);
        originalResolve();
      };
    });
  };

  const handleCameraError = (err: any) => {
    console.error('Camera error details:', err);

    let errorMessage = 'Failed to access camera. ';
    let canRetry = false;

    if (err instanceof Error) {
      switch (err.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found on this device.';
          break;
        case 'NotSupportedError':
          errorMessage = 'Camera not supported on this device or browser.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is already in use by another application. Please close other camera apps and try again.';
          canRetry = true;
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera settings not supported. Trying simpler settings...';
          canRetry = true;
          break;
        case 'AbortError':
          errorMessage = 'Camera access was interrupted. Please try again.';
          canRetry = true;
          break;
        default:
          if (err.message.includes('Video element')) {
            errorMessage = 'Camera display error. Please refresh the page and try again.';
            canRetry = true;
          } else if (err.message.includes('timeout')) {
            errorMessage = 'Camera took too long to start. Please try again.';
            canRetry = true;
          } else {
            errorMessage += err.message;
            canRetry = retryCount < 3;
          }
      }
    }

    setError(errorMessage);

    // Auto-retry with simpler constraints
    if (canRetry && retryCount < 3) {
      console.log(`Auto-retrying with simpler constraints (attempt ${retryCount + 1})`);
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        initializeCamera();
      }, 2000);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady) {
      setError('Camera not ready for capture. Please wait for camera to load.');
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

      // Ensure video has dimensions
      const videoWidth = video.videoWidth || video.clientWidth || 640;
      const videoHeight = video.videoHeight || video.clientHeight || 480;

      if (videoWidth === 0 || videoHeight === 0) {
        throw new Error('Video dimensions not available');
      }

      console.log('Capturing photo with dimensions:', videoWidth, 'x', videoHeight);

      // Set canvas dimensions to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Convert to image data with high quality
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      if (imageDataUrl === 'data:,') {
        throw new Error('Failed to capture image data');
      }

      setCapturedImage(imageDataUrl);
      console.log('Photo captured successfully');

    } catch (captureError) {
      console.error('Photo capture error:', captureError);
      setError('Failed to capture photo. Please ensure camera is working and try again.');
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      setError('Failed to download photo');
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const forceRetry = () => {
    setRetryCount(0);
    setError(null);
    cleanup();
    setTimeout(() => {
      initializeCamera();
    }, 500);
  };

  const openBrowserSettings = () => {
    const instructions = `
📱 CAMERA PERMISSION GUIDE

🔧 STEP 1: Check Browser Address Bar
Look for these icons next to the URL:
• 🎥 Camera icon
• 🔒 Lock icon
• ⚠️ Warning icon

🔧 STEP 2: Enable Camera Access
• Tap the icon and select "Allow"
• If no icon, go to browser settings

🔧 STEP 3: Browser-Specific Settings

📱 Chrome Mobile:
• Tap ⋮ (menu) → Settings → Site Settings → Camera
• Find "${window.location.hostname}"
• Change to "Allow"

📱 Safari Mobile:
• Settings app → Safari → Camera
• Set to "Allow"

📱 Firefox Mobile:
• Tap ⋮ (menu) → Settings → Site Settings → Camera
• Find this site and allow

🔧 STEP 4: Refresh & Try Again
• Close this dialog
• Refresh the page (pull down)
• Try camera again

Current site: ${window.location.href}
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

          {!capturedImage && videoReady && (
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
            <h3 className={`font-bold mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              {retryCount > 0 ? `Retrying Camera... (${retryCount}/3)` : 'Starting Camera...'}
            </h3>
            <p className={`text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {retryCount > 0 ? 'Trying simpler camera settings...' : 'Please allow camera permissions when prompted'}
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
              <h4 className="font-semibold text-blue-400 mb-3">📱 Quick Fix:</h4>
              <div className="text-left text-sm text-blue-200 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Look for camera 🎥 or lock 🔒 icon in address bar</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Tap it and select "Allow" for camera</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Refresh page if needed</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={forceRetry}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Try Again</span>
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
              style={{ backgroundColor: '#000' }}
            />

            {/* Video Loading Overlay */}
            {!videoReady && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm">Loading camera preview...</p>
                </div>
              </div>
            )}

            {/* Capture Animation Overlay */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white opacity-50 animate-pulse"></div>
            )}

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-6">
              <div className="flex items-center justify-center">
                <button
                  onClick={capturePhoto}
                  disabled={!videoReady}
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
                  {videoReady && <span className="text-green-400 ml-2">● Ready</span>}
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