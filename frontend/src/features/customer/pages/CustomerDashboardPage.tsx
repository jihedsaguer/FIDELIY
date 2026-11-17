import { useState, useEffect } from 'react';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { Section } from '../../../components/ui/Section';
import { useAuth } from '../../auth/AuthProvider';
import { getApiErrorMessage } from '../../auth/utils/authErrors';
import { paths } from '../../../app/routes/paths';
import {
  useGetMembershipsWithBalancesQuery,
  useGetPersonalQrQuery,
} from '../../loyalty/api';

// Simple QR code component that works in the browser
// Uses a client-side QR generator loaded from CDN to avoid:
// 1. Node.js module resolution issues
// 2. Exposing credentials to external services
// The QR code is generated entirely in the browser
function QRCodeDisplay({ value, size }: { value: string; size: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setQrUrl('');
      return;
    }

    // Use a CDN-loaded QR code generator (qrcode.min.js)
    // This is loaded client-side and doesn't expose credentials externally
    async function generateQR() {
      try {
        // Check if the library is already loaded
        if ((window as any).QRCode) {
          const url = (window as any).QRCode.toDataURL(value, {
            width: size,
            margin: 2
          });
          setQrUrl(url);
          return;
        }

        // Load the library from CDN
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load QR code library'));
          document.body.appendChild(script);
        });

        // Now generate the QR code
        if ((window as any).QRCode) {
          const url = (window as any).QRCode.toDataURL(value, {
            width: size,
            margin: 2
          });
          setQrUrl(url);
        }
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        // Fallback
        setQrUrl(`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="white"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="12">QR</text></svg>`);
      }
    }

    generateQR();
  }, [value, size]);

  if (!qrUrl) {
    return <div style={{ width: size, height: size, background: '#fff', border: '1px solid #ccc' }} />;
  }

  return <img src={qrUrl} alt="QR Code" style={{ width: size, height: size }} />;
}

export default function CustomerDashboardPage() {
  const { session, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  
  const { data: membershipsData, isLoading: isLoadingMemberships, error: membershipsError } =
    useGetMembershipsWithBalancesQuery();
  const { data: qrData, isLoading: isLoadingQr, error: qrError } =
    useGetPersonalQrQuery();

  const memberships = membershipsData ?? [];
  const hasActiveMemberships = memberships.some(m => m.status === 'active');

  async function logout() {
    setPending(true);
    setError('');
    try {
      await signOut(paths.home);
    } catch (logoutError) {
      setError(getApiErrorMessage(logoutError, 'We could not sign you out. Please try again.'));
    } finally {
      setPending(false);
    }
  }

  function getProgrammeLabel(membership: { programType: string | null }) {
    if (!membership.programType) return 'Unknown';
    if (membership.programType === 'stamps') return 'Stamp Card';
    if (membership.programType === 'points') return 'Points Program';
    return 'Stamps + Points';
  }

  return (
    <>
      <a href="#workspace-main" className="sr-only">Skip to main content</a>
      <section id="workspace-main" className="workspace-page customer-wallet">
      <div className="experience-heading">
        <div>
          <p className="eyebrow">Customer space</p>
          <h1>Welcome, {session?.user.name}</h1>
        </div>
        <button className="quiet-button" disabled={pending} onClick={() => void logout()}>
          {pending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
      
      <Section title="Your account">
        <p className="panel-copy">You're ready to participate in loyalty programmes with local businesses.</p>
      </Section>

      {hasActiveMemberships && (
        <>
          {/* Personal QR Code */}
          <Section title="Your QR Code" subtitle="Show this to merchants to join programmes and earn rewards">
            <div className="qr-display">
              {qrData?.credential ? (
                <>
                  <div className="qr-code-container">
                    <QRCodeDisplay value={qrData.credential} size={200} />
                  </div>
                  <p className="qr-hint muted">Scan this code at participating businesses</p>
                </>
              ) : (
                <div className="qr-placeholder">
                  <button 
                    className="primary-button"
                    onClick={() => {}}
                  >
                    {isLoadingQr ? 'Loading QR…' : 'Generate QR Code'}
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* Active Memberships */}
          <Section title="Your Programmes" subtitle="Loyalty programmes you're enrolled in">
            <div className="membership-list">
              {memberships
                .filter(m => m.status === 'active')
                .map((membership) => (
                  <div key={membership.id} className="membership-card">
                    <div className="membership-header">
                      {membership.logoUrl && (
                        <img src={membership.logoUrl} alt="" className="membership-logo" />
                      )}
                      <div className="membership-info">
                        <h3>{membership.businessName}</h3>
                        <p className="muted">{getProgrammeLabel(membership)}</p>
                      </div>
                    </div>
                    <div className="membership-balance">
                      {membership.balance.stamps > 0 && (
                        <div className="balance-item">
                          <span className="balance-label">Stamps</span>
                          <span className="balance-value">{membership.balance.stamps}</span>
                        </div>
                      )}
                      {membership.balance.points > 0 && (
                        <div className="balance-item">
                          <span className="balance-label">Points</span>
                          <span className="balance-value">{membership.balance.points}</span>
                        </div>
                      )}
                      {(membership.balance.stamps === 0 && membership.balance.points === 0) && (
                        <p className="muted">No activity yet</p>
                      )}
                    </div>
                    <div className="membership-date">
                      <span className="muted">Joined {new Date(membership.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </Section>
        </>
      )}

      {!hasActiveMemberships && !isLoadingMemberships && (
        <Section title="Get started" subtitle="Join loyalty programmes">
          <div className="info-card">
            <div className="info-card-label">No programmes yet</div>
            <div className="info-card-value" style={{ marginTop: 'var(--space-2)' }}>
              Visit a participating business and scan their QR code to join their loyalty programme.
            </div>
          </div>
        </Section>
      )}

      {(membershipsError || qrError) && (
        <FormFeedback error={'Failed to load your loyalty data. Please try again.'} />
      )}

      {isLoadingMemberships && (
        <p role="status">Loading your programmes…</p>
      )}

      <FormFeedback error={error} />
    </section>
    </>
  );
}


