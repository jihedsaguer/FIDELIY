import { useState, type FormEvent } from 'react';
import { PublicLayout } from '../../../components/layout/PublicLayout';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { paths } from '../../../app/routes/paths';
import {
  useLoginMerchantMutation,
  useRegisterMerchantMutation,
} from '../api/authApi';
import { useAuth } from '../AuthProvider';
import { getApiErrorMessage } from '../utils/authErrors';

export default function MerchantAuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { refreshSession } = useAuth();
  const [registerMerchant, registration] = useRegisterMerchantMutation();
  const [loginMerchant, login] = useLoginMerchantMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const pending = registration.isLoading || login.isLoading;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        await registerMerchant({ name: name.trim(), email: email.trim(), password }).unwrap();
      } else {
        await loginMerchant({ email: email.trim(), password }).unwrap();
      }
      const currentSession = await refreshSession();
      if (!currentSession) {
        throw new Error('Authentication succeeded but no session was established. Please try again.');
      }
      window.location.assign(paths.merchantOnboarding);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, mode === 'login'
        ? 'We could not sign you in. Check your email and password.'
        : 'We could not create your account. Please try again.'));
    }
  }

  return (
    <PublicLayout>
      <section className="panel auth-panel">
        <a className="back-link" href="/">← Back</a>
        <p className="eyebrow">Merchant account</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Start with FIDELIY'}</h1>
        <p className="panel-copy">{mode === 'login' ? 'Sign in to continue to your merchant workspace.' : 'Create your owner account. You can continue business setup after registration.'}</p>
        <form onSubmit={submit} className="form-stack">
          {mode === 'register' && (
            <>
              <label htmlFor="merchant-name">Your name</label>
              <input id="merchant-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required disabled={pending} />
            </>
          )}
          <label htmlFor="merchant-email">Email</label>
          <input id="merchant-email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending} />
          <label htmlFor="merchant-password">Password</label>
          <input id="merchant-password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={pending} />
          <SubmitButton pending={pending} idle={mode === 'login' ? 'Sign in' : 'Create merchant account'} waiting={mode === 'login' ? 'Signing in…' : 'Creating account…'} />
        </form>
        <FormFeedback error={error} />
        <p className="switch-mode">
          {mode === 'login' ? <>New to FIDELIY? <a href={paths.merchantRegister}>Create an account</a></> : <>Already registered? <a href={paths.merchantLogin}>Sign in</a></>}
        </p>
      </section>
    </PublicLayout>
  );
}
