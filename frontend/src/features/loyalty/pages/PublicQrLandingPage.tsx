import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { Section } from '../../../components/ui/Section';
import { InputField } from '../../../components/ui/InputField';
import { paths } from '../../../app/routes/paths';
import {
  useDiscoverBusinessQuery,
  useLookupCustomerMutation,
  useJoinBusinessMutation,
} from '../api';
import type { PublicBusinessDiscoveryResponse } from '../api/publicApi';

interface JoinFormData {
  name: string;
  phoneNumber: string;
  birthdate?: string;
}

const PHONE_PATTERN = /^[0-9]{8}$/;

function formatPhoneNumber(phone: string): string {
  // Tunisian format: XX XX XX XX or XXXXXXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6)}`;
}

function BusinessCard({ business, program }: PublicBusinessDiscoveryResponse) {
  const themePrimary = business.theme.primaryColor || '#2f7450';
  const themeAccent = business.theme.accentColor || '#f97316';

  return (
    <div className="qr-business-card" style={{
      '--theme-primary': themePrimary,
      '--theme-accent': themeAccent,
    } as React.CSSProperties}>
      {business.logoUrl && (
        <img 
          src={business.logoUrl} 
          alt={`${business.name} logo`} 
          className="qr-business-logo"
        />
      )}
      <h2 className="qr-business-name">{business.name}</h2>
      {business.description && (
        <p className="qr-business-description">{business.description}</p>
      )}
      <div className="qr-business-meta">
        <span className="qr-business-count">{business.branchCount} location{business.branchCount !== 1 ? 's' : ''}</span>
        {program && (
          <span className="qr-program-badge" style={{ backgroundColor: themeAccent }}>
            {program.type === 'stamps' && 'Stamp Card'}
            {program.type === 'points' && 'Points Program'}
            {program.type === 'both' && 'Stamps + Points'}
          </span>
        )}
      </div>
    </div>
  );
}

function BranchInfo({ branch }: { branch: NonNullable<PublicBusinessDiscoveryResponse['branch']> }) {
  return (
    <div className="qr-branch-info">
      <h3>Location</h3>
      <p>{branch.name}</p>
      {branch.address && <p>{branch.address}</p>}
      {branch.phone && <p>📞 {formatPhoneNumber(branch.phone)}</p>}
    </div>
  );
}

function ProgramInfo({ program }: { program: NonNullable<PublicBusinessDiscoveryResponse['program']> }) {
  return (
    <div className="qr-program-info">
      <h3>Loyalty Programme</h3>
      {program.name && <p><strong>{program.name}</strong></p>}
      {program.description && <p>{program.description}</p>}
      <p className="muted">
        {program.type === 'stamps' && 'Collect stamps with each purchase'}
        {program.type === 'points' && 'Earn points for every purchase'}
        {program.type === 'both' && 'Earn both stamps and points'}
      </p>
    </div>
  );
}

