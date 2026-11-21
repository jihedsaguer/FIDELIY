import { useRef, useState, useEffect, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import { defaultCameraConfig } from '../types';
import type { CameraConfig } from '../types';

/**
 * Custom hook for managing camera lifecycle and QR scanning
 * 
 * Responsibilities:
 * - Camera permission request
 * - Camera stream initialization and cleanup
 * - QR code scanning using @zxing/library
 * - Error handling for camera access
 */
export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.RefObject<MediaStream | null>;
  codeReaderRef: React.RefObject<BrowserQRCodeReader | null>;
  isScanning: boolean;
  permissionRequested: boolean;
  cameraError?: string;
  requestCameraPermission: () => Promise<void>;
  startScanning: (onScanResult: (result: string) => void) => Promise<void>;
  stopCamera: () => void;
  resetCamera: () => void;
}

/**
 * Custom hook for camera and QR scanning functionality
 */
export function useCamera(config: CameraConfig = defaultCameraConfig): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const scanningRef = useRef(false);
  const permissionRequestedRef = useRef(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [cameraError, setCameraError] = useState<string>();

  // Initialize code reader when needed
  useEffect(() => {
    if (!videoRef.current) return;
    
    codeReaderRef.current = new BrowserQRCodeReader();
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  /**
   * Request camera permission from the user
   */
  const requestCameraPermission = useCallback(async () => {
    if (permissionRequestedRef.current) return;
    permissionRequestedRef.current = true;
    setPermissionRequested(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: config,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraError(undefined);
    } catch (err) {
      console.warn('Camera permission denied:', err);
      setCameraError('Camera access denied. Please allow camera access to scan QR codes.');
      throw err;
    }
  }, [config]);

  /**
   * Start the QR code scanning process
   */
  const startScanning = useCallback(async (onScanResult: (result: string) => void) => {
    const video = videoRef.current;
    const codeReader = codeReaderRef.current;
    
    if (!video || !codeReader) {
      setCameraError('Camera not initialized');
      return;
    }

    try {
      const videoDevices = await codeReader.listVideoInputDevices();
      const backCamera = videoDevices.find((d: MediaDeviceInfo) => 
        d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
      const deviceId = backCamera?.deviceId || videoDevices[0]?.deviceId;

      if (!deviceId) {
        setCameraError('No camera devices found');
        return;
      }

      scanningRef.current = false;
      setIsScanning(true);

      await codeReader.decodeFromVideoDevice(
        deviceId,
        video,
        (result, err) => {
          if (result && !scanningRef.current) {
            scanningRef.current = true;
            setIsScanning(false);
            onScanResult(result.getText());
          }
          if (err && err.name !== 'NotFoundException') {
            console.warn('QR scan error:', err);
          }
        }
      );
    } catch (err) {
      console.warn('QR scan initialization error:', err);
      setCameraError('Camera initialization failed');
      throw err;
    }
  }, []);

  /**
   * Stop the camera stream and clean up resources
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    scanningRef.current = false;
    setIsScanning(false);
  }, []);

  /**
   * Reset camera state completely
   */
  const resetCamera = useCallback(() => {
    stopCamera();
    setCameraError(undefined);
    permissionRequestedRef.current = false;
    setPermissionRequested(false);
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
  }, [stopCamera]);

  return {
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    streamRef,
    codeReaderRef,
    isScanning,
    permissionRequested,
    cameraError,
    requestCameraPermission,
    startScanning,
    stopCamera,
    resetCamera,
  };
}
