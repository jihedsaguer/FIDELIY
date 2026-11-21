import { useI18n } from '../../../../shared/i18n/i18n';
import type { ScannerViewportProps } from '../types';

/**
 * ScannerViewport - Renders the camera preview with scanning frame
 * 
 * Responsibilities:
 * - Display the camera video feed
 * - Show the scanning frame overlay
 * - Display instruction text
 */
export const ScannerViewport = ({ videoRef }: ScannerViewportProps) => {
  const { t } = useI18n();
  
  return (
    <div className="space-y-6">
      {/* Camera Preview */}
      <div className="relative mx-auto w-full max-w-sm">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-[var(--border)] bg-black">
          <video 
            ref={videoRef} 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
          
          {/* Scan Overlay - Glass effect frame */}
          <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.4) 100%)'
          }} />
          
          {/* Scanning frame */}
          <div className="absolute inset-x-6 inset-y-1/4 border-2 rounded-[var(--radius-lg)]" style={{
            borderColor: 'var(--brand)',
            background: 'rgba(249, 115, 22, 0.1)',
          }} />
          
          {/* Corner markers */}
          <div className="absolute w-4 h-4 border-l-2 border-t-2 rounded-tl-[var(--radius-lg)]" style={{
            top: '25%', left: '1.5rem',
            borderColor: 'var(--brand)'
          }} />
          <div className="absolute w-4 h-4 border-r-2 border-t-2 rounded-tr-[var(--radius-lg)]" style={{
            top: '25%', right: '1.5rem',
            borderColor: 'var(--brand)'
          }} />
          <div className="absolute w-4 h-4 border-l-2 border-b-2 rounded-bl-[var(--radius-lg)]" style={{
            bottom: '25%', left: '1.5rem',
            borderColor: 'var(--brand)'
          }} />
          <div className="absolute w-4 h-4 border-r-2 border-b-2 rounded-br-[var(--radius-lg)]" style={{
            bottom: '25%', right: '1.5rem',
            borderColor: 'var(--brand)'
          }} />
        </div>
        
        {/* Instruction */}
        <p className="text-center text-[var(--text-muted)] text-sm mt-4">
          {t('positionQRInFrame')}
        </p>
      </div>
    </div>
  );
};

ScannerViewport.displayName = 'ScannerViewport';
