import { useI18n } from '../../../shared/i18n/i18n';
import { DECORATIVE_QR_PATH, DECORATIVE_QR_SIZE, SAMPLE_SHORT_ID } from '../utils/sampleData';
import { StickerChip } from './StickerChip';

/**
 * CSS phone frame showing what a customer presents at the counter: a
 * decorative (non-scannable, aria-hidden) QR pattern and a sample short ID.
 * Visibly labelled "Exemple".
 */
export function PhoneMockup() {
  const { t } = useI18n();
  return (
    <figure className="landing-phone" aria-label={t('landingPhoneLabel')}>
      <StickerChip tone="ink" tilt="end" className="landing-phone-badge">
        {t('landingExample')}
      </StickerChip>
      <div className="landing-phone-screen">
        <span aria-hidden="true" className="landing-phone-notch" />
        <p className="landing-phone-caption">{t('landingPhoneQrCaption')}</p>
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox={`-2 -2 ${DECORATIVE_QR_SIZE + 4} ${DECORATIVE_QR_SIZE + 4}`}
          className="landing-phone-qr"
          shapeRendering="crispEdges"
        >
          <rect x="-2" y="-2" width={DECORATIVE_QR_SIZE + 4} height={DECORATIVE_QR_SIZE + 4} fill="#ffffff" />
          <path d={DECORATIVE_QR_PATH} fill="var(--landing-ink)" />
        </svg>
        <figcaption className="landing-phone-id">
          <span className="block text-xs">{t('landingPhoneShortIdLabel')}</span>
          <span dir="ltr" className="landing-phone-id-value">
            {SAMPLE_SHORT_ID}
          </span>
        </figcaption>
      </div>
    </figure>
  );
}
