import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../shared/i18n/i18n';
import '../landing-fonts';
import '../landing.css';
import { HeroSection } from '../components/HeroSection';
import { LandingFooter } from '../components/LandingFooter';
import { LandingNav } from '../components/LandingNav';
import {
  ComparisonSection,
  FaqSection,
  FeaturesSection,
  FoundingSection,
  ProblemSection,
  StepsSection,
} from '../components/LandingSections';
import { ProofSection } from '../components/ProofSection';
import { RoiEstimator } from '../components/RoiEstimator';
import { SectionHeading } from '../components/SectionHeading';
import { WaveDivider } from '../components/WaveDivider';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';

/**
 * Public landing page at `/` (merchant-focused, French and Tunisian Darija).
 * Renders its own skip link and `<main id="main-content">` (no PublicLayout).
 * Only Release 1 facts; no pricing, no invented social proof; all sample data
 * is labelled as an example and stays in the browser.
 */
export default function LandingPage() {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [businessName, setBusinessName] = useState('');
  const displayName = businessName.trim() || t('landingSampleBusinessName');
  const documentTitle = t('landingDocumentTitle');

  useRevealOnScroll(rootRef);

  useEffect(() => {
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  return (
    <div ref={rootRef} className="landing">
      <a href="#main-content" className="landing-skip-link">
        {t('skipToMainContent')}
      </a>
      <LandingNav />
      <main id="main-content" tabIndex={-1} className="landing-main">
        <HeroSection businessName={businessName} onBusinessNameChange={setBusinessName} displayName={displayName} />
        <WaveDivider top="var(--landing-signature)" bottom="var(--landing-paper)" />
        <ProblemSection />
        <ComparisonSection />
        <WaveDivider top="var(--landing-paper)" bottom="#ffffff" flip />
        <ProofSection displayName={displayName} />
        <WaveDivider top="#ffffff" bottom="var(--landing-signature)" />
        <FeaturesSection />
        <WaveDivider top="var(--landing-signature)" bottom="var(--landing-paper)" flip />
        <StepsSection />
        <section id="estimate" aria-labelledby="landing-estimate-title" className="landing-section landing-paper landing-section-tight">
          <div className="landing-container">
            <SectionHeading id="landing-estimate-title" kicker={t('landingEstimateKicker')} title={t('landingEstimateTitle')} />
            <p className="landing-body landing-section-intro">{t('landingEstimateIntro')}</p>
            <RoiEstimator />
          </div>
        </section>
        <WaveDivider top="var(--landing-paper)" bottom="var(--landing-ink)" />
        <FoundingSection />
        <WaveDivider top="var(--landing-ink)" bottom="var(--landing-paper)" flip />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
