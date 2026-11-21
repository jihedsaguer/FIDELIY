import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetPersonalQrQuery, useIssuePersonalQrMutation } from '../../loyalty/api';
import { Button } from '../../../components/ui/Button';
import { Section } from '../../../components/ui/Section';
import { QRCodeDisplay } from '../components/QRCodeDisplay';

/**
 * CustomerQRPage - Displays customer's personal QR code for loyalty programmes
 * 
 * Handles QR credential retrieval with fallback logic:
 * 1. Try GET to retrieve existing credential
 * 2. If GET fails or returns no credential, try POST to issue new credential
 * 3. If POST fails with conflict, credential already exists but GET didn't return it
 * 
 * Displays loading, error, and success states.
 */
export default function CustomerQRPage() {
  const navigate = useNavigate();
  const { data: qrData, isLoading: isLoadingGet, error: getError } = useGetPersonalQrQuery();
  const [issueQr, { isLoading: isLoadingIssue, error: issueError }] = useIssuePersonalQrMutation();
  
  const [credential, setCredential] = useState<string | null>(null);
  const [hasAttemptedIssue, setHasAttemptedIssue] = useState(false);

  // Try to get existing credential, or issue a new one if GET fails
  useEffect(() => {
    if (!hasAttemptedIssue) {
      // If GET succeeded and returned a credential, use it
      if (qrData?.credential) {
        setCredential(qrData.credential);
        setHasAttemptedIssue(true);
      } else if (getError) {
        // GET failed - try to issue a new credential
        issueQr()
          .unwrap()
          .then((result) => {
            // POST returns { credential, issuedAt }
            setCredential(result.credential || null);
          })
          .catch((err) => {
            // If ConflictException, credential already exists but GET didn't return it
            // This shouldn't happen, but handle it gracefully
            console.error('Failed to issue QR credential:', err);
          })
          .finally(() => {
            setHasAttemptedIssue(true);
          });
      } else if (qrData) {
        // GET succeeded but no credential returned - this means credential exists but wasn't returned
        // Try to issue to get the actual credential value
        issueQr()
          .unwrap()
          .then((result) => {
            setCredential(result.credential || null);
          })
          .catch(() => {
            // Ignore - will show error state
          })
          .finally(() => {
            setHasAttemptedIssue(true);
          });
      }
    }
  }, [qrData, getError, hasAttemptedIssue, issueQr]);

  const isLoading = isLoadingGet || isLoadingIssue;
  const error = getError || issueError;

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-screen-md w-full">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
            Your QR Code
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
            Show this to merchants to earn loyalty rewards
          </p>
        </header>

        <Section title="Your QR Code">
          <div className="bg-[var(--surface)] rounded-[var(--radius-xl)] border border-[var(--border)] p-6 md:p-10 text-center shadow-sm">
            {credential ? (
              <>
                <div className="mx-auto mb-6 flex h-48 w-48 items-center justify-center rounded-[var(--radius-2xl)] bg-[var(--glass-brand)] backdrop-blur-sm border border-[var(--glass-brand-strong)]">
                  <QRCodeDisplay value={credential} size={192} />
                </div>
                <p className="text-[var(--text-muted)] text-sm md:text-base max-w-xs mx-auto">
                  Scan this code at participating businesses
                </p>
              </>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center h-48">
                <QRCodeDisplay value="" size={192} showPlaceholder={true} />
                <p className="text-[var(--text-muted)] mt-4">Loading QR code...</p>
              </div>
            ) : (
              <div className="text-[var(--text-muted)]">
                <QRCodeDisplay value="" size={192} showPlaceholder={true} />
                <p className="mt-4">QR code not available</p>
                {error && (
                  <p className="text-[var(--danger)] text-sm mt-2">
                    Failed to load: {(error as any)?.data?.message || String(error)}
                  </p>
                )}
                <Button 
                  className="mt-4"
                  onClick={() => {
                    setHasAttemptedIssue(false);
                    setCredential(null);
                  }}
                  isLoading={isLoading}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        </Section>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate('/customer')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
