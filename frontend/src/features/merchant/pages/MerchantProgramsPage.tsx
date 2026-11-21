import { useState, useCallback } from 'react';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { Section } from '../../../components/ui/Section';
import { useAuth } from '../../auth/AuthProvider';
import { paths } from '../../../app/routes/paths';
import { useI18n } from '../../../shared/i18n/i18n';
import {
  useGetCurrentProgramQuery,
  useGetProgramHistoryQuery,
  useCreateEnhancedProgramMutation,
  useDeactivateProgramMutation,
} from '../api/programApi';
import type { ProgramDto, EnhancedProgramConfigurationRequest } from '../api/programApi';
import {
  ProgramCardSkeleton,
  ProgrammeSummaryPanel,
  ProgramEmptyState,
  ProgramHistoryEmptyState,
  ProgramCard,
  EXPIRATION_OPTIONS,
} from '../programs';
import { useProgramForm } from '../programs/hooks/useProgramForm';

/**
 * MerchantProgramsPage - Main page for managing loyalty programmes
 * Improved for practical merchant use:
 * - Programme cards and their status are easy to scan
 * - Create/edit form has clear hierarchy and usability
 * - Programme type, earning rules, and rewards are clearly organized
 * - Fully responsive, especially on mobile
 * - Supports FR/EN/AR and RTL
 * Preserves existing CRUD, validation, preview, and API behavior.
 */
