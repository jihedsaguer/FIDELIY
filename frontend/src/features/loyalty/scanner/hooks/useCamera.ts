import { useCallback, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';

/**
 * Camera + QR decoding for the merchant scanner.
 *
 * `start(video, onResult)` opens the rear camera by constraints (no device listing, which
 * hides labels before permission) with a NEW reader each time, and reports the first decoded
 * QR once, after releasing the camera. `stop()` releases the camera; it is idempotent.
 * Failures reject with a `CameraStartError` whose `kind` the UI turns into a message.
 */
export type CameraErrorKind = 'insecure' | 'unsupported' | 'denied' | 'no-camera' | 'busy' | 'unknown';

export class CameraStartError extends Error {
  readonly kind: CameraErrorKind;

  constructor(kind: CameraErrorKind) {
    super(`camera: ${kind}`);
    this.name = 'CameraStartError';
    this.kind = kind;
  }
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  start: (video: HTMLVideoElement, onResult: (text: string) => void) => Promise<void>;
  stop: () => void;
}

const SCAN_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
};

function errorKind(name: string): CameraErrorKind {
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    default:
      return 'unknown';
  }
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The reader of the current session; null when stopped.
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  const stop = useCallback(() => {
    const reader = readerRef.current;
    readerRef.current = null;
    reader?.reset();
  }, []);

  const start = useCallback(async (video: HTMLVideoElement, onResult: (text: string) => void) => {
    if (!window.isSecureContext) throw new CameraStartError('insecure');
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraStartError('unsupported');

    stop();
    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;
    let done = false;

    try {
      await reader.decodeFromConstraints(SCAN_CONSTRAINTS, video, (result) => {
        // Per-frame decode failures (NotFound/Checksum/Format) arrive as errors: ignore them.
        if (!result || done) return;
        done = true;
        reader.reset();
        if (readerRef.current === reader) readerRef.current = null;
        onResult(result.getText());
      });
    } catch (err) {
      reader.reset();
      if (readerRef.current === reader) readerRef.current = null;
      const name = err instanceof Error ? err.name : 'UnknownError';
      console.warn('Camera start failed:', name);
      throw new CameraStartError(errorKind(name));
    }

    // Stopped (or restarted) while the stream was opening: release this late stream.
    if (readerRef.current !== reader) reader.reset();
  }, [stop]);

  return {
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    start,
    stop,
  };
}
