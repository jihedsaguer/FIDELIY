import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraStartError, useCamera } from './useCamera';

type DecodeCallback = (result: { getText: () => string } | null, error?: Error) => void;

const zxing = vi.hoisted(() => ({
  instances: [] as Array<{
    decodeFromConstraints: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    listVideoInputDevices: ReturnType<typeof vi.fn>;
    decodeFromVideoDevice: ReturnType<typeof vi.fn>;
  }>,
  decodeImpl: undefined as undefined | ((constraints: unknown, video: unknown, cb: DecodeCallback) => Promise<void>),
}));

vi.mock('@zxing/library', () => ({
  BrowserQRCodeReader: vi.fn(function BrowserQRCodeReader(this: Record<string, unknown>) {
    const instance = {
      decodeFromConstraints: vi.fn((constraints: unknown, video: unknown, cb: DecodeCallback) =>
        zxing.decodeImpl ? zxing.decodeImpl(constraints, video, cb) : Promise.resolve(),
      ),
      reset: vi.fn(),
      listVideoInputDevices: vi.fn(async () => []),
      decodeFromVideoDevice: vi.fn(async () => undefined),
    };
    zxing.instances.push(instance);
    Object.assign(this, instance);
  }),
}));

const getUserMedia = vi.fn();

function setSecureContext(value: boolean) {
  Object.defineProperty(window, 'isSecureContext', { value, configurable: true });
}

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true });
}

function namedError(name: string): Error {
  const err = new Error(`${name} message`);
  err.name = name;
  return err;
}

async function startError(promise: Promise<void>): Promise<CameraStartError> {
  try {
    await promise;
  } catch (err) {
    return err as CameraStartError;
  }
  throw new Error('start() did not reject');
}

describe('useCamera', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    zxing.instances.length = 0;
    zxing.decodeImpl = undefined;
    getUserMedia.mockReset();
    setSecureContext(true);
    setMediaDevices({ getUserMedia });
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('refuses to start outside a secure context without touching the camera', async () => {
    setSecureContext(false);
    const { result } = renderHook(() => useCamera());
    const video = document.createElement('video');

    const err = await startError(result.current.start(video, vi.fn()));

    expect(err).toBeInstanceOf(CameraStartError);
    expect(err.kind).toBe('insecure');
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(zxing.instances).toHaveLength(0);
  });

  it('reports an unsupported browser when mediaDevices.getUserMedia is missing', async () => {
    setMediaDevices(undefined);
    const { result } = renderHook(() => useCamera());

    const err = await startError(result.current.start(document.createElement('video'), vi.fn()));

    expect(err.kind).toBe('unsupported');
    expect(zxing.instances).toHaveLength(0);
  });

  it('asks for the rear camera by constraints, without listing devices first', async () => {
    const { result } = renderHook(() => useCamera());
    const video = document.createElement('video');

    await result.current.start(video, vi.fn());

    expect(zxing.instances).toHaveLength(1);
    const reader = zxing.instances[0];
    expect(reader.listVideoInputDevices).not.toHaveBeenCalled();
    expect(reader.decodeFromVideoDevice).not.toHaveBeenCalled();
    expect(reader.decodeFromConstraints).toHaveBeenCalledTimes(1);
    const [constraints, target] = reader.decodeFromConstraints.mock.calls[0];
    expect(constraints).toEqual({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    expect(target).toBe(video);
  });

  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['NotFoundError', 'no-camera'],
    ['DevicesNotFoundError', 'no-camera'],
    ['OverconstrainedError', 'no-camera'],
    ['NotReadableError', 'busy'],
    ['TrackStartError', 'busy'],
    ['AbortError', 'busy'],
    ['TypeError', 'unknown'],
  ])('maps %s to the %s kind and logs only the error name', async (name, kind) => {
    zxing.decodeImpl = async () => {
      throw namedError(name);
    };
    const { result } = renderHook(() => useCamera());

    const err = await startError(result.current.start(document.createElement('video'), vi.fn()));

    expect(err.kind).toBe(kind);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).toContain(name);
    expect(warn.mock.calls[0].join(' ')).not.toContain('message');
  });

  it('releases the camera and reports the first decoded QR exactly once', async () => {
    let callback: DecodeCallback = () => undefined;
    zxing.decodeImpl = async (_c, _v, cb) => {
      callback = cb;
    };
    const onResult = vi.fn();
    const { result } = renderHook(() => useCamera());
    await result.current.start(document.createElement('video'), onResult);
    const reader = zxing.instances[0];

    callback(null, namedError('NotFoundException'));
    expect(onResult).not.toHaveBeenCalled();
    expect(reader.reset).not.toHaveBeenCalled();

    callback({ getText: () => 'qr-credential-1' });
    callback({ getText: () => 'qr-credential-2' });

    expect(reader.reset).toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('qr-credential-1');
  });

  it('stop() resets the active reader', async () => {
    const { result } = renderHook(() => useCamera());
    await result.current.start(document.createElement('video'), vi.fn());

    result.current.stop();

    expect(zxing.instances[0].reset).toHaveBeenCalled();
  });

  it('stop() before any start is safe', () => {
    const { result } = renderHook(() => useCamera());
    expect(() => result.current.stop()).not.toThrow();
  });

  it('creates a new reader on every start', async () => {
    const { result } = renderHook(() => useCamera());
    await result.current.start(document.createElement('video'), vi.fn());
    result.current.stop();
    await result.current.start(document.createElement('video'), vi.fn());

    expect(zxing.instances).toHaveLength(2);
  });

  it('releases a stream that opens after stop() was called', async () => {
    let finishOpening: () => void = () => undefined;
    zxing.decodeImpl = () => new Promise<void>((resolve) => {
      finishOpening = resolve;
    });
    const { result } = renderHook(() => useCamera());
    const pending = result.current.start(document.createElement('video'), vi.fn());
    const reader = zxing.instances[0];

    result.current.stop();
    reader.reset.mockClear();
    finishOpening();
    await pending;

    expect(reader.reset).toHaveBeenCalled();
  });

  it('a late stream from an abandoned start does not stop the newer session', async () => {
    const finishers: Array<() => void> = [];
    zxing.decodeImpl = () => new Promise<void>((resolve) => {
      finishers.push(resolve);
    });
    const { result } = renderHook(() => useCamera());
    const first = result.current.start(document.createElement('video'), vi.fn());
    result.current.stop();
    const second = result.current.start(document.createElement('video'), vi.fn());
    const [readerA, readerB] = zxing.instances;
    readerA.reset.mockClear();
    readerB.reset.mockClear();

    finishers[1]();
    await second;
    finishers[0]();
    await first;

    expect(readerA.reset).toHaveBeenCalled();
    expect(readerB.reset).not.toHaveBeenCalled();
  });
});
