import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Copy, Download, Printer } from 'lucide-react';
import { useGetBusinessSetupQuery } from '../../business-onboarding/api/businessOnboardingApi';
import { useGetCurrentProgramQuery } from '../api/programApi';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { LoadingPanel } from '../../../components/ui/LoadingPanel';
import { translate, useI18n } from '../../../shared/i18n/i18n';
import { paths } from '../../../app/routes/paths';
import { buildJoinUrl, isPrintableOrigin } from '../utils/joinUrl';

const PNG_SIZE = 1024;
const FILE_BASENAME = 'fideliy-business-qr';
const QR_COLORS = { bgColor: '#ffffff', fgColor: '#000000' } as const;

type CopyState = 'idle' | 'copied' | 'failed';

const warningClasses =
  'flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-light)] p-3 text-start text-sm text-[var(--text)]';

function downloadHref(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
}

/**
 * MerchantBusinessQrPage - the business join QR (public page `/qr/:qrId`) to
 * show, download (PNG/SVG) and print as a bilingual French/Darija poster.
 * The URL is built from the address the merchant is using.
 */
export default function MerchantBusinessQrPage() {
  const { t } = useI18n();
  const setupQuery = useGetBusinessSetupQuery();
  const programQuery = useGetCurrentProgramQuery();
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    if (copyState !== 'copied') return undefined;
    const timer = window.setTimeout(() => setCopyState('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const business = setupQuery.data?.business ?? null;
  const origin = window.location.origin;
  const joinUrl = business ? buildJoinUrl(origin, business.publicQrId) : '';
  const showLocalWarning = !isPrintableOrigin(origin);
  // Only a successful `null` means "no active programme"; a failed query shows nothing.
  const showNoProgram = programQuery.isSuccess && programQuery.data === null;

  async function handleCopy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(joinUrl);
      setCopyState('copied');
    } catch {
      // Clipboard unavailable (e.g. http origin) or denied: the URL stays selectable.
      setCopyState('failed');
    }
  }

  function handleDownloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadHref(canvas.toDataURL('image/png'), `${FILE_BASENAME}.png`);
  }

  function handleDownloadSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    for (const attribute of ['role', 'aria-label', 'class', 'style']) clone.removeAttribute(attribute);
    clone.setAttribute('width', String(PNG_SIZE));
    clone.setAttribute('height', String(PNG_SIZE));
    const markup = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    downloadHref(url, `${FILE_BASENAME}.svg`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderContent() {
    if (setupQuery.isLoading) {
      return <LoadingPanel>{t('loading')}</LoadingPanel>;
    }

    if (setupQuery.isError && !setupQuery.data) {
      return (
        <Card className="p-4 sm:p-8 space-y-4 text-start">
          <FormFeedback error={t('businessQrLoadError')} />
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => void setupQuery.refetch()}
            isLoading={setupQuery.isFetching}
          >
            {t('tryAgain')}
          </Button>
        </Card>
      );
    }

    if (!business) {
      return (
        <Card className="p-6 text-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--text)]">{t('noBusiness')}</h2>
            <p className="text-sm text-[var(--text-muted)]">{t('setupBusinessToContinue')}</p>
          </div>
          <Link
            to={paths.merchantOnboarding}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--brand)] px-5 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
          >
            {t('setupBusiness')}
          </Link>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {showLocalWarning && (
          <div className={warningClasses} role="alert">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" aria-hidden="true" />
            <p>{t('businessQrLocalOriginWarning')}</p>
          </div>
        )}

        {showNoProgram && (
          <div className={warningClasses} role="status">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" aria-hidden="true" />
            <div className="space-y-1">
              <p>{t('businessQrNoProgram')}</p>
              <Link
                to={paths.merchantPrograms}
                className="inline-flex min-h-[44px] items-center font-semibold text-[var(--brand-dark)] underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                {t('businessQrGoToPrograms')}
              </Link>
            </div>
          </div>
        )}

        <Card className="p-4 sm:p-8 space-y-6 text-center">
          <h2 className="text-xl font-semibold text-[var(--text)] break-words">{business.name}</h2>

          <div className="mx-auto w-full max-w-[18rem] rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-3">
            <QRCodeSVG
              ref={svgRef}
              value={joinUrl}
              size={256}
              level="M"
              marginSize={4}
              {...QR_COLORS}
              role="img"
              aria-label={`${t('businessQrImageAlt')} ${business.name}`}
              className="block h-auto w-full"
            />
          </div>

          {/* High-resolution canvas used only for the PNG export. */}
          <div className="hidden" aria-hidden="true">
            <QRCodeCanvas ref={canvasRef} value={joinUrl} size={PNG_SIZE} level="M" marginSize={4} {...QR_COLORS} />
          </div>

          <div className="space-y-2 text-start" role="group" aria-labelledby="business-qr-url-label">
            <p id="business-qr-url-label" className="text-sm font-medium text-[var(--text-muted)]">
              {t('businessQrUrlLabel')}
            </p>
            <p
              data-testid="business-qr-url"
              dir="ltr"
              className="select-all break-all rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--subtle)] p-3 text-start font-mono text-sm text-[var(--text)]"
            >
              {joinUrl}
            </p>
            <Button type="button" variant="secondary" className="w-full sm:w-auto gap-2" onClick={() => void handleCopy()}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              {t('businessQrCopy')}
            </Button>
            <p
              className={`min-h-[1.25rem] text-sm ${copyState === 'failed' ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}
              role="status"
              aria-live="polite"
            >
              {copyState === 'copied' ? t('businessQrCopied') : copyState === 'failed' ? t('businessQrCopyFailed') : ''}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button type="button" className="w-full sm:w-auto gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                {t('businessQrPrint')}
              </Button>
              <Button type="button" variant="secondary" className="w-full sm:w-auto gap-2" onClick={handleDownloadPng}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('businessQrDownloadPng')}
              </Button>
              <Button type="button" variant="secondary" className="w-full sm:w-auto gap-2" onClick={handleDownloadSvg}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('businessQrDownloadSvg')}
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t('businessQrPrintHint')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-screen-md space-y-6 print:hidden">
        <header className="space-y-1 text-start">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">{t('businessQr')}</h1>
          <p className="text-sm md:text-base text-[var(--text-muted)]">{t('businessQrSubtitle')}</p>
        </header>

        {renderContent()}
      </div>

      {business && (
        // Print-only poster: always French and Tunisian Darija, whatever the UI language.
        <section
          data-testid="business-qr-poster"
          className="hidden print:flex flex-col items-center gap-6 bg-white text-center text-black break-inside-avoid"
        >
          <p className="text-4xl font-bold break-words">{business.name}</p>
          <QRCodeSVG
            value={joinUrl}
            size={512}
            level="M"
            marginSize={4}
            {...QR_COLORS}
            aria-hidden="true"
            style={{ width: '12cm', height: '12cm' }}
          />
          <div lang="fr" dir="ltr" className="space-y-1">
            <p className="text-2xl font-bold">{translate('fr', 'businessQrPosterCta')}</p>
            <p className="text-base">{translate('fr', 'businessQrPosterHint')}</p>
          </div>
          <div lang="ar" dir="rtl" className="space-y-1">
            <p className="text-2xl font-bold">{translate('ar', 'businessQrPosterCta')}</p>
            <p className="text-base">{translate('ar', 'businessQrPosterHint')}</p>
          </div>
          <p dir="ltr" className="break-all font-mono text-xs">{joinUrl}</p>
          <p dir="ltr" className="text-lg font-bold">
            FIDELIY<span className="text-[var(--brand)]">.</span>
          </p>
        </section>
      )}
    </div>
  );
}
