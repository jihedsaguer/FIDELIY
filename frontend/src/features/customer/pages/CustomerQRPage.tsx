import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Download, RefreshCw, Copy } from 'lucide-react';
import {
  useGetPersonalQrQuery,
  useIssuePersonalQrMutation,
  useRotatePersonalQrMutation,
  type PersonalQrIssued,
} from '../../loyalty/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { LoadingPanel } from '../../../components/ui/LoadingPanel';
import { useI18n } from '../../../shared/i18n/i18n';
import { paths } from '../../../app/routes/paths';
import { QRCodeDisplay } from '../components/QRCodeDisplay';

function getErrorStatus(error: unknown): number | string | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number | string }).status;
  }
  return undefined;
}

const QR_DISPLAY_SIZE = 'min(70vw, 280px)';

/**
 * CustomerQRPage - the customer's personal QR credential and short ID.
 *
 * GET returns the current credential and short ID (derived server-side), or
 * `requiresRotation` for a legacy credential that cannot be displayed. The
 * values are held in memory only and never persisted.
 */
export default function CustomerQRPage() {
  const { t, formatDate } = useI18n();
  const statusQuery = useGetPersonalQrQuery();
  const [issueQr, issueState] = useIssuePersonalQrMutation();
  const [rotateQr, rotateState] = useRotatePersonalQrMutation();

  // Freshly issued/rotated values, shown immediately while the status refetches.
  const [issued, setIssued] = useState<PersonalQrIssued | null>(null);
  const [issueConflict, setIssueConflict] = useState(false);
  const [issueFailed, setIssueFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rotateFailed, setRotateFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const statusNotIssued = getErrorStatus(statusQuery.error) === 404;
  const statusFailed = Boolean(statusQuery.error) && !statusNotIssued;
  const isAlreadyIssued = Boolean(statusQuery.data?.active) || issueConflict;
  const requiresRotation = Boolean(statusQuery.data?.requiresRotation) && !issued;

  const credential = issued?.credential ?? statusQuery.data?.credential ?? null;
  const shortCode = issued ? issued.shortCode : (statusQuery.data?.shortCode ?? null);
  const issuedAt = issued?.issuedAt ?? statusQuery.data?.issuedAt;

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCreate() {
    setIssueFailed(false);
    try {
      const result = await issueQr().unwrap();
      setIssued(result);
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        // Already issued elsewhere: load the current credential.
        setIssueConflict(true);
        void statusQuery.refetch();
      } else {
        setIssueFailed(true);
      }
    }
  }

  async function handleRotate() {
    setRotateFailed(false);
    try {
      const result = await rotateQr().unwrap();
      setIssued(result);
      setConfirmOpen(false);
    } catch {
      setRotateFailed(true);
    }
  }

  function handleSaveImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'fideliy-qr.png';
    link.click();
  }

  async function handleCopy() {
    if (!shortCode) return;
    try {
      await navigator.clipboard.writeText(shortCode);
      setCopied(true);
    } catch {
      // Clipboard unavailable: the ID stays selectable for manual copy.
    }
  }

  function openRotateConfirm() {
    setRotateFailed(false);
    setConfirmOpen(true);
  }

  function renderContent() {
    if (credential) {
      return (
        <Card className="p-4 sm:p-8 text-center space-y-5">
          <div className="mx-auto w-fit rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-3">
            <QRCodeDisplay
              ref={canvasRef}
              value={credential}
              size={280}
              displaySize={QR_DISPLAY_SIZE}
              label={t('personalQrImageAlt')}
            />
          </div>

          {shortCode && (
            <div className="space-y-2" role="group" aria-labelledby="personal-qr-short-label">
              <p id="personal-qr-short-label" className="text-sm text-[var(--text-muted)]">
                {t('personalQrShortCodeLabel')}
              </p>
              <p
                dir="ltr"
                className="select-all break-all text-center font-mono text-2xl font-bold tracking-widest text-[var(--text)] sm:text-3xl"
              >
                {shortCode}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto gap-2"
                onClick={() => void handleCopy()}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {t('personalQrShortCodeCopy')}
              </Button>
              <p className="min-h-[1.25rem] text-sm text-[var(--success)]" role="status" aria-live="polite">
                {copied ? t('personalQrShortCodeCopied') : ''}
              </p>
            </div>
          )}

          <FormFeedback notice={t('personalQrShownOnceNotice')} />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" className="w-full sm:w-auto gap-2" onClick={handleSaveImage}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('personalQrSaveImage')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto gap-2"
              onClick={openRotateConfirm}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('personalQrRotate')}
            </Button>
          </div>
        </Card>
      );
    }

    if (statusQuery.isLoading) {
      return <LoadingPanel>{t('loading')}</LoadingPanel>;
    }

    if (isAlreadyIssued) {
      return (
        <Card className="p-4 sm:p-8 space-y-4 text-start">
          <div className="flex items-start gap-3">
            <QrCode className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <div className="space-y-2">
              <p className="font-semibold text-[var(--text)]">
                {issuedAt ? `${t('personalQrIssuedOn')} ${formatDate(issuedAt)}` : t('personalQrAlreadyIssued')}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {requiresRotation ? t('personalQrRequiresRotation') : t('personalQrCannotShowAgain')}
              </p>
            </div>
          </div>
          <Button type="button" className="w-full sm:w-auto gap-2" onClick={openRotateConfirm}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('personalQrRotate')}
          </Button>
        </Card>
      );
    }

    if (statusFailed) {
      return (
        <Card className="p-4 sm:p-8 space-y-4 text-start">
          <FormFeedback error={t('personalQrLoadError')} />
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => void statusQuery.refetch()}
            isLoading={statusQuery.isFetching}
          >
            {t('tryAgain')}
          </Button>
        </Card>
      );
    }

    // Not issued yet (GET 404): never auto-create; the customer decides.
    return (
      <Card className="p-4 sm:p-8 space-y-4 text-start">
        <div className="flex items-start gap-3">
          <QrCode className="mt-0.5 h-6 w-6 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <div className="space-y-2">
            <p className="font-semibold text-[var(--text)]">{t('personalQrNotIssuedTitle')}</p>
            <p className="text-sm text-[var(--text-muted)]">{t('personalQrNotIssuedBody')}</p>
          </div>
        </div>
        {issueFailed && <FormFeedback error={t('personalQrIssueError')} />}
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => void handleCreate()}
          isLoading={issueState.isLoading}
        >
          {issueState.isLoading
            ? t('personalQrCreating')
            : issueFailed
              ? t('tryAgain')
              : t('personalQrCreate')}
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-screen-sm space-y-6">
        <header className="space-y-1 text-start">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">{t('yourQRCode')}</h1>
          <p className="text-sm md:text-base text-[var(--text-muted)]">{t('showQRToMerchant')}</p>
        </header>

        {renderContent()}

        <div className="text-center">
          <Link
            to={paths.customerDashboard}
            className="inline-flex min-h-[44px] items-center justify-center px-4 font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
          >
            {t('backToDashboard')}
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('personalQrRotateConfirmTitle')}
        message={t('personalQrRotateConfirmMessage')}
        confirmLabel={t('personalQrRotateConfirm')}
        variant="destructive"
        isPending={rotateState.isLoading}
        errorMessage={rotateFailed ? t('personalQrRotateError') : undefined}
        onConfirm={() => void handleRotate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
