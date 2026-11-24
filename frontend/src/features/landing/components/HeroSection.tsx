import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { paths } from '../../../app/routes/paths';
import { useI18n } from '../../../shared/i18n/i18n';
import { LoyaltyCardView } from '../../loyalty/components/LoyaltyCardView';
import { SAMPLE_HERO_STAMPS, SAMPLE_JOINED_AT, sampleStampRewards } from '../utils/sampleData';
import { PhoneMockup } from './PhoneMockup';
import { StickerChip } from './StickerChip';

interface HeroSectionProps {
  businessName: string;
  onBusinessNameChange: (value: string) => void;
  /** Name shown on the sample cards (typed name, or the localized fallback). */
  displayName: string;
}

/**
 * Hero: the page's only h1, a business-name field that live-renders into a
 * sample loyalty card (client-only, never stored or sent), the register CTA,
 * the customer link, and the example phone.
 */
export function HeroSection({ businessName, onBusinessNameChange, displayName }: HeroSectionProps) {
  const { t } = useI18n();
  const inputId = useId();
  const hintId = useId();

  return (
    <section aria-labelledby="landing-hero-title" className="landing-hero landing-on-dark">
      <div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy">
          <StickerChip>{t('landingHeroSticker')}</StickerChip>
          <h1 id="landing-hero-title" className="landing-display landing-h1">
            <span className="block">{t('landingHeroTitleLead')}</span>{' '}
            <span className="landing-h1-accent block">{t('landingHeroTitleAccent')}</span>
          </h1>
          <p className="landing-lead">{t('landingHeroSubtitle')}</p>

          <div className="landing-name-field">
            <label htmlFor={inputId} className="landing-field-label">
              {t('landingHeroNameLabel')}
            </label>
            <input
              id={inputId}
              type="text"
              maxLength={255}
              autoComplete="off"
              value={businessName}
              placeholder={t('landingHeroNamePlaceholder')}
              aria-describedby={hintId}
              onChange={(event) => onBusinessNameChange(event.target.value)}
              className="landing-text-input"
            />
            <p id={hintId} className="landing-field-hint">
              {t('landingHeroNameHint')}
            </p>
          </div>

          <div className="landing-hero-actions">
            <Link to={paths.merchantRegister} className="landing-button landing-button--primary landing-button--lg">
              {t('landingCtaCreate')}
              <ArrowRight aria-hidden="true" className="h-5 w-5 rtl:-scale-x-100" />
            </Link>
            <Link to={paths.customerLogin} className="landing-text-link">
              {t('landingHeroCustomerLink')}
            </Link>
          </div>
        </div>

        <div className="landing-hero-visuals">
          <div data-testid="hero-sample-card" className="landing-sample landing-hero-card" role="group" aria-label={t('landingSampleCardLabel')}>
            <StickerChip tone="paper" tilt="start" className="landing-sample-badge">
              {t('landingExample')}
            </StickerChip>
            <LoyaltyCardView
              businessName={displayName}
              logoUrl={null}
              programType="stamps"
              balance={{ stamps: SAMPLE_HERO_STAMPS, points: 0 }}
              rewards={sampleStampRewards(t('landingSampleRewardStamps'))}
              joinedAt={SAMPLE_JOINED_AT}
              isFeatured
            />
          </div>
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
