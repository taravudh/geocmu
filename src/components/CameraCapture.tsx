import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Check, Download, MapPin, AlertCircle, RefreshCw, Settings } from 'lucide-react';

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
  const [initProgress, setInitProgress] = useState('Preparing camera...');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    };
  }, []);

  // Safe state update helper
  const safeSetState = useCallback((setter: () => void) => {
    if (mountedRef.current) {
      try {
        setter();
      } catch (e) {
        console.warn('State update error:', e);
      }
    }
  }, []);

  // Complete cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up camera resources...');

    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    try {
      // Stop stream tracks
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

      // Clean video element
      if (videoRef.current) {
        const video = videoRef.current;
        try {
          video.pause();
          video.srcObject = null;
          video.removeAttribute('src');
          video.load();
        } catch (e) {
          console.warn('Video cleanup error:', e);
        }
      }

      // Reset states
      safeSetState(() => {
        setStream(null);
        setVideoReady(false);
        setIsInitializing(false);
        setInitProgress('Preparing camera...');
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

      // Reset states
      setError(null);
      setVideoReady(false);
      setRetryCount(0);
      setCapturedImage(null);
      setShowPermissionHelp(false);
      setInitProgress('Preparing camera...');

      // Delay initialization to ensure DOM is ready
      initTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          initializeCamera();
        }
      }, 500);

    } else {
      console.log('📷 Camera modal closed');
      cleanup();
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isOpen, cleanup]);

  // Handle facing mode changes
  useEffect(() => {
    if (isOpen && stream && videoReady && mountedRef.current) {
      console.log('🔄 Switching camera...');
      cleanup();

      initTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          initializeCamera();
        }
      }, 1000);
    }
  }, [facingMode]);

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

  // Get progressive camera constraints
  const getConstraints = () => {
    const baseConstraints = {
      audio: false,
      video: {
        facingMode: facingMode,
        width: { ideal: isMobile ? 1280 : 1920, max: 1920 },
        height: { ideal: isMobile ? 720 : 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 }
      }
    };

    // Progressive fallback based on retry count
    switch (retryCount) {
      case 0:
        return baseConstraints;
      case 1:
        return {
          audio: false,
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
      case 2:
        return {
          audio: false,
          video: { facingMode: facingMode }
        };
      case 3:
        return {
          audio: false,
          video: true
        };
      default:
        return { audio: false, video: true };
    }
  };

  // Initialize camera with better error handling
  const initializeCamera = async () => {
    if (!mountedRef.current) return;

    console.log('🚀 Starting camera initialization...');

    safeSetState(() => {
      setIsInitializing(true);
      setError(null);
      setVideoReady(false);
      setInitProgress('Checking camera availability...');
    });

    // Overall timeout
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && isInitializing) {
        console.log('⏰ Camera initialization timeout');
        handleCameraError(new Error('Camera initialization timeout. Please try refreshing the page.'));
      }
    }, 20000);

    try {
      // Check API support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please try Chrome or Safari.');
      }

      safeSetState(() => setInitProgress('Requesting camera permissions...'));

      // Get constraints
      const constraints = getConstraints();
      console.log('📋 Using constraints:', constraints);

      safeSetState(() => setInitProgress('Starting camera stream...'));

      // Request camera with timeout
      const mediaStream = await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Camera request timeout')), 10000)
        )
      ]);

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      console.log('✅ Camera stream obtained');
      streamRef.current = mediaStream;

      safeSetState(() => {
        setStream(mediaStream);
        setInitProgress('Setting up video display...');
      });

      // Setup video element
      await setupVideoElement(mediaStream);

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

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

  // Setup video element with mobile optimizations
  const setupVideoElement = async (mediaStream: MediaStream): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!mountedRef.current || !videoRef.current) {
        reject(new Error('Component not ready'));
        return;
      }

      const video = videoRef.current;
      console.log('🎥 Setting up video element...');

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved && mountedRef.current) {
          console.log('⏰ Video setup timeout');
          reject(new Error('Video display timeout'));
        }
      }, 10000);

      const resolveOnce = () => {
        if (!resolved && mountedRef.current) {
          resolved = true;
          clearTimeout(timeout);
          console.log('✅ Video ready');
          safeSetState(() => {
            setVideoReady(true);
            setInitProgress('Camera ready!');
          });
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

      try {
        // Configure video for mobile
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.controls = false;
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');

        // Event handlers
        const onLoadedMetadata = () => {
          if (resolved || !mountedRef.current) return;
          console.log('📊 Video metadata loaded');
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolveOnce();
          }
        };

        const onCanPlay = () => {
          if (resolved || !mountedRef.current) return;
          console.log('▶️ Video can play');
          resolveOnce();
        };

        const onError = (e: Event) => {
          if (resolved || !mountedRef.current) return;
          console.error('❌ Video error:', e);
          rejectOnce(new Error('Video element error'));
        };

        // Add event listeners
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('canplay', onCanPlay, { once: true });
        video.addEventListener('error', onError, { once: true });

        // Set stream and play
        video.srcObject = mediaStream;

        // Force play with better error handling
        const playVideo = async () => {
          try {
            await video.play();
            console.log('🎬 Video playing');

            // Double-check video is ready
            setTimeout(() => {
              if (!resolved && mountedRef.current && video.videoWidth > 0) {
                resolveOnce();
              }
            }, 1500);

          } catch (playError) {
            console.error('Play error:', playError);
            rejectOnce(new Error('Video play failed: ' + (playError as Error).message));
          }
        };

        // Start playback
        playVideo();

      } catch (setupError) {
        rejectOnce(new Error('Video setup failed: ' + (setupError as Error).message));
      }
    });
  };

  // Handle camera errors with better messaging
  const handleCameraError = (err: any) => {
    if (!mountedRef.current) return;

    let errorMessage = 'Camera error occurred. ';
    let canRetry = false;
    let showHelp = false;

    if (err instanceof Error) {
      switch (err.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.';
          showHelp = true;
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found. Please check if your device has a camera.';
          break;
        case 'NotSupportedError':
          errorMessage = 'Camera not supported on this device or browser.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is busy. Please close other camera apps and try again.';
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
          if (err.message.includes('timeout')) {
            errorMessage = 'Camera is taking too long to start. Please try refreshing the page.';
            canRetry = retryCount < 2;
          } else if (err.message.includes('play')) {
            errorMessage = 'Camera display error. This is common on some mobile browsers.';
            canRetry = retryCount < 3;
          } else {
            errorMessage = err.message || 'Unknown camera error';
            canRetry = retryCount < 2;
          }
      }
    }

    safeSetState(() => {
      setError(errorMessage);
      setShowPermissionHelp(showHelp);
    });

    // Auto-retry with progressive fallback
    if (canRetry && retryCount < 4 && mountedRef.current) {
      console.log(`🔄 Auto-retry ${retryCount + 1}/4`);
      safeSetState(() => setRetryCount(prev => prev + 1));

      setTimeout(() => {
        if (mountedRef.current) {
          initializeCamera();
        }
      }, 3000);
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
        throw new Error('Canvas not available');
      }

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Convert to image with high quality
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      if (imageDataUrl.length < 100) {
        throw new Error('Failed to capture image data');
      }

      safeSetState(() => setCapturedImage(imageDataUrl));
      console.log('📸 Photo captured successfully');

    } catch (captureError) {
      console.error('❌ Photo capture error:', captureError);
      safeSetState(() => setError('Failed to capture photo: ' + (captureError as Error).message));
    }

    setTimeout(() => {
      if (mountedRef.current) {
        safeSetState(() => setIsCapturing(false));
      }
    }, 300);
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
      setShowPermissionHelp(false);
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

  const openCameraSettings = () => {
    // Open browser camera settings
    if (isMobile) {
      alert('To fix camera issues:\n\n1. Go to Chrome Settings\n2. Tap Site Settings\n3. Tap Camera\n4. Allow camera access\n5. Refresh this page');
    } else {
      alert('Click the camera icon in your browser address bar to manage camera permissions.');
    }
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
              {retryCount > 0 ? `Retrying... (${retryCount}/4)` : 'Starting Camera'}
            </h3>
            <p className={`text-gray-300 mb-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {initProgress}
            </p>
            {retryCount > 0 && (
              <p className={`text-yellow-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Trying simpler camera settings...
              </p>
            )}
          </div>
        ) : error ? (
          <div className="text-center text-white p-6 max-w-md mx-4">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h3 className={`font-bold mb-4 ${isMobile ? 'text-lg' : 'text-xl'}`}>Camera Error</h3>
            <p className={`text-gray-300 mb-6 ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
              {error}
            </p>

            {showPermissionHelp && (
              <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-600">
                <h4 className="font-semibold text-blue-400 mb-3">🔧 Permission Fix:</h4>
                <div className="text-left text-sm text-blue-200 space-y-2">
                  <div>1. Look for camera 📷 or lock 🔒 icon in address bar</div>
                  <div>2. Tap it and select "Allow" for camera</div>
                  <div>3. Refresh the page</div>
                  <div>4. Try again</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={forceRetry}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Try Again</span>
              </button>

              <button
                onClick={openCameraSettings}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Settings className="h-5 w-5" />
                <span>Camera Settings Help</span>
              </button>

              <button
                onClick={refreshPage}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
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
            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
              controls={false}
              webkit-playsinline="true"
              style={{ backgroundColor: '#000' }}
            />

            {/* Loading Overlay */}
            {!videoReady && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm">{initProgress}</p>
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