export default function PublicQrLandingPage() {
  const { qrId } = useParams<{ qrId: string }>();
  const [step, setStep] = useState<'loading' | 'business' | 'existing' | 'join' | 'success' | 'error'>('loading');
  const [formData, setFormData] = useState<JoinFormData>({ name: '', phoneNumber: '' });
  const [formError, setFormError] = useState<string>('');
  const [apiError, setApiError] = useState<string>('');
  const [existingCustomer, setExistingCustomer] = useState<any | null>(null);

  const { data: businessData, error: discoveryError, isLoading: isDiscovering } =
    useDiscoverBusinessQuery(qrId || '', { skip: !qrId });

  const [lookupCustomer] = useLookupCustomerMutation();
  const [joinBusiness, { isLoading: isJoining }] = useJoinBusinessMutation();

  // Validate form
  const isFormValid = formData.name.trim().length >= 1 && PHONE_PATTERN.test(formData.phoneNumber);

  // Auto-check for existing customer when phone number is entered
  useEffect(() => {
    if (step === 'join' && PHONE_PATTERN.test(formData.phoneNumber)) {
      const debounce = setTimeout(() => {
        lookupCustomer({ phoneNumber: formData.phoneNumber })
          .unwrap()
          .then((result) => {
            if (result.exists && result.customer) {
              setExistingCustomer(result);
              setStep('existing');
            }
          })
          .catch(() => {
            // Lookup failed - customer doesn't exist or error
            // This is fine, we'll proceed with join
          });
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [formData.phoneNumber, step, lookupCustomer]);

  // Handle discovery errors
  useEffect(() => {
    if (discoveryError) {
      setStep('error');
      setApiError('This QR code is not recognized. Please check and try again.');
    }
  }, [discoveryError]);

  // Handle successful discovery
  useEffect(() => {
    if (businessData && !isDiscovering) {
      setStep('business');
    }
  }, [businessData, isDiscovering]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  }

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setApiError('');

    if (!isFormValid) {
      setFormError('Please enter your name and a valid 8-digit Tunisian phone number.');
      return;
    }

    const phoneNumber = formData.phoneNumber.replace(/\s/g, '');

    joinBusiness({
      qrId: qrId!,
      name: formData.name.trim(),
      phoneNumber,
      birthdate: formData.birthdate,
    })
      .unwrap()
      .then(() => {
        setStep('success');
        // The joinBusiness mutation sets the session cookie
        // After a brief delay, redirect to customer dashboard
        setTimeout(() => {
          window.location.href = paths.customerDashboard;
        }, 1000);
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to join. Please try again.') as string;
        setApiError(message);
      });
  }

  function handleContinueWithExisting() {
    // For existing customers, we still need to join this specific business
    // This should be handled by the backend
    const phoneNumber = existingCustomer?.customer?.phoneNumber || formData.phoneNumber;
    joinBusiness({
      qrId: qrId!,
      name: existingCustomer?.customer?.name || formData.name.trim(),
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      birthdate: existingCustomer?.customer?.birthdate,
    })
      .unwrap()
      .then(() => {
        setStep('success');
        setTimeout(() => {
          window.location.href = paths.customerDashboard;
        }, 1000);
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to join. Please try again.') as string;
        setApiError(message);
        setStep('join');
      });
  }

  if (!qrId) {
    return (
      <div className="qr-error-page">
        <p>Invalid QR code URL</p>
        <a href={paths.home}>Return to home</a>
      </div>
    );
  }

  if (step === 'loading' || isDiscovering) {
    return (
      <div className="qr-loading">
        <p role="status">Loading business information…</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="qr-error">
        <p role="alert">{apiError}</p>
        <a href={paths.home} className="primary-button">Return to home</a>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="qr-success">
        <h2>✓ Welcome aboard!</h2>
        <p>You've successfully joined the loyalty programme.</p>
        <p>Redirecting to your dashboard…</p>
      </div>
    );
  }

  // Display business information
  return (
    <div className="qr-landing-page">
      <header className="qr-header">
        <h1>Join Loyalty Programme</h1>
      </header>

      {businessData && (
        <main>
          <BusinessCard business={businessData.business} program={businessData.program} />
          
          {businessData.branch && <BranchInfo branch={businessData.branch} />}
          {businessData.program && <ProgramInfo program={businessData.program} />}

          <Section title="Get started" subtitle="Join this business loyalty programme">
            {step === 'business' && (
              <div className="qr-cta">
                <p>To join this programme and start earning rewards, please enter your details below.</p>
                <button 
                  className="primary-button"
                  onClick={() => setStep('join')}
                >
                  Join Programme
                </button>
              </div>
            )}

            {step === 'join' && (
              <form onSubmit={handleJoinSubmit} className="qr-join-form">
                <InputField
                  id="name"
                  name="name"
                  label="Full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  autoFocus
                />
                <InputField
                  id="phoneNumber"
                  name="phoneNumber"
                  label="Phone number"
                  type="tel"
                  placeholder="23456789"
                  pattern="[0-9]*"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  hint="8-digit Tunisian number"
                />
                <InputField
                  id="birthdate"
                  name="birthdate"
                  label="Date of birth (optional)"
                  type="date"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  hint="Optional"
                />
                
                {formError && <FormFeedback error={formError} />}
                {apiError && <FormFeedback error={apiError} />}
                
                <div className="qr-form-actions">
                  <button 
                    type="button" 
                    className="quiet-button"
                    onClick={() => setStep('business')}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="primary-button"
                    disabled={!isFormValid || isJoining}
                  >
                    {isJoining ? 'Joining…' : 'Join Programme'}
                  </button>
                </div>
              </form>
            )}

            {step === 'existing' && existingCustomer && (
              <div className="qr-existing-customer">
                <p>Welcome back, {existingCustomer.customer?.name}! We found your existing account.</p>
                <p>You're about to join <strong>{businessData.business.name}</strong>.</p>
                
                {existingCustomer.customer?.hasMembership && (
                  <p className="muted">
                    You already have {existingCustomer.customer.memberships.length} membership(s).
                  </p>
                )}
                
                {apiError && <FormFeedback error={apiError} />}
                
                <div className="qr-form-actions">
                  <button 
                    type="button" 
                    className="quiet-button"
                    onClick={() => {
                      setStep('join');
                      setExistingCustomer(null);
                    }}
                  >
                    Use different account
                  </button>
                  <button 
                    type="button" 
                    className="primary-button"
                    onClick={handleContinueWithExisting}
                    disabled={isJoining}
                  >
                    {isJoining ? 'Joining…' : 'Continue and join'}
                  </button>
                </div>
              </div>
            )}
          </Section>
        </main>
      )}
    </div>
  );
}
