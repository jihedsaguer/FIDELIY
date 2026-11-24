import { useState, type ComponentType } from 'react';
import { Plus, QrCode, RotateCcw, ScanLine, Stamp } from 'lucide-react';
import { useI18n, type MessageKey } from '../../../shared/i18n/i18n';
import { LoyaltyCardView } from '../../loyalty/components/LoyaltyCardView';
import {
  SAMPLE_DEMO_START_STAMPS,
  SAMPLE_JOINED_AT,
  SAMPLE_POINTS,
  SAMPLE_STAMP_TARGET,
  samplePointRewards,
  sampleStampRewards,
} from '../utils/sampleData';
import { SectionHeading } from './SectionHeading';
import { StickerChip } from './StickerChip';

const STEPS: Array<{ icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; title: MessageKey; text: MessageKey }> = [
  { icon: QrCode, title: 'landingProofStep1Title', text: 'landingProofStep1Text' },
  { icon: ScanLine, title: 'landingProofStep2Title', text: 'landingProofStep2Text' },
  { icon: Stamp, title: 'landingProofStep3Title', text: 'landingProofStep3Text' },
];

/**
 * "Au comptoir, en 3 gestes": the counter flow plus an interactive example
 * card (adds sample stamps locally, reusing the card's stamp-in animation)
 * and a sample points card. Everything here is labelled as example data.
 */
export function ProofSection({ displayName }: { displayName: string }) {
  const { t } = useI18n();
  const [stamps, setStamps] = useState(SAMPLE_DEMO_START_STAMPS);
  const full = stamps >= SAMPLE_STAMP_TARGET;

  return (
    <section aria-labelledby="landing-proof-title" className="landing-section landing-white">
      <div className="landing-container grid gap-10 lg:grid-cols-2 lg:items-start">
        <div data-reveal className="landing-reveal">
          <SectionHeading id="landing-proof-title" kicker={t('landingProofKicker')} title={t('landingProofTitle')} />
          <ol className="landing-proof-steps">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="landing-proof-step">
                <span aria-hidden="true" className="landing-proof-icon">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="landing-h3">
                    <span className="landing-step-index" dir="ltr">{`${index + 1}.`}</span> {t(title)}
                  </h3>
                  <p className="landing-body">{t(text)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div data-reveal className="landing-reveal landing-demo">
          <div data-testid="demo-card" className="landing-sample landing-demo-card" role="group" aria-label={t('landingSampleCardLabel')}>
            <StickerChip tone="highlight" tilt="end" className="landing-sample-badge">
              {t('landingExample')}
            </StickerChip>
            <LoyaltyCardView
              businessName={displayName}
              logoUrl={null}
              programType="stamps"
              balance={{ stamps, points: 0 }}
              rewards={sampleStampRewards(t('landingSampleRewardStamps'))}
              joinedAt={SAMPLE_JOINED_AT}
            />
          </div>
          <div className="landing-demo-controls">
            <button
              type="button"
              disabled={full}
              onClick={() => setStamps((value) => Math.min(value + 1, SAMPLE_STAMP_TARGET))}
              className="landing-button landing-button--ink"
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
              {t('landingDemoAddStamp')}
            </button>
            {stamps !== SAMPLE_DEMO_START_STAMPS && (
              <button type="button" onClick={() => setStamps(SAMPLE_DEMO_START_STAMPS)} className="landing-text-button">
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {t('landingDemoReset')}
              </button>
            )}
          </div>
          <p data-testid="demo-status" role="status" className="landing-demo-status">
            {`${t('landingDemoProgress')} ${stamps} / ${SAMPLE_STAMP_TARGET} ${t('stamps')}`}
          </p>
          <p className="landing-demo-note">{t('landingDemoNote')}</p>

          <div className="landing-sample landing-points-card" role="group" aria-label={t('landingSampleCardLabel')}>
            <StickerChip tone="paper" tilt="start" className="landing-sample-badge">
              {t('landingExample')}
            </StickerChip>
            <LoyaltyCardView
              businessName={t('landingSamplePointsBusiness')}
              logoUrl={null}
              programType="points"
              balance={{ stamps: 0, points: SAMPLE_POINTS }}
              rewards={samplePointRewards(t('landingSampleRewardPoints'))}
              joinedAt={SAMPLE_JOINED_AT}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
