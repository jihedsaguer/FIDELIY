import { useState } from 'react';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { Section } from '../../../components/ui/Section';
import { useAuth } from '../../auth/AuthProvider';
import { getApiErrorMessage } from '../../auth/utils/authErrors';
import { paths } from '../../../app/routes/paths';

export default function CustomerDashboardPage() {
  const { session, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

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

      <Section title="Available features">
        <div className="info-card">
          <div className="info-card-label">QR scanning & memberships</div>
          <div className="info-card-value" style={{ marginTop: 'var(--space-2)' }}>
            Scan your unique QR code at participating businesses to access their loyalty programmes.
          </div>
        </div>
        <div className="info-card info-card--muted">
          <div className="info-card-label">Loyalty wallet (Coming soon)</div>
          <div className="info-card-value" style={{ marginTop: 'var(--space-2)' }}>
            Your programmes, earned stamps/points, and redeemable rewards will appear here once backend endpoints are complete.
          </div>
        </div>
      </Section>

      <FormFeedback error={error} />
    </section>
    </>
  );
}
