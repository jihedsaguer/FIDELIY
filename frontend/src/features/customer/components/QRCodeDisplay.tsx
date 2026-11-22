import { forwardRef, type CSSProperties } from 'react';
import { QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

/**
 * QRCodeDisplay - renders a QR code on a <canvas> with the bundled `qrcode.react`
 * library (no network request). The forwarded ref exposes the canvas so callers
 * can export it (e.g. `canvas.toDataURL('image/png')`).
 */
interface QRCodeDisplayProps {
  value: string;
  /** Intrinsic pixel size of the canvas. */
  size?: number;
  className?: string;
  showPlaceholder?: boolean;
  /** Accessible name of the image (localized by the caller). */
  label?: string;
  /** Rendered (CSS) size; defaults to `size` px. */
  displaySize?: CSSProperties['width'];
}

function QRPlaceholder({ size = 200 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-[var(--subtle)] rounded-[var(--radius-xl)] border border-[var(--border)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <QrCode className="w-1/2 h-1/2 text-[var(--text-muted)]" />
    </div>
  );
}

export const QRCodeDisplay = forwardRef<HTMLCanvasElement, QRCodeDisplayProps>(function QRCodeDisplay(
  { value, size = 200, className = '', showPlaceholder = true, label, displaySize },
  ref,
) {
  if (!value) {
    return showPlaceholder ? <QRPlaceholder size={size} /> : null;
  }

  const cssSize = displaySize ?? size;
  return (
    <QRCodeCanvas
      ref={ref}
      value={value}
      size={size}
      level="M"
      marginSize={4}
      bgColor="#ffffff"
      fgColor="#000000"
      aria-label={label}
      className={className}
      style={{ width: cssSize, height: cssSize }}
    />
  );
});

export default QRCodeDisplay;
