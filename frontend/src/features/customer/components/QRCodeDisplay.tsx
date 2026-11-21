import { useState, useEffect } from 'react';
import { QrCode } from 'lucide-react';

/**
 * QRCodeDisplay - Browser-based QR code generator using CDN library
 * 
 * This component handles QR code generation using the qrcode library loaded from CDN.
 * It gracefully handles loading states, errors, and script initialization.
 * 
 * Note: This uses a browser-based QR library loaded from CDN. For production, consider
 * using a local dependency like qrcode.react for better reliability.
 */
interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  showPlaceholder?: boolean;
}

/**
 * Default placeholder for QR code when value is empty or loading
 */
function QRPlaceholder({ size = 200 }: { size?: number }) {
  return (
    <div 
      className="flex items-center justify-center w-full h-full bg-[var(--subtle)] rounded-[var(--radius-xl)] border border-[var(--border)]"
      style={{ width: size, height: size }}
    >
      <QrCode className="w-1/2 h-1/2 text-[var(--text-muted)]" />
    </div>
  );
}

/**
 * QRCodeDisplay component
 * 
 * Generates a QR code image from a string value using browser-based library.
 * Handles script loading and initialization automatically.
 */
export function QRCodeDisplay({
  value,
  size = 200,
  className = '',
  showPlaceholder = true,
}: QRCodeDisplayProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!value) {
      setQrUrl('');
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let isMounted = true;
    
    async function generateQR() {
      setIsLoading(true);
      setHasError(false);

      try {
        // Check if QRCode library is already loaded
        if ((window as any).QRCode) {
          const url = (window as any).QRCode.toDataURL(value, {
            width: size,
            margin: 2,
          });
          if (isMounted) {
            setQrUrl(url);
          }
          return;
        }

        // Load QRCode library from CDN
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load QR code library'));
          document.body.appendChild(script);
        });

        // Generate QR code after library is loaded
        if ((window as any).QRCode && isMounted) {
          const url = (window as any).QRCode.toDataURL(value, {
            width: size,
            margin: 2,
          });
          setQrUrl(url);
        }
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    generateQR();

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (!value) {
    return showPlaceholder ? <QRPlaceholder size={size} /> : null;
  }

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center w-full h-full bg-[var(--subtle)] rounded-[var(--radius-xl)] border border-[var(--border)] ${className}`}
        style={{ width: size, height: size }}
      >
        <QrCode className="w-1/2 h-1/2 text-[var(--text-muted)] animate-pulse" />
      </div>
    );
  }

  if (hasError || !qrUrl) {
    return (
      <div 
        className={`flex items-center justify-center w-full h-full bg-[var(--danger-light)] border border-[var(--danger)] rounded-[var(--radius-xl)] ${className}`}
        style={{ width: size, height: size }}
      >
        <QrCode className="w-1/2 h-1/2 text-[var(--danger)]" />
      </div>
    );
  }

  return (
    <img 
      src={qrUrl} 
      alt="QR Code" 
      className={`w-full h-auto ${className}`}
      style={{ maxWidth: size, maxHeight: size }}
    />
  );
}

export default QRCodeDisplay;
