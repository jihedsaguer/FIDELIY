import { useEffect, useState, type FormEvent } from 'react';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { paths } from '../../../app/routes/paths';
import { useAuth } from '../../auth/AuthProvider';
import { getApiErrorMessage } from '../../auth/utils/authErrors';
import {
  useCompleteBusinessSetupMutation,
  useCreateBusinessMutation,
  useCreateFirstBranchMutation,
  useGetBusinessSetupQuery,
  useUpdateBusinessMutation,
  useUpdateFirstBranchMutation,
} from '../api/businessOnboardingApi';
import { OnboardingStepForm } from '../components/OnboardingStepForm';
import type {
  BusinessSetup,
  OnboardingFields,
} from '../types/businessOnboarding.types';

const STEPS = [
  'Business identity',
  'Appearance',
  'Business contact',
  'First branch',
  'Review',
];

const DEFAULT_FIELDS: OnboardingFields = {
  businessName: '',
  logoUrl: '',
  primaryColor: '#2F7450',
  accentColor: '#F0B35A',
  businessPhone: '',
  phonePubliclyDisplayed: null,
  branchName: '',
  branchAddress: '',
};

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function fieldsFromSetup(setup: BusinessSetup): OnboardingFields {
  const business = setup.business;
  const firstBranch = setup.branches[0];
  const primaryColor = business?.theme?.primaryColor;
  const accentColor = business?.theme?.accentColor;
  return {
    businessName: business?.name ?? '',
    logoUrl: business?.logoUrl ?? '',
    primaryColor: primaryColor && isHexColor(primaryColor) ? primaryColor : DEFAULT_FIELDS.primaryColor,
    accentColor: accentColor && isHexColor(accentColor) ? accentColor : DEFAULT_FIELDS.accentColor,
    businessPhone: business?.businessPhone ?? '',
    phonePubliclyDisplayed: business?.phoneVisibilityConfigured
      ? business.phonePubliclyDisplayed
      : null,
    branchName: firstBranch?.name ?? '',
    branchAddress: firstBranch?.address ?? '',
  };
}

function resumeStep(setup: BusinessSetup, fields: OnboardingFields) {
  if (!setup.business || !fields.businessName.trim() || !isHttpUrl(fields.logoUrl)) return 0;
  const savedTheme = setup.business.theme;
  if (!isHexColor(savedTheme?.primaryColor ?? '') || !isHexColor(savedTheme?.accentColor ?? '')) return 1;
  if (!fields.businessPhone.trim() || fields.phonePubliclyDisplayed === null) return 2;
  if (!fields.branchName.trim() || !fields.branchAddress.trim()) return 3;
  return 4;
}

function missingFields(fields: OnboardingFields) {
  const missing: string[] = [];
  if (!fields.businessName.trim()) missing.push('Business name');
  if (!isHttpUrl(fields.logoUrl)) missing.push('A valid logo URL');
  if (!isHexColor(fields.primaryColor)) missing.push('A valid primary color');
  if (!isHexColor(fields.accentColor)) missing.push('A valid secondary color');
  if (!fields.businessPhone.trim()) missing.push('Business phone number');
  if (fields.phonePubliclyDisplayed === null) missing.push('Phone display preference');
  if (!fields.branchName.trim()) missing.push('First branch name');
  if (!fields.branchAddress.trim()) missing.push('First branch address');
  return missing;
}

