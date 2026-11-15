import { useState } from 'react';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { Section } from '../../../components/ui/Section';
import { useAuth } from '../../auth/AuthProvider';
import { paths } from '../../../app/routes/paths';
import {
  useGetCurrentProgramQuery,
  useListProgramsQuery,
  useCreateEnhancedProgramMutation,
  useDeactivateProgramMutation,
} from '../api/programApi';
import type { ProgramDto, EnhancedProgramConfigurationRequest } from '../api/programApi';

// Programme type icons
const ProgramTypeIcon = ({ type }: { type: string }) => {
  const IconStamp = () => (
    <svg className="program-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
  const IconPoints = () => (
    <svg className="program-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="12" cy="19" r="2" fill="currentColor" />
      <path d="M12 8v8" />
    </svg>
  );
  const IconCombined = () => (
    <svg className="program-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
  
  switch (type) {
    case 'stamps': return <IconStamp />;
    case 'points': return <IconPoints />;
    case 'both': return <IconCombined />;
    default: return null;
  }
};

// Status badge component with orange accent for active
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'status-badge status-badge--active' },
    inactive: { label: 'Inactive', className: 'status-badge status-badge--inactive' },
  };
  const variant = variants[status] || { label: status, className: 'status-badge' };
  return <span className={variant.className}>{variant.label}</span>;
}

// Programme type formatter
function formatProgramType(type: string): string {
  const types: Record<string, string> = {
    stamps: 'Stamp Card',
    points: 'Points System',
    both: 'Combined (Stamps + Points)',
  };
  return types[type] || type;
}

// Skeleton loading component for programme cards
function ProgramCardSkeleton() {
  return (
    <div className="program-card skeleton-card">
      <div className="program-card-header">
        <div className="program-card-info">
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-text short" />
        </div>
        <div className="skeleton skeleton-text short" />
      </div>
      <div className="program-card-details">
        <div className="skeleton skeleton-text short" />
      </div>
    </div>
  );
}

