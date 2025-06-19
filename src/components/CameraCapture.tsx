import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Check, Download, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

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
  const [videoKey, setVideoKey] = useState(0); // Force video element recreation

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef<boolean>(true);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe state update helper
  const safeSetState = useCallback((setter: () => void) => {
    if (mountedRef.current) {
      setter();
    }
  }, []);

  // Complete cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Starting camera cleanup...');

    try {
      // Stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            if (track.readyState !== 'ended') {
              track.stop();
            }
          } catch (e) {
            console.warn('Track stop error:', e);
          }
        });
        streamRef.current = null;
      }

      if (stream) {
        stream.getTracks().forEach(track => {
          try {
            if (track.readyState !== 'ended') {
              track.stop();
            }
          } catch (e) {
            console.warn('Stream track stop error:', e);
          }
        });
      }

      // Clear video element safely - NO DOM MANIPULATION
      if (videoRef.current) {
        const video = videoRef.current;
        try {
          video.pause();
          video.srcObject = null;
          video.src = '';
          video.load(); // Reset video element
        } catch (e) {
          console.warn('Video cleanup error:', e);
        }
      }

      // Reset states safely
      safeSetState(() => {
        setStream(null);
        setVideoReady(false);
        setIsInitializing(false);
        setError(null);
      });

    } catch (e) {
      console.warn('Cleanup error:', e);
    }
  }, [stream, safeSetState]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('📷 Camera modal opened');
      mountedRef.current = true;

      // Reset all states
      setError(null);
      setVideoReady(false);
      setRetryCount(0);
      setCapturedImage(null);
      setVideoKey(prev => prev + 1); // Force new video element

      // Start camera initialization
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          initializeCamera();
        }
      }, 200);

      return () => {
        clearTimeout(timer);
      };
    } else {
      console.log('📷 Camera modal closed');
      cleanup();
    }
  }, [isOpen, cleanup]);

  // Handle facing mode changes
  useEffect(() => {
    if (isOpen && stream && videoReady && mountedRef.current) {
      console.log('🔄 Camera facing mode changed, reinitializing...');
      cleanup();
      setVideoKey(prev => prev + 1); // Force new video element

      const timer = setTimeout(() => {
        if (mountedRef.current) {
          initializeCamera();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [facingMode, isOpen, stream, videoReady, cleanup]);

  // Generate filename
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

  // Get Thai time display
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

  // Get camera constraints with progressive fallback
  const getConstraints = () => {
    const constraintLevels = [
      // Level 0: Ideal settings
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: isMobile ? 1280 : 1920, min: 320 },
          height: { ideal: isMobile ? 720 : 1080, min: 240 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      },
      // Level 1: Good settings
      {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 }
        },
        audio: false
      },
      // Level 2: Basic settings
      {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      },
      // Level 3: Minimal settings
      {
        video: { facingMode: facingMode },
        audio: false
      },
      // Level 4: Any camera
      {
        video: true,
        audio: false
      }
    ];

    const level = Math.min(retryCount, constraintLevels.length - 1);
    return constraintLevels[level];
  };

  // Initialize camera
  const initializeCamera = async () => {
    if (!mountedRef.current) return;

    console.log('🚀 Initializing camera...');
    safeSetState(() => {
      setIsInitializing(true);
      setError(null);
      setVideoReady(false);
    });

    try {
      // Check API availability
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Get constraints
      const constraints = getConstraints();
      console.log('📋 Camera constraints:', constraints);

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!mountedRef.current) {
        // Component unmounted during async operation
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      console.log('✅ Camera stream obtained');

      // Store stream reference
      streamRef.current = mediaStream;
      safeSetState(() => setStream(mediaStream));

      // Setup video element
      await setupVideoElement(mediaStream);

    } catch (err) {
      if (mountedRef.current) {
        console.error('❌ Camera initialization failed:', err);
        handleCameraError(err);
      }
    } finally {
      if (mountedRef.current) {
        safeSetState(() => setIsInitializing(false));
      }
    }
  };

  // Setup video element
  const setupVideoElement = async (mediaStream: MediaStream): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!mountedRef.current) {
        reject(new Error('Component unmounted'));
        return;
      }

      const video = videoRef.current;
      if (!video) {
        reject(new Error('Video element not available'));
        return;
      }

      console.log('🎥 Setting up video element...');

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved && mountedRef.current) {
          reject(new Error('Video setup timeout'));
        }
      }, 10000);

      const resolveOnce = () => {
        if (!resolved && mountedRef.current) {
          resolved = true;
          clearTimeout(timeout);
          safeSetState(() => setVideoReady(true));
          resolve();
        }
      };

      const rejectOnce = (error: Error) => {
        if (!resolved && mountedRef.current) {
          resolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      };

      // Event handlers
      const onLoadedMetadata = () => {
        if (!mountedRef.current) return;
        console.log('📊 Video metadata loaded');
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolveOnce();
        }
      };

      const onCanPlay = () => {
        if (!mountedRef.current) return;
        console.log('▶️ Video can play');
        resolveOnce();
      };

      const onError = () => {
        if (!mountedRef.current) return;
        console.error('❌ Video element error');
        rejectOnce(new Error('Video element failed to load'));
      };

      try {
        // Add event listeners
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('canplay', onCanPlay, { once: true });
        video.addEventListener('error', onError, { once: true });

        // Configure video
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;

        // Set stream
        video.srcObject = mediaStream;

        // Start playback
        video.play().catch(playError => {
          if (mountedRef.current) {
            rejectOnce(new Error('Video play failed: ' + playError.message));
          }
        });

      } catch (setupError) {
        rejectOnce(new Error('Video setup failed: ' + (setupError as Error).message));
      }
    });
  };

  // Handle camera errors
  const handleCameraError = (err: any) => {
    if (!mountedRef.current) return;

    let errorMessage = 'Camera error occurred. ';
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
          errorMessage = 'Camera not supported on this device.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is in use by another app. Please close other camera apps and try again.';
          canRetry = true;
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera settings not supported. Trying simpler settings...';
          canRetry = true;
          break;
        default:
          errorMessage = err.message || 'Unknown camera error';
          canRetry = retryCount < 3;
      }
    }

    safeSetState(() => setError(errorMessage));

    // Auto-retry with simpler constraints
    if (canRetry && retryCount < 4 && mountedRef.current) {
      console.log(`🔄 Auto-retry ${retryCount + 1}/4`);
      safeSetState(() => setRetryCount(prev => prev + 1));

      setTimeout(() => {
        if (mountedRef.current) {
          initializeCamera();
        }
      }, 2000);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady || !mountedRef.current) {
      safeSetState(() => setError('Camera not ready for capture'));
      return;
    }

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      safeSetState(() => setError('Camera video not loaded properly'));
      return;
    }

    safeSetState(() => setIsCapturing(true));

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context not available');
      }

      // Set canvas size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame
      context.drawImage(video, 0, 0);

      // Convert to image
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      if (imageDataUrl.length < 100) {
        throw new Error('Failed to capture image');
      }

      safeSetState(() => setCapturedImage(imageDataUrl));
      console.log('📸 Photo captured successfully');

    } catch (captureError) {
      console.error('❌ Photo capture error:', captureError);
      safeSetState(() => setError('Failed to capture photo'));
    }

    setTimeout(() => {
      if (mountedRef.current) {
        safeSetState(() => setIsCapturing(false));
      }
    }, 200);
  };

  // Other handlers
  const retakePhoto = () => {
    safeSetState(() => {
      setCapturedImage(null);
      setError(null);
    });
  };

  const savePhoto = () => {
    if (!capturedImage || !mountedRef.current) return;

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
    if (!capturedImage || !mountedRef.current) return;

    try {
      const link = document.createElement('a');
      link.download = generatePhotoFilename();
      link.href = capturedImage;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      safeSetState(() => setError('Failed to download photo'));
    }
  };

  const switchCamera = () => {
    if (!mountedRef.current) return;
    safeSetState(() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user'));
  };

  const forceRetry = () => {
    if (!mountedRef.current) return;
    safeSetState(() => {
      setRetryCount(0);
      setError(null);
      setVideoKey(prev => prev + 1);
    });
    cleanup();
    setTimeout(() => {
      if (mountedRef.current) {
        initializeCamera();
      }
    }, 1000);
  };

  const refreshPage = () => {
    window.location.reload();
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
              {retryCount > 0 ? `Retrying Camera... (${retryCount}/4)` : 'Starting Camera...'}
            </h3>
            <p className={`text-gray-300 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {retryCount > 0 ? 'Trying simpler camera settings...' : 'Please wait...'}
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
              <h4 className="font-semibold text-blue-400 mb-3">🔧 Quick Fix:</h4>
              <div className="text-left text-sm text-blue-200 space-y-2">
                <div>1. Close other camera apps</div>
                <div>2. Check browser permissions</div>
                <div>3. Try refreshing the page</div>
                <div>4. Restart browser if needed</div>
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
                onClick={refreshPage}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Refresh Page</span>
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
                    📁 {generatePhotoFilename()}
                  </div>
                )}
                <div className={`text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  📅 {getThaiTimeDisplay()}
                </div>
                {currentLocation && (
                  <div className={`text-green-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Video Element - Key prop forces recreation */}
            <video
              key={videoKey}
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
              style={{ backgroundColor: '#000' }}
            />

            {/* Loading Overlay */}
            {!videoReady && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm">Loading camera...</p>
                </div>
              </div>
            )}

            {/* Capture Animation */}
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
                    🔗 Feature: {selectedFeatureId.slice(-8)}
                  </div>
                )}
                <div className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  🕐 {getThaiTimeDisplay()}
                </div>
                {currentLocation && (
                  <div className={`text-green-400 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
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