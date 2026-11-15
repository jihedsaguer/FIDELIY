import { PublicLayout } from '../../../components/layout/PublicLayout';
import { useAuth } from '../AuthProvider';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { paths } from '../../../app/routes/paths';

export default function HomePage() {
  const { status, session, refreshSession } = useAuth();

  return (
    <PublicLayout>
      <section className="hero">
        <p className="eyebrow">A better way to be rewarded</p>
        <h1>Your loyalty,<br /><span>all in one place.</span></h1>
        <p className="hero-copy">Keep your favourite businesses close. Earn rewards with one personal account, right in your browser.</p>
        {status === 'loading' ? (
          <p className="muted" role="status">Checking your session…</p>
        ) : status === 'error' ? (
          <FormFeedback error="We could not check your session.">
            <button className="inline-button" onClick={() => void refreshSession().catch(() => undefined)}>Try again</button>
          </FormFeedback>
        ) : session ? (
          <div className="choice-grid">
            <a className="choice-card" href={paths.customerDashboard}><strong>Customer space</strong><span>Open your rewards home →</span></a>
            <a className="choice-card" href={paths.merchantDashboard}><strong>Merchant space</strong><span>Continue your business setup →</span></a>
          </div>
        ) : (
          <div className="choice-grid">
            <a className="choice-card" href={paths.customerLogin}><strong>I’m a customer</strong><span>Continue with phone and OTP →</span></a>
            <a className="choice-card" href={paths.merchantLogin}><strong>I’m a merchant</strong><span>Sign in or create an account →</span></a>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
