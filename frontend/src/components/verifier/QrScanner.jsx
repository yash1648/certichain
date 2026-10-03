import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  Sparkles,
  QrCode as QrIcon,
  SwitchCamera,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  decodeQrFromImageData,
  parseQrCredential,
  playScanSuccessSound,
} from '../../utils/qrUtils';

export function QrScanner({
  onScanComplete,
  onTrySample,
  loading = false,
  disabled = false,
}) {
  const [subMode, setSubMode] = useState('camera'); // 'camera' | 'upload'
  const [cameraError, setCameraError] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Upload sub-mode state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(true);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Handle successful raw text decode
  const handleDecodedText = useCallback(
    (rawText) => {
      if (!isScanningRef.current) return;
      isScanningRef.current = false;
      setIsProcessing(true);
      setParseError(null);

      // Audio & visual feedback
      playScanSuccessSound();
      setScanSuccess(true);

      const result = parseQrCredential(rawText);

      if (result.success && result.file) {
        // Allow brief visual feedback, then forward file to verification
        setTimeout(() => {
          stopCamera();
          onScanComplete(result.file);
        }, 400);
      } else {
        setScanSuccess(false);
        setIsProcessing(false);
        setParseError(
          result.error ||
            'The scanned QR code is not a recognized CertiChain credential envelope.'
        );
        // Resume scanning after 3 seconds so user can try another code
        setTimeout(() => {
          if (subMode === 'camera') {
            isScanningRef.current = true;
            setParseError(null);
          }
        }, 3000);
      }
    },
    [onScanComplete, stopCamera, subMode]
  );

  // Start Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setParseError(null);
    setScanSuccess(false);
    isScanningRef.current = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser.');
      return;
    }

    try {
      // Find devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      } catch {
        // device enumeration not critical
      }

      const constraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const capabilities = track.getCapabilities();
          setTorchAvailable(!!capabilities.torch);
        }
      }

      // Frame scan loop
      const scanFrame = async () => {
        if (!isScanningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
          const width = video.videoWidth;
          const height = video.videoHeight;

          if (width > 0 && height > 0) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const imageData = ctx.getImageData(0, 0, width, height);

              const decoded = await decodeQrFromImageData(imageData);
              if (decoded) {
                handleDecodedText(decoded);
                return;
              }
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      };

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera access was denied. Please grant camera permissions in your browser or upload a QR image.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload a QR image instead.');
      } else {
        setCameraError(
          err.message || 'Unable to start camera. Please verify device permissions or try uploading an image.'
        );
      }
    }
  }, [selectedDeviceId, stopCamera, handleDecodedText]);

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch {
        // ignore
      }
    }
  };

  // Switch camera device
  const handleSwitchCamera = () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    setSelectedDeviceId(availableDevices[nextIndex].deviceId);
  };

  // Process uploaded image file
  const processImageFile = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        setUploadedPreview(img.src);

        // Draw image to canvas
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = await decodeQrFromImageData(imageData);

        if (decoded) {
          handleDecodedText(decoded);
        } else {
          setIsProcessing(false);
          setParseError(
            'No QR code detected in the selected image. Please ensure the image contains a clear, unobstructed CertiChain QR code.'
          );
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        setParseError('Failed to load image file.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Initialize camera when entering camera subMode
  useEffect(() => {
    if (subMode === 'camera' && !disabled && !loading) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [subMode, disabled, loading, startCamera, stopCamera]);

  return (
    <div className="qr-scanner-wrapper">
      {/* Hidden offscreen processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Sub-mode navigation: Camera vs Upload */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-3)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div className="segmented" style={{ maxWidth: '300px', margin: 0 }}>
          <button
            type="button"
            className={`segmented__item ${subMode === 'camera' ? 'is-active' : ''}`}
            onClick={() => {
              setSubMode('camera');
              setParseError(null);
            }}
          >
            <Camera size={14} aria-hidden="true" />
            <span>Camera Scan</span>
          </button>
          <button
            type="button"
            className={`segmented__item ${subMode === 'upload' ? 'is-active' : ''}`}
            onClick={() => {
              setSubMode('upload');
              setParseError(null);
            }}
          >
            <Upload size={14} aria-hidden="true" />
            <span>Upload Image</span>
          </button>
        </div>

        {onTrySample && (
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={onTrySample}
            disabled={loading || isProcessing}
          >
            Try Sample QR
          </Button>
        )}
      </div>

      {/* Camera Mode */}
      {subMode === 'camera' && (
        <div
          className="qr-viewfinder-box"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '560px',
            margin: '0 auto',
            height: '360px',
            backgroundColor: '#0a0f1d',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: `2px solid ${scanSuccess ? 'var(--ok)' : 'var(--line-strong)'}`,
            boxShadow: scanSuccess
              ? '0 0 24px rgba(5, 150, 105, 0.4)'
              : 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {cameraError ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-4)',
                maxWidth: '400px',
                color: 'var(--ink-inverse)',
              }}
            >
              <AlertCircle
                size={36}
                style={{ color: 'var(--warn)', margin: '0 auto 12px' }}
              />
              <h4 style={{ margin: '0 0 8px', fontSize: 'var(--text-base)' }}>
                Camera Unavailable
              </h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--line)', marginBottom: '16px' }}>
                {cameraError}
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                  onClick={startCamera}
                  icon={RefreshCw}
                >
                  Retry
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSubMode('upload')}
                  icon={Upload}
                >
                  Upload QR Image
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* The Live Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />

              {/* Viewfinder Vignette Overlay */}
              <div
                className="qr-overlay-mask"
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Targeting Frame Reticle */}
                <div
                  className={`qr-reticle ${scanSuccess ? 'is-success' : ''}`}
                  style={{
                    width: '240px',
                    height: '240px',
                    position: 'relative',
                    borderRadius: '16px',
                    boxShadow: '0 0 0 9999px rgba(10, 15, 29, 0.55)',
                  }}
                >
                  {/* 4 Glowing Corner Brackets */}
                  <div className="qr-corner qr-corner--tl" />
                  <div className="qr-corner qr-corner--tr" />
                  <div className="qr-corner qr-corner--bl" />
                  <div className="qr-corner qr-corner--br" />

                  {/* Laser Scanning Line */}
                  {!scanSuccess && <div className="qr-laser-beam" />}

                  {scanSuccess && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(5, 150, 105, 0.25)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle2
                        size={54}
                        style={{ color: '#ffffff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Top Controls Overlay: Camera switch and Torch */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px',
                  zIndex: 10,
                }}
              >
                {availableDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="btn btn-ghost btn-sm"
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.7)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    title="Switch camera"
                  >
                    <SwitchCamera size={16} />
                  </button>
                )}

                {torchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className="btn btn-ghost btn-sm"
                    style={{
                      backgroundColor: torchOn
                        ? 'var(--accent)'
                        : 'rgba(15, 23, 42, 0.7)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    title={torchOn ? 'Turn off flash' : 'Turn on flash'}
                  >
                    <Zap size={16} />
                  </button>
                )}
              </div>

              {/* Bottom Instructions Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    fontSize: 'var(--text-xs)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontWeight: 500,
                  }}
                >
                  {isProcessing
                    ? 'Verifying scanned credential...'
                    : 'Align QR code within the frame'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Upload Image Mode */}
      {subMode === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget.contains(e.relatedTarget)) return;
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) processImageFile(file);
          }}
          className="dropzone"
          data-dragover={isDragOver || undefined}
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            minHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file);
              e.target.value = '';
            }}
          />

          <span className="dropzone__icon">
            {isProcessing ? (
              <span className="spinner" />
            ) : uploadedPreview ? (
              <QrIcon size={24} style={{ color: 'var(--accent)' }} />
            ) : (
              <ImageIcon size={24} />
            )}
          </span>

          <h3 className="dropzone__title" style={{ marginTop: '8px' }}>
            {isProcessing
              ? 'Analyzing QR code image...'
              : 'Drop QR code image here'}
          </h3>

          <p className="dropzone__note" style={{ maxWidth: '380px' }}>
            Upload a photo or screenshot of the credential certificate QR code (.png, .jpg, .webp).
          </p>

          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            style={{ marginTop: '12px' }}
          >
            Browse Image
          </Button>
        </div>
      )}

      {/* Error message banner */}
      {parseError && (
        <div
          className="animate-fade-in"
          style={{
            maxWidth: '560px',
            margin: 'var(--space-3) auto 0',
            padding: '10px 14px',
            backgroundColor: 'var(--bad-subtle)',
            border: '1px solid var(--bad-line)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: 'var(--text-xs)',
            color: 'var(--bad)',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{parseError}</div>
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--bad)' }}
            onClick={() => {
              setParseError(null);
              if (subMode === 'camera') {
                isScanningRef.current = true;
              }
            }}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
