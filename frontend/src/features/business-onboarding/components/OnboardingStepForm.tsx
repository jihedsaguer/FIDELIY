import type { FormEvent } from 'react';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import type { OnboardingFields } from '../types/businessOnboarding.types';

interface OnboardingStepFormProps {
  step: number;
  fields: OnboardingFields;
  pending: boolean;
  onChange: <K extends keyof OnboardingFields>(key: K, value: OnboardingFields[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function OnboardingStepForm({
  step,
  fields,
  pending,
  onChange,
  onSubmit,
}: OnboardingStepFormProps) {
  if (step === 0) {
    return (
      <form className="form-stack onboarding-form" onSubmit={onSubmit} noValidate>
        <div className="step-intro"><h2>Tell us about your business</h2><p>This is the name and logo customers will recognize. You do not need to enter your personal name or registration email again.</p></div>
        <label htmlFor="business-name">Business name</label>
        <input id="business-name" autoComplete="organization" maxLength={255} value={fields.businessName} onChange={(event) => onChange('businessName', event.target.value)} required disabled={pending} />
        <label htmlFor="business-logo">Logo URL</label>
        <input id="business-logo" type="url" inputMode="url" maxLength={2048} placeholder="https://example.com/logo.png" value={fields.logoUrl} onChange={(event) => onChange('logoUrl', event.target.value)} required disabled={pending} />
        <p className="field-hint">Use a publicly accessible HTTP or HTTPS image URL. Logo upload is not available in this setup flow.</p>
        <SubmitButton pending={pending} idle="Save and continue" waiting="Saving business…" />
      </form>
    );
  }

  if (step === 1) {
    const displayName = fields.businessName.trim() || 'Your business';
    const logo = fields.logoUrl.trim();
    return (
      <form className="form-stack onboarding-form" onSubmit={onSubmit} noValidate>
        <div className="step-intro"><h2>Choose your business colors</h2><p>Select two colors for your brand. You can refine these choices later.</p></div>
        <div className="color-fields">
          <div className="color-field">
            <label htmlFor="primary-color">Primary color</label>
            <input id="primary-color" type="color" value={fields.primaryColor} onChange={(event) => onChange('primaryColor', event.target.value)} disabled={pending} />
            <output htmlFor="primary-color">{fields.primaryColor}</output>
          </div>
          <div className="color-field">
            <label htmlFor="accent-color">Secondary color</label>
            <input id="accent-color" type="color" value={fields.accentColor} onChange={(event) => onChange('accentColor', event.target.value)} disabled={pending} />
            <output htmlFor="accent-color">{fields.accentColor}</output>
          </div>
        </div>
        <div className="business-preview" style={{ borderColor: fields.primaryColor }}>
          {logo
            ? <img src={logo} alt={`${displayName} logo preview`} />
            : <span className="logo-placeholder" style={{ backgroundColor: fields.primaryColor }}>{displayName.slice(0, 1).toUpperCase()}</span>}
          <div><strong>{displayName}</strong><span>Business identity preview</span></div>
          <span className="preview-accent" style={{ backgroundColor: fields.accentColor }} aria-label="Secondary color preview" />
        </div>
        <SubmitButton pending={pending} idle="Save and continue" waiting="Saving appearance…" />
      </form>
    );
  }

  if (step === 2) {
    return (
      <form className="form-stack onboarding-form" onSubmit={onSubmit} noValidate>
        <div className="step-intro"><h2>Add a business contact</h2><p>This is your business phone number, separate from the phone or email you use to sign in.</p></div>
        <label htmlFor="business-phone">Business phone number</label>
        <input id="business-phone" type="tel" autoComplete="tel" maxLength={20} placeholder="+216…" value={fields.businessPhone} onChange={(event) => onChange('businessPhone', event.target.value)} required disabled={pending} />
        <fieldset className="visibility-choice">
          <legend>Should this number be displayed publicly?</legend>
          <label><input type="radio" name="phone-visibility" value="yes" checked={fields.phonePubliclyDisplayed === true} onChange={() => onChange('phonePubliclyDisplayed', true)} disabled={pending} /> Yes, display it on my business profile</label>
          <label><input type="radio" name="phone-visibility" value="no" checked={fields.phonePubliclyDisplayed === false} onChange={() => onChange('phonePubliclyDisplayed', false)} disabled={pending} /> No, keep it private</label>
        </fieldset>
        <p className="field-hint">Choose an option to continue. Your preference is saved with your business setup.</p>
        <SubmitButton pending={pending} idle="Save and continue" waiting="Saving contact…" />
      </form>
    );
  }

  if (step === 3) {
    return (
      <form className="form-stack onboarding-form" onSubmit={onSubmit} noValidate>
        <div className="step-intro"><h2>Add your first branch</h2><p>This is the first location for your business. Additional branches can be managed in a later workflow.</p></div>
        <label htmlFor="branch-name">Branch name</label>
        <input id="branch-name" autoComplete="organization" maxLength={255} placeholder="e.g. Downtown" value={fields.branchName} onChange={(event) => onChange('branchName', event.target.value)} required disabled={pending} />
        <label htmlFor="branch-address">Branch address</label>
        <input id="branch-address" autoComplete="street-address" maxLength={255} placeholder="Street, city" value={fields.branchAddress} onChange={(event) => onChange('branchAddress', event.target.value)} required disabled={pending} />
        <SubmitButton pending={pending} idle="Save and review" waiting="Saving branch…" />
      </form>
    );
  }

  return (
    <form className="form-stack onboarding-form" onSubmit={onSubmit} noValidate>
      <div className="step-intro"><h2>Review your business setup</h2><p>Check the details below. You can go back to any step before finishing.</p></div>
      <dl className="review-card">
        <ReviewItem label="Business" value={fields.businessName} />
        <ReviewItem label="Logo URL" value={fields.logoUrl} />
        <ReviewItem label="Brand colors" value={`${fields.primaryColor} · ${fields.accentColor}`} />
        <ReviewItem label="Business phone" value={fields.businessPhone} />
        <ReviewItem label="Phone visibility" value={fields.phonePubliclyDisplayed ? 'Displayed publicly' : 'Kept private'} />
        <ReviewItem label="First branch" value={fields.branchName} />
        <ReviewItem label="Branch address" value={fields.branchAddress} />
      </dl>
      <p className="field-hint">Finishing is confirmed by the server after it validates every required setup field.</p>
      <SubmitButton pending={pending} idle="Complete business setup" waiting="Completing setup…" />
    </form>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <div className="review-item"><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>;
}