export default function BusinessOnboardingPage() {
  const { session, signOut } = useAuth();
  const setupQuery = useGetBusinessSetupQuery();
  const [createBusiness, createBusinessState] = useCreateBusinessMutation();
  const [updateBusiness, updateBusinessState] = useUpdateBusinessMutation();
  const [createFirstBranch, createBranchState] = useCreateFirstBranchMutation();
  const [updateFirstBranch, updateBranchState] = useUpdateFirstBranchMutation();
  const [completeBusinessSetup, completeState] = useCompleteBusinessSetupMutation();
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const pending = createBusinessState.isLoading
    || updateBusinessState.isLoading
    || createBranchState.isLoading
    || updateBranchState.isLoading
    || completeState.isLoading;
  const setup = setupQuery.data;

  useEffect(() => {
    if (!setup) return;
    const restoredFields = fieldsFromSetup(setup);
    setFields(restoredFields);
    if (setup.status === 'complete') {
      setRedirecting(true);
      window.location.replace(paths.merchantDashboard);
    } else {
      setStep(resumeStep(setup, restoredFields));
    }
  }, [setup]);

  function updateField<K extends keyof OnboardingFields>(key: K, value: OnboardingFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setError('');
    setNotice('');
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (!fields.businessName.trim()) return 'Enter your business name.';
      if (fields.businessName.trim().length > 255) return 'Business name must be 255 characters or fewer.';
      if (!fields.logoUrl.trim() || !isHttpUrl(fields.logoUrl.trim())) {
        return 'Enter a valid logo URL beginning with https:// or http://.';
      }
      if (fields.logoUrl.trim().length > 2048) return 'Logo URL must be 2048 characters or fewer.';
    }
    if (step === 1 && (!isHexColor(fields.primaryColor) || !isHexColor(fields.accentColor))) {
      return 'Choose valid six-digit hex colors for both brand colors.';
    }
    if (step === 2) {
      if (!fields.businessPhone.trim()) return 'Enter your business phone number.';
      if (fields.businessPhone.trim().length > 20) return 'Business phone number must be 20 characters or fewer.';
      if (fields.phonePubliclyDisplayed === null) return 'Choose whether your phone number is displayed publicly.';
    }
    if (step === 3) {
      if (!fields.branchName.trim() || !fields.branchAddress.trim()) {
        return 'Enter the first branch name and address.';
      }
      if (fields.branchName.trim().length > 255 || fields.branchAddress.trim().length > 255) {
        return 'Branch name and address must be 255 characters or fewer.';
      }
    }
    return '';
  }

  async function saveAndContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setNotice('');
    try {
      if (step === 0) {
        if (!setup?.business) await createBusiness({ name: fields.businessName.trim() }).unwrap();
        await updateBusiness({
          name: fields.businessName.trim(),
          logoUrl: fields.logoUrl.trim(),
        }).unwrap();
      } else if (step === 1) {
        await updateBusiness({
          theme: { primaryColor: fields.primaryColor, accentColor: fields.accentColor },
        }).unwrap();
      } else if (step === 2) {
        if (fields.phonePubliclyDisplayed === null) {
          throw new Error('Choose whether your phone number is displayed publicly.');
        }
        await updateBusiness({
          businessPhone: fields.businessPhone.trim(),
          phonePubliclyDisplayed: fields.phonePubliclyDisplayed,
        }).unwrap();
      } else if (step === 3) {
        if (setup?.branches[0]) {
          await updateFirstBranch({
            name: fields.branchName.trim(),
            address: fields.branchAddress.trim(),
          }).unwrap();
        } else {
          await createFirstBranch({
            name: fields.branchName.trim(),
            address: fields.branchAddress.trim(),
          }).unwrap();
        }
      }

      const currentSetup = await setupQuery.refetch().unwrap();
      const restoredFields = fieldsFromSetup(currentSetup);
      setFields(restoredFields);
      setStep(step + 1);
      setNotice('Saved. Your progress is stored securely and you can return any time.');
    } catch (saveError) {
      setError(getOnboardingError(saveError));
    }
  }

  async function completeSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = missingFields(fields);
    if (missing.length) {
      setError(`Complete these required fields before finishing: ${missing.join(', ')}.`);
      return;
    }

    setError('');
    setNotice('');
    try {
      await completeBusinessSetup().unwrap();
      const confirmedSetup = await setupQuery.refetch().unwrap();
      if (confirmedSetup.status !== 'complete') {
        throw new Error('The server has not confirmed that setup is complete. Please review your information and try again.');
      }
      setRedirecting(true);
      window.location.replace(paths.merchantDashboard);
    } catch (completionError) {
      setError(getOnboardingError(completionError));
    }
  }

  async function logout() {
    setError('');
    try {
      await signOut();
      window.location.replace(paths.merchantLogin);
    } catch (signOutError) {
      setError(getOnboardingError(signOutError));
    }
  }

  if (setupQuery.isLoading || setupQuery.isFetching) {
    return <section className="panel onboarding-panel"><p role="status">Loading your saved business setup…</p></section>;
  }
  if (redirecting) {
    return <section className="panel onboarding-panel"><p role="status">Setup complete. Opening your merchant dashboard…</p></section>;
  }
  if (!setup) {
    return (
      <section className="panel onboarding-panel">
        <p className="eyebrow">Merchant setup</p>
        <h1>We could not load your setup</h1>
        <p className="panel-copy">Your saved information has not been changed. Retry when your connection is available.</p>
        {setupQuery.error && <FormFeedback error={getOnboardingError(setupQuery.error)} />}
        <button className="primary-button" type="button" onClick={() => void setupQuery.refetch()}>Try again</button>
        <p className="fine-print"><a href={paths.merchantLogin}>Sign in again</a> if your merchant session has expired.</p>
      </section>
    );
  }

  return (
    <section className="panel onboarding-panel">
      <div className="experience-heading onboarding-heading">
        <div>
          <p className="eyebrow">Merchant setup</p>
          <h1>Set up your business</h1>
          <p className="panel-copy">Welcome, {session?.user.name}. Let’s get your business ready for FIDELIY.</p>
        </div>
        <button className="quiet-button" type="button" disabled={pending} onClick={() => void logout()}>
          {pending ? 'Please wait…' : 'Sign out'}
        </button>
      </div>
      <ol className="onboarding-steps" aria-label="Onboarding progress">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''} aria-current={index === step ? 'step' : undefined}>
            <span className="step-number">{index < step ? '✓' : index + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div className="progress-track" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1}>
        <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <OnboardingStepForm
        step={step}
        fields={fields}
        pending={pending}
        onChange={updateField}
        onSubmit={step === 4 ? completeSetup : saveAndContinue}
      />
      <div className="onboarding-actions">
        {step > 0 && <button className="quiet-button" type="button" disabled={pending} onClick={() => { setStep(step - 1); setError(''); setNotice(''); }}>← Previous</button>}
        {step === 4 && <span className="field-hint">Ready when you are.</span>}
      </div>
      <FormFeedback error={error} notice={notice} />
    </section>
  );
}

function getOnboardingError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = error.status;
    const data = 'data' in error ? error.data : undefined;
    if (status === 401) {
      return 'Your session may have expired. Sign in again to continue; your saved setup will be restored.';
    }
    if (status === 400 && typeof data === 'object' && data !== null && 'missingFields' in data) {
      const missing = data.missingFields;
      if (Array.isArray(missing) && missing.every((field) => typeof field === 'string')) {
        return `The server still needs: ${missing.join(', ')}. Review those fields and try again.`;
      }
    }
  }
  return getApiErrorMessage(error, 'Something went wrong. Please try again.');
}
