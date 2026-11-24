import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Coins,
  Gift,
  Layers,
  ListChecks,
  QrCode,
  ScanLine,
  Smartphone,
  Stamp,
  Store,
  Undo2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { paths } from '../../../app/routes/paths';
import { Accordion, AccordionItem } from '../../../components/ui/Accordion';
import { useI18n, type MessageKey } from '../../../shared/i18n/i18n';
import { SectionHeading } from './SectionHeading';
import { StickerChip } from './StickerChip';

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

/** Problem statement with decorative stickers (at most two inline below 640px). */
export function ProblemSection() {
  const { t } = useI18n();
  const stickers: Array<[MessageKey, 'start' | 'end']> = [
    ['landingStickerStamps', 'start'],
    ['landingStickerPoints', 'end'],
    ['landingStickerQr', 'start'],
    ['landingStickerRewards', 'end'],
    ['landingStickerBranches', 'start'],
  ];
  return (
    <section aria-labelledby="landing-problem-title" className="landing-section landing-paper">
      <div data-reveal className="landing-container landing-reveal landing-narrow">
        <SectionHeading id="landing-problem-title" kicker={t('landingProblemKicker')} title={t('landingProblemTitle')} />
        <p className="landing-body landing-body-lg">{t('landingProblemText')}</p>
        <div aria-hidden="true" className="landing-sticker-row">
          {stickers.map(([key, tilt], index) => (
            <StickerChip key={key} tilt={tilt} tone={index % 2 === 0 ? 'highlight' : 'ink'} className={index >= 2 ? 'landing-sticker-extra' : undefined}>
              {t(key)}
            </StickerChip>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Qualitative paper card vs FIDELIY comparison. */
export function ComparisonSection() {
  const { t } = useI18n();
  const paper: MessageKey[] = ['landingComparePaper1', 'landingComparePaper2', 'landingComparePaper3'];
  const app: MessageKey[] = ['landingCompareApp1', 'landingCompareApp2', 'landingCompareApp3', 'landingCompareApp4', 'landingCompareApp5'];
  return (
    <section aria-labelledby="landing-compare-title" className="landing-section landing-paper landing-section-tight">
      <div className="landing-container">
        <SectionHeading id="landing-compare-title" kicker={t('landingCompareKicker')} title={t('landingCompareTitle')} />
        <div className="landing-compare-grid">
          <div data-reveal className="landing-card landing-reveal landing-tilt-start">
            <h3 className="landing-display landing-h3-display">{t('landingComparePaperTitle')}</h3>
            <ul className="landing-list">
              {paper.map((key) => (
                <li key={key}>
                  <X aria-hidden="true" className="landing-list-icon landing-list-icon--muted" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal className="landing-card landing-card--ink landing-on-dark landing-reveal landing-tilt-end">
            <h3 className="landing-display landing-h3-display" dir="ltr">
              {t('landingCompareAppTitle')}
            </h3>
            <ul className="landing-list">
              {app.map((key) => (
                <li key={key}>
                  <Check aria-hidden="true" className="landing-list-icon landing-list-icon--highlight" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURE_GROUPS: Array<{ kicker: MessageKey; title: MessageKey; items: Array<[Icon, MessageKey]> }> = [
  {
    kicker: 'landingFeatCustomersKicker',
    title: 'landingFeatCustomersTitle',
    items: [
      [QrCode, 'landingFeatCustomers1'],
      [Smartphone, 'landingFeatCustomers2'],
      [ScanLine, 'landingFeatCustomers3'],
      [Gift, 'landingFeatCustomers4'],
    ],
  },
  {
    kicker: 'landingFeatCounterKicker',
    title: 'landingFeatCounterTitle',
    items: [
      [ScanLine, 'landingFeatCounter1'],
      [Stamp, 'landingFeatCounter2'],
      [UserPlus, 'landingFeatCounter3'],
      [Undo2, 'landingFeatCounter4'],
    ],
  },
  {
    kicker: 'landingFeatOwnerKicker',
    title: 'landingFeatOwnerTitle',
    items: [
      [Coins, 'landingFeatOwner1'],
      [Layers, 'landingFeatOwner2'],
      [Store, 'landingFeatOwner3'],
      [Users, 'landingFeatOwner4'],
    ],
  },
];

/** Three feature groups: Release 1 facts only. */
export function FeaturesSection() {
  const { t } = useI18n();
  return (
    <section id="features" aria-labelledby="landing-features-title" className="landing-section landing-signature landing-on-dark">
      <div className="landing-container">
        <SectionHeading id="landing-features-title" kicker={t('landingFeaturesKicker')} title={t('landingFeaturesTitle')} />
        <div className="landing-feature-grid">
          {FEATURE_GROUPS.map((group, index) => (
            <article
              key={group.title}
              data-reveal
              className="landing-card landing-feature-card landing-reveal"
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <p className="landing-kicker landing-kicker--card">{t(group.kicker)}</p>
              <h3 className="landing-display landing-h3-display">{t(group.title)}</h3>
              <ul className="landing-icon-list">
                {group.items.map(([ItemIcon, key]) => (
                  <li key={key}>
                    <span aria-hidden="true" className="landing-icon-badge">
                      <ItemIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Getting started in three steps. */
export function StepsSection() {
  const { t } = useI18n();
  const steps: Array<[MessageKey, MessageKey]> = [
    ['landingStep1Title', 'landingStep1Text'],
    ['landingStep2Title', 'landingStep2Text'],
    ['landingStep3Title', 'landingStep3Text'],
  ];
  return (
    <section id="how-it-works" aria-labelledby="landing-steps-title" className="landing-section landing-paper">
      <div className="landing-container">
        <SectionHeading id="landing-steps-title" kicker={t('landingStepsKicker')} title={t('landingStepsTitle')} />
        <ol className="landing-steps">
          {steps.map(([title, text], index) => (
            <li key={title} data-reveal className="landing-step landing-reveal" style={{ transitionDelay: `${index * 80}ms` }}>
              <span aria-hidden="true" dir="ltr" className="landing-step-number">
                {`0${index + 1}`}
              </span>
              <h3 className="landing-h3">{t(title)}</h3>
              <p className="landing-body">{t(text)}</p>
            </li>
          ))}
        </ol>
        <div className="landing-steps-cta">
          <ListChecks aria-hidden="true" className="h-6 w-6 shrink-0" />
          <Link to={paths.merchantRegister} className="landing-button landing-button--signature">
            {t('landingCtaCreate')}
            <ArrowRight aria-hidden="true" className="h-5 w-5 rtl:-scale-x-100" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Honest "founding merchants" call to action: no logos, counts or quotes. */
export function FoundingSection() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="landing-founding-title" className="landing-section landing-ink landing-on-dark">
      <div data-reveal className="landing-container landing-reveal landing-founding">
        <SectionHeading id="landing-founding-title" kicker={t('landingFoundingKicker')} title={t('landingFoundingTitle')} />
        <p className="landing-body landing-body-lg">{t('landingFoundingText')}</p>
        <Link to={paths.merchantRegister} className="landing-button landing-button--primary landing-button--lg">
          {t('landingCtaCreate')}
          <ArrowRight aria-hidden="true" className="h-5 w-5 rtl:-scale-x-100" />
        </Link>
      </div>
    </section>
  );
}

/** FAQ on the shared Accordion (no pricing question). */
export function FaqSection() {
  const { t } = useI18n();
  const items: Array<[MessageKey, MessageKey]> = [
    ['landingFaq1Q', 'landingFaq1A'],
    ['landingFaq2Q', 'landingFaq2A'],
    ['landingFaq3Q', 'landingFaq3A'],
    ['landingFaq4Q', 'landingFaq4A'],
  ];
  return (
    <section id="faq" aria-labelledby="landing-faq-title" className="landing-section landing-paper">
      <div className="landing-container landing-narrow">
        <SectionHeading id="landing-faq-title" kicker={t('landingFaqKicker')} title={t('landingFaqTitle')} />
        <Accordion className="landing-faq">
          {items.map(([question, answer]) => (
            <AccordionItem key={question} title={t(question)} headingLevel={3} className="landing-faq-item">
              <p className="landing-body">{t(answer)}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