// Live summary panel for programme creation
function ProgrammeSummaryPanel({ formData }: { formData: ProgramFormData }) {
  const getTypeLabel = () => {
    switch (formData.type) {
      case 'stamps': return 'Stamp Card';
      case 'points': return 'Points System';
      case 'both': return 'Combined';
      default: return formData.type;
    }
  };

  const hasStampConfig = formData.type === 'stamps' || formData.type === 'both';
  const hasPointsConfig = formData.type === 'points' || formData.type === 'both';

  return (
    <div className="program-summary-panel">
      <h4>Programme Summary</h4>
      
      <div className="summary-section">
        <div className="summary-row">
          <span className="summary-label">Name</span>
          <span className="summary-value">{formData.name || <em>Not set</em>}</span>
        </div>
        
        <div className="summary-row">
          <span className="summary-label">Type</span>
          <span className="summary-value">{getTypeLabel()}</span>
        </div>
        
        {formData.description && (
          <div className="summary-row">
            <span className="summary-label">Description</span>
            <span className="summary-value">{formData.description}</span>
          </div>
        )}
      </div>

      {hasStampConfig && (
        <div className="summary-section">
          <h5>Stamp Configuration</h5>
          <div className="summary-row">
            <span className="summary-label">Earning</span>
            <span className="summary-value">{formData.stampPurchasesPerStamp} purchase{formData.stampPurchasesPerStamp !== 1 ? 's' : ''} = 1 stamp</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Reward</span>
            <span className="summary-value">{formData.stampRewardThreshold} stamps = {formData.stampRewardName || <em>Reward</em>}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Expiration</span>
            <span className="summary-value">{formData.stampExpirationDays ? `${formData.stampExpirationDays} days` : 'No expiration'}</span>
          </div>
        </div>
      )}

      {hasPointsConfig && (
        <div className="summary-section">
          <h5>Points Configuration</h5>
          <div className="summary-row">
            <span className="summary-label">Earning</span>
            <span className="summary-value">1 TND = {formData.pointsPerCurrency} point{formData.pointsPerCurrency !== 1 ? 's' : ''}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Reward</span>
            <span className="summary-value">{formData.pointsRewardThreshold} points = {formData.pointsRewardName || <em>Reward</em>}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Expiration</span>
            <span className="summary-value">{formData.pointsExpirationDays ? `${formData.pointsExpirationDays} days` : 'No expiration'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

type ProgramFormData = {
  name: string;
  description: string;
  type: 'stamps' | 'points' | 'both';
  // Stamp configuration
  stampPurchasesPerStamp: number;
  stampRewardName: string;
  stampRewardThreshold: number;
  stampExpirationDays: number | null;
  // Points configuration
  pointsPerCurrency: number;
  pointsRewardName: string;
  pointsRewardThreshold: number;
  pointsExpirationDays: number | null;
};

const DEFAULT_FORM: ProgramFormData = {
  name: '',
  description: '',
  type: 'stamps',
  stampPurchasesPerStamp: 1,
  stampRewardName: 'Free Item',
  stampRewardThreshold: 10,
  stampExpirationDays: null,
  pointsPerCurrency: 1,
  pointsRewardName: 'Discount',
  pointsRewardThreshold: 100,
  pointsExpirationDays: null,
};

// Expiration options for selects
const EXPIRATION_OPTIONS = [
  { value: '', label: 'No expiration' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
];

export default function MerchantProgramsPage() {
  const { signOut } = useAuth();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<ProgramFormData>(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // API hooks
  const currentProgramQuery = useGetCurrentProgramQuery();
  const programsQuery = useListProgramsQuery();
  const [createEnhancedProgram, { isLoading: isCreating }] = useCreateEnhancedProgramMutation();
  const [deactivateProgram, { isLoading: isDeactivating }] = useDeactivateProgramMutation();

  const currentProgram = currentProgramQuery.data;
  const programsList = programsQuery.data?.programs ?? [];
  const queryError = currentProgramQuery.error || programsQuery.error;
  const isLoading = currentProgramQuery.isLoading || programsQuery.isLoading;

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setShowCreateForm(false);
    setError('');
  };

  // Validate form based on programme type
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required: name
    if (!formData.name.trim()) {
      errors.name = 'Programme name is required';
    }
    
    // Validate based on programme type
    if (formData.type === 'stamps' || formData.type === 'both') {
      if (!formData.stampRewardName.trim()) {
        errors.stampRewardName = 'Stamp reward name is required';
      }
      if (formData.stampPurchasesPerStamp < 1) {
        errors.stampPurchasesPerStamp = 'Purchases per stamp must be at least 1';
      }
      if (formData.stampRewardThreshold < 1) {
        errors.stampRewardThreshold = 'Stamps required must be at least 1';
      }
    }
    
    if (formData.type === 'points' || formData.type === 'both') {
      if (!formData.pointsRewardName.trim()) {
        errors.pointsRewardName = 'Points reward name is required';
      }
      if (formData.pointsPerCurrency < 0.01) {
        errors.pointsPerCurrency = 'Points per TND must be at least 0.01';
      }
      if (formData.pointsRewardThreshold < 1) {
        errors.pointsRewardThreshold = 'Points required must be at least 1';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    const name = formData.name.trim();

    try {
      // Build the enhanced configuration
      const config: EnhancedProgramConfigurationRequest = {
        name,
        description: formData.description || undefined,
        type: formData.type,
      };

      if (formData.type === 'stamps' || formData.type === 'both') {
        config.stamps = {
          earningRule: {
            purchasesPerStamp: formData.stampPurchasesPerStamp,
          },
          rewardThresholds: [
            {
              stampsRequired: formData.stampRewardThreshold,
              name: formData.stampRewardName,
              isActive: true,
            },
          ],
          stampExpirationDays: formData.stampExpirationDays ?? undefined,
        };
      }

      if (formData.type === 'points' || formData.type === 'both') {
        config.points = {
          earningRule: {
            pointsPerCurrencyUnit: formData.pointsPerCurrency,
            currencyCode: 'TND',
          },
          rewardThresholds: [
            {
              pointsRequired: formData.pointsRewardThreshold,
              name: formData.pointsRewardName,
              isActive: true,
            },
          ],
          pointsExpirationDays: formData.pointsExpirationDays ?? undefined,
        };
      }

      await createEnhancedProgram(config).unwrap();
      setNotice('Loyalty programme created successfully!');
      resetForm();
      // Scroll to the new programme in the list
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create programme';
      setError(errorMessage);
      // Check if it's a validation error from the backend
      if (typeof err === 'object' && err !== null && 'data' in err) {
        const backendErr = err as { data?: { message?: string | string[] } };
        if (backendErr.data?.message) {
          const msg = Array.isArray(backendErr.data.message) 
            ? backendErr.data.message.join(', ') 
            : backendErr.data.message;
          setError(msg);
        }
      }
    }
  };

  const handleDeactivate = async (program: ProgramDto) => {
    if (program.status !== 'active') return;
    try {
      await deactivateProgram(program.id).unwrap();
      setNotice('Programme deactivated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate programme');
    }
  };

  const logout = async () => {
    try {
      await signOut(paths.merchantLogin);
    } catch {
      // Ignore logout errors
    }
  };

  if (isLoading) {
    return (
      <section id="workspace-main" className="workspace-page merchant-workspace">
        <div className="workspace-header">
          <div>
            <h1>Configure Your Rewards System</h1>
            <p className="workspace-subtitle">Set up and manage your loyalty programmes</p>
          </div>
        </div>
        
        <Section title="Current Programme" subtitle="Your active loyalty programme">
          <ProgramCardSkeleton />
        </Section>
        
        <Section title="Programme History" subtitle="Previous programme versions">
          <ProgramCardSkeleton />
          <ProgramCardSkeleton />
        </Section>
      </section>
    );
  }

  // Show query errors
  if (queryError) {
    return (
      <section id="workspace-main" className="workspace-page merchant-workspace">
        <div className="workspace-header">
          <div>
            <h1>Configure Your Rewards System</h1>
            <p className="workspace-subtitle">Set up and manage your loyalty programmes</p>
          </div>
          <button className="quiet-button" onClick={logout}>
            Sign out
          </button>
        </div>
        <FormFeedback error={queryError instanceof Error ? queryError.message : 'Failed to load programmes'} />
        <button className="quiet-button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <>
      <a href="#workspace-main" className="sr-only">
        Skip to main content
      </a>
      <section id="workspace-main" className="workspace-page merchant-workspace">
        {/* Header */}
        <div className="workspace-header">
          <div>
            <h1>Configure Your Rewards System</h1>
            <p className="workspace-subtitle">Set up and manage your loyalty programmes</p>
          </div>
          <button className="quiet-button" onClick={logout}>
            Sign out
          </button>
        </div>

        {/* Current Programme Section */}
        <Section title="Current Programme" subtitle="Your active loyalty programme">
          {isLoading ? (
            <ProgramCardSkeleton />
          ) : currentProgram ? (
            <div className="program-card program-card--featured">
              <div className="program-card-header">
                <div className="program-card-icon">
                  <ProgramTypeIcon type={currentProgram.type} />
                </div>
                <div className="program-card-info">
                  <h3 className="program-card-name">{currentProgram.name ?? 'Unnamed Programme'}</h3>
                  <div className="program-card-meta">
                    <span className="program-card-version">v{currentProgram.version}</span>
                    <StatusBadge status={currentProgram.status} />
                  </div>
                </div>
              </div>
              
              <div className="program-card-details">
                <span className="program-card-type">
                  {formatProgramType(currentProgram.type)}
                </span>
              </div>
              
              {currentProgram.description && (
                <p className="program-card-description">{currentProgram.description}</p>
              )}

              <div className="program-actions">
                <button
                  className="quiet-button"
                  onClick={() => handleDeactivate(currentProgram)}
                  disabled={isDeactivating}
                >
                  {isDeactivating ? 'Deactivating...' : 'Deactivate Programme'}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-message">
                You don't have an active loyalty programme yet. Create one to start rewarding your customers.
              </p>
              <div className="empty-state-actions">
                <button className="choice-card" onClick={() => setShowCreateForm(true)}>
                  <strong>+ Create New Programme</strong>
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* Programme History Section */}
        <Section title="Programme History" subtitle="Previous programme versions">
          {isLoading ? (
            <>
              <ProgramCardSkeleton />
              <ProgramCardSkeleton />
            </>
          ) : programsList.length > 0 ? (
            <div className="program-list">
              {programsList.map((program) => (
                <div key={program.id} className="program-card">
                  <div className="program-card-header">
                    <div className="program-card-icon">
                      <ProgramTypeIcon type={program.type} />
                    </div>
                    <div className="program-card-info">
                      <h4 className="program-card-name">{program.name ?? 'Unnamed Programme'}</h4>
                      <div className="program-card-meta">
                        <span className="program-card-version">v{program.version}</span>
                        <StatusBadge status={program.status} />
                      </div>
                    </div>
                  </div>
                  <div className="program-card-details">
                    <span className="program-card-type">
                      {formatProgramType(program.type)}
                    </span>
                  </div>
                  {program.description && (
                    <p className="program-card-description">{program.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-message">No previous programme versions yet.</p>
            </div>
          )}
        </Section>

        {/* Create Programme Section */}
        <Section title="Create Loyalty Programme" subtitle="Set up your rewards system">
          {!showCreateForm ? (
            <button className="choice-card" onClick={() => setShowCreateForm(true)}>
              <strong>+ Create New Programme</strong>
            </button>
          ) : null}

          {showCreateForm && (
            <div className="form-layout">
              <form className="form-panel form-panel--main" onSubmit={handleSubmit}>
                <h3>New Loyalty Programme</h3>

                {/* Programme Metadata */}
                <div className="form-section">
                  <div className="form-row">
                    <label htmlFor="program-name">
                      Programme Name <span className="required-marker">*</span>
                    </label>
                    <input
                      id="program-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (fieldErrors.name) {
                          setFieldErrors({ ...fieldErrors, name: '' });
                        }
                      }}
                      placeholder="e.g., Coffee Rewards, Loyalty Club"
                      required
                      aria-required="true"
                      className={fieldErrors.name ? 'error' : ''}
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    />
                    {fieldErrors.name && (
                      <span id="name-error" className="form-feedback error" role="alert">
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <label htmlFor="program-description">Description</label>
                    <textarea
                      id="program-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your loyalty programme to customers"
                      rows={2}
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="program-type">
                      Programme Type <span className="required-marker">*</span>
                    </label>
                    <select
                      id="program-type"
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value as 'stamps' | 'points' | 'both';
                        const newData = { ...formData, type: newType };
                        
                        // Clear configs that are no longer relevant for this type
                        if (newType === 'stamps') {
                          // Keep stamp config, reset points config
                          newData.pointsPerCurrency = 1;
                          newData.pointsRewardName = 'Discount';
                          newData.pointsRewardThreshold = 100;
                          newData.pointsExpirationDays = null;
                        } else if (newType === 'points') {
                          // Keep points config, reset stamp config
                          newData.stampPurchasesPerStamp = 1;
                          newData.stampRewardName = 'Free Item';
                          newData.stampRewardThreshold = 10;
                          newData.stampExpirationDays = null;
                        }
                        // For 'both', keep both configs
                        
                        setFormData(newData);
                        setFieldErrors({});
                      }}
                      required
                      aria-required="true"
                    >
                      <option value="stamps">Stamp Card (e.g., Buy 10, Get 1 Free)</option>
                      <option value="points">Points System (e.g., Spend 1 TND = X Points)</option>
                      <option value="both">Combined (Stamps + Points)</option>
                    </select>
                  </div>
                </div>

              {/* Stamp Configuration */}
              {(formData.type === 'stamps' || formData.type === 'both') && (
                <div className="form-section">
                  <h4>Stamp Configuration</h4>

                  <div className="form-row">
                    <label htmlFor="stamp-purchases">
                      Purchases per Stamp <span className="required-marker">*</span>
                    </label>
                    <input
                      id="stamp-purchases"
                      type="number"
                      min={1}
                      value={formData.stampPurchasesPerStamp}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          stampPurchasesPerStamp: parseInt(e.target.value) || 1,
                        });
                        if (fieldErrors.stampPurchasesPerStamp) {
                          setFieldErrors({ ...fieldErrors, stampPurchasesPerStamp: '' });
                        }
                      }}
                      className={fieldErrors.stampPurchasesPerStamp ? 'error' : ''}
                      aria-invalid={!!fieldErrors.stampPurchasesPerStamp}
                    />
                    {fieldErrors.stampPurchasesPerStamp && (
                      <span className="form-feedback error" role="alert">
                        {fieldErrors.stampPurchasesPerStamp}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <label htmlFor="stamp-reward-name">
                      Reward Name <span className="required-marker">*</span>
                    </label>
                    <input
                      id="stamp-reward-name"
                      type="text"
                      value={formData.stampRewardName}
                      onChange={(e) => {
                        setFormData({ ...formData, stampRewardName: e.target.value });
                        if (fieldErrors.stampRewardName) {
                          setFieldErrors({ ...fieldErrors, stampRewardName: '' });
                        }
                      }}
                      placeholder="e.g., Free Coffee"
                      className={fieldErrors.stampRewardName ? 'error' : ''}
                      aria-invalid={!!fieldErrors.stampRewardName}
                    />
                    {fieldErrors.stampRewardName && (
                      <span className="form-feedback error" role="alert">
                        {fieldErrors.stampRewardName}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <label htmlFor="stamp-threshold">
                      Stamps Required for Reward <span className="required-marker">*</span>
                    </label>
                    <input
                      id="stamp-threshold"
                      type="number"
                      min={1}
                      value={formData.stampRewardThreshold}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          stampRewardThreshold: parseInt(e.target.value) || 10,
                        });
                        if (fieldErrors.stampRewardThreshold) {
                          setFieldErrors({ ...fieldErrors, stampRewardThreshold: '' });
                        }
                      }}
                      className={fieldErrors.stampRewardThreshold ? 'error' : ''}
                      aria-invalid={!!fieldErrors.stampRewardThreshold}
                    />
                    {fieldErrors.stampRewardThreshold && (
                      <span className="form-feedback error" role="alert">
                        {fieldErrors.stampRewardThreshold}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <label htmlFor="stamp-expiry">Stamp Expiration</label>
                    <select
                      id="stamp-expiry"
                      value={formData.stampExpirationDays ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stampExpirationDays: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                    >
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Points Configuration */}
              {(formData.type === 'points' || formData.type === 'both') && (
                <div className="form-section">
                  <h4>Points Configuration</h4>

                  <div className="form-row">
                    <label htmlFor="points-per-currency">
                      Points per TND Spent <span className="required-marker">*</span>
                    </label>
                    <input
                      id="points-per-currency"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={formData.pointsPerCurrency}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          pointsPerCurrency: parseFloat(e.target.value) || 1,
                        });
                        if (fieldErrors.pointsPerCurrency) {
                          setFieldErrors({ ...fieldErrors, pointsPerCurrency: '' });
                        }
                      }}
                      className={fieldErrors.pointsPerCurrency ? 'error' : ''}
                      aria-invalid={!!fieldErrors.pointsPerCurrency}
                    />
                    {fieldErrors.pointsPerCurrency && (
                      <span className="form-feedback error" role="alert">
                        {fieldErrors.pointsPerCurrency}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <label htmlFor="points-reward-name">
                      Reward Name <span className="required-marker">*</span>
                    </label>
                    <input
                      id="points-reward-name"
                      type="text"
                      value={formData.pointsRewardName}
                      onChange={(e) => {
                        setFormData({ ...formData, pointsRewardName: e.target.value });
                        if (fieldErrors.pointsRewardName) {
                          setFieldErrors({ ...fieldErrors, pointsRewardName: '' });
                        }
                      }}
                      placeholder="e.g., 10% Discount"
                      className={fieldErrors.pointsRewardName ? 'error' : ''}
                      aria-invalid={!!fieldErrors.pointsRewardName}
                    />
                    {fieldErrors.pointsRewardName && (
                      <span className="form-feedback error" role="alert">
                        {fieldErrors.pointsRewardName}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <label htmlFor="points-threshold">
                      Points Required for Reward <span className="required-marker">*</span>
                    </label>
                    <input
                      id="points-threshold"
                      type="number"
                      min={1}
                      value={formData.pointsRewardThreshold}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          pointsRewardThreshold: parseInt(e.target.value) || 100,
                        });
                        if (fieldErrors.pointsRewardThreshold) {
                          setFieldErrors({ ...fieldErrors, pointsRewardThreshold: '' });
                        }
                      }}
                      className={fieldErrors.pointsRewardThreshold ? 'error' : ''}
                      aria-invalid={!!fieldErrors.pointsRewardThreshold}
                    />
                    {fieldErrors.pointsRewardThreshold && (
                      <span className="form-feedback error" role="alert">
                        {fieldErrors.pointsRewardThreshold}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <label htmlFor="points-expiry">Points Expiration</label>
                    <select
                      id="points-expiry"
                      value={formData.pointsExpirationDays ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pointsExpirationDays: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                    >
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Programme'}
                </button>
                <button type="button" className="quiet-button" onClick={resetForm}>
                  Cancel
                </button>
              </div>
              </form>

              {/* Programme Summary Panel - Sticky */}
              <ProgrammeSummaryPanel formData={formData} />
            </div>
          )}
        </Section>

        <FormFeedback error={error} notice={notice} />

        {/* Navigation */}
        <Section title="Next steps" subtitle="What you can do">
          <div className="task-list">
            <a className="task-row" href={paths.merchantDashboard}>
              <span>Back to dashboard</span>
            </a>
            <a className="task-row" href={paths.merchantBranches}>
              <span>Manage branches</span>
            </a>
          </div>
        </Section>
      </section>
    </>
  );
}
