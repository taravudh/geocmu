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
  const [videoLoaded, setVideoLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef<boolean>(false);

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
      console.log('Camera modal opened, initializing...');
      cleanupRef.current = false;
      setError(null);
      setVideoReady(false);
      setVideoLoaded(false);
      setRetryCount(0);
      setCapturedImage(null);

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (!cleanupRef.current) {
          initializeCamera();
        }
      }, 100);
    } else {
      console.log('Camera modal closed, cleaning up...');
      cleanupRef.current = true;
      cleanup();
    }

    return () => {
      cleanupRef.current = true;
      cleanup();
    };
  }, [isOpen]);

  // Handle facing mode changes
  useEffect(() => {
    if (isOpen && stream && videoLoaded && !cleanupRef.current) {
      console.log('Facing mode changed, restarting camera...');
      cleanup();
      setTimeout(() => {
        if (!cleanupRef.current) {
          initializeCamera();
        }
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

    try {
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
            console.log('Camera track stopped:', track.kind, track.readyState);
          } catch (trackError) {
            console.warn('Error stopping track:', trackError);
          }
        });
        streamRef.current = null;
      }

      if (stream) {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (trackError) {
            console.warn('Error stopping stream track:', trackError);
          }
        });
        setStream(null);
      }

      // Reset video element safely
      if (videoRef.current) {
        try {
          const video = videoRef.current;

          // Remove all event listeners by cloning the element
          const newVideo = video.cloneNode(true) as HTMLVideoElement;

          // Clear the old video
          video.pause();
          video.srcObject = null;
          video.src = '';

          // Replace only if parent exists and video is still a child
          if (video.parentNode && video.parentNode.contains(video)) {
            try {
              video.parentNode.replaceChild(newVideo, video);
              // Update the ref to point to the new video element
              (videoRef as any).current = newVideo;
            } catch (replaceError) {
              console.warn('Could not replace video element:', replaceError);
              // Fallback: just clear the existing video
              video.load();
            }
          }
        } catch (videoError) {
          console.warn('Error cleaning up video element:', videoError);
        }
      }

      setVideoReady(false);
      setVideoLoaded(false);
      setIsInitializing(false);
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
    }
  }, [stream]);

  const initializeCamera = async () => {
    if (cleanupRef.current) {
      console.log('Cleanup flag set, aborting camera initialization');
      return;
    }

    console.log('Starting camera initialization...');
    setIsInitializing(true);
    setError(null);
    setVideoReady(false);
    setVideoLoaded(false);

    try {
      // Ensure we have a fresh video element
      if (!videoRef.current) {
        console.error('Video element not found in DOM');
        throw new Error('Video element not available');
      }

      // Check camera API availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Get camera constraints
      const constraints = getConstraints();
      console.log('Requesting camera with constraints:', constraints);

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (cleanupRef.current) {
        // If cleanup was called during async operation, stop the stream
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      console.log('Camera stream obtained successfully');
      console.log('Stream tracks:', mediaStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
        settings: t.getSettings()
      })));

      // Store stream reference
      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Setup video element
      await setupVideoElement(mediaStream);

    } catch (err) {
      if (!cleanupRef.current) {
        console.error('Camera initialization failed:', err);
        handleCameraError(err);
      }
    } finally {
      if (!cleanupRef.current) {
        setIsInitializing(false);
      }
    }
  };

  const getConstraints = () => {
    // Progressive fallback constraints based on retry count
    const constraintLevels = [
      // Level 0: Ideal settings
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: isMobile ? 1280 : 1920, min: 320 },
          height: { ideal: isMobile ? 720 : 1080, min: 240 },
          frameRate: { ideal: 30, min: 10 }
        },
        audio: false
      },
      // Level 1: Good settings
      {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
          frameRate: { ideal: 24 }
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

    const level = Math.min(retryCount, constraintLevels.length - 1);
    console.log(`Using constraint level ${level}:`, constraintLevels[level]);
    return constraintLevels[level];
  };

  const setupVideoElement = async (mediaStream: MediaStream): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (cleanupRef.current) {
        reject(new Error('Setup cancelled due to cleanup'));
        return;
      }

      const video = videoRef.current;

      if (!video) {
        reject(new Error('Video element not available during setup'));
        return;
      }

      console.log('Setting up video element...');

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved && !cleanupRef.current) {
          console.error('Video setup timeout after 15 seconds');
          reject(new Error('Video setup timeout - camera may be in use by another app'));
        }
      }, 15000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        try {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('canplay', onCanPlay);
          video.removeEventListener('playing', onPlaying);
          video.removeEventListener('error', onError);
          video.removeEventListener('loadstart', onLoadStart);
        } catch (listenerError) {
          console.warn('Error removing event listeners:', listenerError);
        }
      };

      const resolveOnce = () => {
        if (!resolved && !cleanupRef.current) {
          resolved = true;
          cleanup();
          resolve();
        }
      };

      const rejectOnce = (error: Error) => {
        if (!resolved && !cleanupRef.current) {
          resolved = true;
          cleanup();
          reject(error);
        }
      };

      const onLoadedMetadata = () => {
        if (cleanupRef.current) return;
        console.log('Video metadata loaded:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration
        });
        setVideoLoaded(true);
      };

      const onCanPlay = () => {
        if (cleanupRef.current) return;
        console.log('Video can play');
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoReady(true);
          resolveOnce();
        }
      };

      const onPlaying = () => {
        if (cleanupRef.current) return;
        console.log('Video is playing');
        setVideoReady(true);
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolveOnce();
        }
      };

      const onError = (event: Event) => {
        if (cleanupRef.current) return;
        console.error('Video element error:', event);
        const videoError = (event.target as HTMLVideoElement)?.error;
        if (videoError) {
          console.error('Video error details:', {
            code: videoError.code,
            message: videoError.message
          });
        }
        rejectOnce(new Error('Video element failed to load stream'));
      };

      const onLoadStart = () => {
        if (cleanupRef.current) return;
        console.log('Video load started');
      };

      try {
        // Add event listeners
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('error', onError);
        video.addEventListener('loadstart', onLoadStart);

        // Configure video element for mobile compatibility
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.controls = false;

        // Set the stream
        console.log('Assigning stream to video element...');
        video.srcObject = mediaStream;

        // Force load and play
        video.load();
        video.play().catch(playError => {
          if (!cleanupRef.current) {
            console.error('Video play error:', playError);
            rejectOnce(new Error('Failed to start video playback: ' + playError.message));
          }
        });
      } catch (setupError) {
        console.error('Error setting up video element:', setupError);
        rejectOnce(new Error('Failed to setup video element: ' + (setupError as Error).message));
      }
    });
  };

  const handleCameraError = (err: any) => {
    if (cleanupRef.current) return;

    console.error('Camera error details:', err);

    let errorMessage = 'Camera error occurred. ';
    let canRetry = false;

    if (err instanceof Error) {
      switch (err.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera access denied. Please check your browser permissions and try again.';
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
          if (err.message.includes('timeout')) {
            errorMessage = 'Camera took too long to start. This may happen if the camera is in use by another app.';
            canRetry = true;
          } else if (err.message.includes('Video element') || err.message.includes('DOM')) {
            errorMessage = 'Camera display error. Please refresh the page and try again.';
            canRetry = true;
          } else {
            errorMessage = err.message;
            canRetry = retryCount < 3;
          }
      }
    }

    setError(errorMessage);

    // Auto-retry with simpler constraints
    if (canRetry && retryCount < 4 && !cleanupRef.current) {
      console.log(`Auto-retrying with simpler constraints (attempt ${retryCount + 1}/4)`);
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        if (!cleanupRef.current) {
          initializeCamera();
        }
      }, 2000);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady || !videoLoaded || cleanupRef.current) {
      setError('Camera not ready for capture. Please wait for camera to load completely.');
      return;
    }

    const video = videoRef.current;

    // Double-check video dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera video not properly loaded. Please try again.');
      return;
    }

    setIsCapturing(true);

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to get canvas context');
      }

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      console.log('Capturing photo with dimensions:', videoWidth, 'x', videoHeight);

      // Set canvas dimensions to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Convert to image data with high quality
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      if (imageDataUrl === 'data:,' || imageDataUrl.length < 100) {
        throw new Error('Failed to capture image data - empty result');
      }

      setCapturedImage(imageDataUrl);
      console.log('Photo captured successfully, size:', imageDataUrl.length, 'bytes');

    } catch (captureError) {
      console.error('Photo capture error:', captureError);
      setError('Failed to capture photo: ' + (captureError as Error).message);
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
    if (cleanupRef.current) return;
    console.log('Switching camera from', facingMode, 'to', facingMode === 'user' ? 'environment' : 'user');
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const forceRetry = () => {
    if (cleanupRef.current) return;
    console.log('Force retry requested');
    setRetryCount(0);
    setError(null);
    cleanup();
    setTimeout(() => {
      if (!cleanupRef.current) {
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
              {retryCount > 0 ? 'Trying simpler camera settings...' : 'Initializing camera system...'}
            </p>
            {retryCount > 2 && (
              <p className="text-yellow-400 text-sm mt-2">
                If this continues, try closing other camera apps
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

            <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-600">
              <h4 className="font-semibold text-blue-400 mb-3">🔧 Quick Fix:</h4>
              <div className="text-left text-sm text-blue-200 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Close other camera apps (Instagram, Snapchat, etc.)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Check camera permissions in browser settings</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Try refreshing the page</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  <span>Restart your browser if needed</span>
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
                onClick={refreshPage}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Refresh Page</span>
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
            {(!videoReady || !videoLoaded) && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm">
                    {!videoLoaded ? 'Loading camera preview...' : 'Preparing camera...'}
                  </p>
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
                  disabled={!videoReady || !videoLoaded}
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
                  {videoReady && videoLoaded && <span className="text-green-400 ml-2">● Ready</span>}
                  {videoLoaded && !videoReady && <span className="text-yellow-400 ml-2">● Loading</span>}
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