export default function MerchantProgramsPage() {
  const { signOut } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Use custom hook for form state management
  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    resetForm,
    validateForm,
    handleTypeChange,
  } = useProgramForm();

  // API hooks
  const currentProgramQuery = useGetCurrentProgramQuery();
  const historyQuery = useGetProgramHistoryQuery();
  const [createEnhancedProgram, { isLoading: isCreating }] = useCreateEnhancedProgramMutation();
  const [deactivateProgram, { isLoading: isDeactivating }] = useDeactivateProgramMutation();

  const currentProgram = currentProgramQuery.data;
  // Use history endpoint to get previous programme versions (excludes active)
  const programsList = historyQuery.data ?? [];
  const queryError = currentProgramQuery.error || historyQuery.error;
  const isLoading = currentProgramQuery.isLoading || historyQuery.isLoading;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
      setNotice(t('success'));
      resetForm();
      setShowCreateForm(false);
      // Refresh the page to show the new programme
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error');
      setError(errorMessage);
      
      // Try to extract more specific error message
      const backendErr = err as { data?: { message?: string | string[] } };
      if (backendErr.data?.message) {
        const msg = Array.isArray(backendErr.data.message)
          ? backendErr.data.message.join(', ')
          : backendErr.data.message;
        setError(msg);
      }
    }
  }, [formData, validateForm, resetForm, createEnhancedProgram, t]);

  const handleDeactivate = useCallback(async (program: ProgramDto) => {
    try {
      await deactivateProgram(program.id).unwrap();
      setNotice('Programme deactivated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }, [deactivateProgram, t]);

  const logout = useCallback(async () => {
    try {
      await signOut(paths.merchantLogin);
    } catch {
      // Ignore logout errors
    }
  }, [signOut]);

  const closeForm = useCallback(() => {
    resetForm();
    setShowCreateForm(false);
    setError('');
  }, [resetForm]);

  if (isLoading) {
    return (
      <section id="workspace-main" className="workspace-page merchant-workspace">
        <div className="workspace-header">
          <div>
            <h1>{t('programs')}</h1>
            <p className="workspace-subtitle">{t('manageYourAccount')}</p>
          </div>
          <button className="quiet-button" onClick={logout}>
            {t('signOut')}
          </button>
        </div>
        
        <Section title={t('loyaltyProgram')} subtitle="">
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
            <h1>{t('programs')}</h1>
            <p className="workspace-subtitle">{t('manageYourAccount')}</p>
          </div>
          <button className="quiet-button" onClick={logout}>
            {t('signOut')}
          </button>
        </div>
        <FormFeedback error={queryError instanceof Error ? queryError.message : t('error')} />
        <button className="quiet-button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <>
      <a href="#workspace-main" className="sr-only">
        {t('skipToMainContent')}
      </a>
      <section id="workspace-main" className="workspace-page merchant-workspace">
        {/* Header */}
        <div className="workspace-header">
          <div>
            <h1>{t('programs')}</h1>
            <p className="workspace-subtitle">{t('manageYourAccount')}</p>
          </div>
          <button className="quiet-button" onClick={logout}>
            {t('signOut')}
          </button>
        </div>

        {/* Current Programme Section */}
        <Section title={t('loyaltyProgram')} subtitle="">
          {currentProgram ? (
            <ProgramCard
              program={currentProgram}
              isFeatured
              showActions
              onDeactivate={handleDeactivate}
              isDeactivating={isDeactivating}
            />
          ) : (
            <ProgramEmptyState />
          )}
        </Section>

        {/* Programme History Section */}
        <Section title="Programme History" subtitle="Previous programme versions">
          {programsList.length > 0 ? (
            <div className="program-list">
              {programsList.map((program: ProgramDto) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          ) : (
            <ProgramHistoryEmptyState />
          )}
        </Section>

        {/* Create Programme Section */}
        <Section title={t('createProgram')} subtitle="Set up your rewards system">
          {!showCreateForm && (
            <button className="choice-card" onClick={() => setShowCreateForm(true)}>
              <strong>+ {t('createProgram')}</strong>
            </button>
          )}

          {showCreateForm && (
            <div className="form-layout">
              <form className="form-panel form-panel--main" onSubmit={handleSubmit}>
                <h3>{t('createProgram')}</h3>

                {/* Programme Metadata Section */}
                <div className="form-section">
                  <legend className="form-section-legend">Programme Details</legend>
                  
                  <div className="form-row">
                    <label htmlFor="program-name">
                      {t('name')} <span className="required-marker" aria-label={t('required')}>*</span>
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
                    <label htmlFor="program-description">{t('description')} <span className="muted">({t('optional')})</span></label>
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
                      Programme Type <span className="required-marker" aria-label={t('required')}>*</span>
                    </label>
                    <select
                      id="program-type"
                      value={formData.type}
                      onChange={(e) => {
                        handleTypeChange(e.target.value as 'stamps' | 'points' | 'both');
                      }}
                    >
                      <option value="stamps">Stamp Card</option>
                      <option value="points">Points System</option>
                      <option value="both">Combined (Stamps + Points)</option>
                    </select>
                  </div>
                </div>

                {/* Stamp Configuration Section */}
                {(formData.type === 'stamps' || formData.type === 'both') && (
                  <div className="form-section">
                    <legend className="form-section-legend">Stamp Configuration</legend>
                    
                    <div className="form-row">
                      <label htmlFor="stamp-earning">
                        Stamps Per Purchase <span className="required-marker" aria-label={t('required')}>*</span>
                      </label>
                      <input
                        id="stamp-earning"
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
                        Reward Name <span className="required-marker" aria-label={t('required')}>*</span>
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
                        aria-describedby={fieldErrors.stampRewardName ? 'stamp-reward-error' : undefined}
                      />
                      {fieldErrors.stampRewardName && (
                        <span id="stamp-reward-error" className="form-feedback error" role="alert">
                          {fieldErrors.stampRewardName}
                        </span>
                      )}
                    </div>

                    <div className="form-row">
                      <label htmlFor="stamp-threshold">
                        Stamps Required for Reward <span className="required-marker" aria-label={t('required')}>*</span>
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
                      <label htmlFor="stamp-expiry">Stamp Expiration <span className="muted">({t('optional')})</span></label>
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

                {/* Points Configuration Section */}
                {(formData.type === 'points' || formData.type === 'both') && (
                  <div className="form-section">
                    <legend className="form-section-legend">Points Configuration</legend>
                    
                    <div className="form-row">
                      <label htmlFor="points-per-currency">
                        Points Per TND <span className="required-marker" aria-label={t('required')}>*</span>
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
                        Reward Name <span className="required-marker" aria-label={t('required')}>*</span>
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
                        aria-describedby={fieldErrors.pointsRewardName ? 'points-reward-error' : undefined}
                      />
                      {fieldErrors.pointsRewardName && (
                        <span id="points-reward-error" className="form-feedback error" role="alert">
                          {fieldErrors.pointsRewardName}
                        </span>
                      )}
                    </div>

                    <div className="form-row">
                      <label htmlFor="points-threshold">
                        Points Required for Reward <span className="required-marker" aria-label={t('required')}>*</span>
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
                      <label htmlFor="points-expiry">Points Expiration <span className="muted">({t('optional')})</span></label>
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
                    {isCreating ? 'Creating...' : t('create')}
                  </button>
                  <button type="button" className="quiet-button" onClick={closeForm}>
                    {t('cancel')}
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
        <Section title={t('next')} subtitle={t('whatYouCanDo')}>
          <div className="task-list">
            <a className="task-row" href={paths.merchantDashboard}>
              <span>{t('backToDashboard')}</span>
            </a>
            <a className="task-row" href={paths.merchantBranches}>
              <span>{t('manage')} {t('branches')}</span>
            </a>
          </div>
        </Section>
      </section>
    </>
  );
}
