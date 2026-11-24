import { useState, useEffect, type FormEvent } from 'react';
import { useI18n } from '../../../shared/i18n/i18n';
import { Button, Card, Section, FormFeedback, Input } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useGetBusinessSetupQuery, useUpdateBusinessMutation } from '@/features/business-onboarding/api/businessOnboardingApi';
import { Building2, Mail, Phone, Globe } from 'lucide-react';
import { BusinessLogo } from '../../../components/ui/BusinessLogo';
import { LogoPresetPicker } from '@/features/business-onboarding/logo/LogoPresetPicker';
import { getLogoPreset, parseLogo } from '@/features/business-onboarding/logo/logoPresets';
import type { UpdateBusinessRequest } from '@/features/business-onboarding/api/businessOnboardingApi';
import type { BusinessSetup } from '@/features/business-onboarding/types/businessOnboarding.types';

export default function MerchantBusinessProfilePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  
  // API hooks
  const setupQuery = useGetBusinessSetupQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const businessSetup = setupQuery.data as BusinessSetup | undefined;
  const business = businessSetup?.business;
  
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateBusinessRequest>({});

  // Error and success states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Loading state
  const isLoading = setupQuery.isLoading || setupQuery.isFetching;
  const hasError = setupQuery.isError;

  // Initialize edit data when business data loads
  useEffect(() => {
    if (business) {
      const theme = business.theme ? {
        primaryColor: business.theme.primaryColor ?? '',
        accentColor: business.theme.accentColor ?? '',
      } : undefined;
      
      setEditData({
        name: business.name,
        description: business.description ?? undefined,
        businessPhone: business.businessPhone ?? undefined,
        phonePubliclyDisplayed: business.phonePubliclyDisplayed,
        logoUrl: business.logoUrl ?? undefined,
        theme,
      });
    }
  }, [business]);
  
  // Handle input change
  const handleInputChange = <K extends keyof UpdateBusinessRequest>(
    key: K,
    value: UpdateBusinessRequest[K]
  ) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      // `preset:<id>` or the existing http(s) URL, sent as is.
      const logoUrl = editData.logoUrl;

      // Prepare update payload
      const updatePayload: UpdateBusinessRequest = {
        name: editData.name,
        description: editData.description,
        businessPhone: editData.businessPhone,
        phonePubliclyDisplayed: editData.phonePubliclyDisplayed,
        logoUrl,
        theme: editData.theme,
      };
      
      // Only include fields that have changed
      const payload: UpdateBusinessRequest = {};
      if (business) {
        if (updatePayload.name !== business.name) payload.name = updatePayload.name;
        if (updatePayload.description !== business.description && updatePayload.description !== undefined) 
          payload.description = updatePayload.description;
        if (updatePayload.businessPhone !== business.businessPhone && updatePayload.businessPhone !== undefined) 
          payload.businessPhone = updatePayload.businessPhone;
        if (updatePayload.phonePubliclyDisplayed !== business.phonePubliclyDisplayed) 
          payload.phonePubliclyDisplayed = updatePayload.phonePubliclyDisplayed;
        if (updatePayload.logoUrl !== business.logoUrl && updatePayload.logoUrl !== undefined) 
          payload.logoUrl = updatePayload.logoUrl;
        if (updatePayload.theme && business.theme && 
            (updatePayload.theme.primaryColor !== business.theme.primaryColor ||
             updatePayload.theme.accentColor !== business.theme.accentColor)) {
          payload.theme = updatePayload.theme;
        }
      }
      
      // Only send if there are changes
      if (Object.keys(payload).length > 0) {
        await updateBusiness(payload).unwrap();
        setSuccess(t('businessUpdatedSuccessfully'));
      } else {
        setSuccess(t('noChangesMade'));
      }
      
      setIsEditing(false);

      // Refetch business data
      setupQuery.refetch();
    } catch (err) {
      setError(typeof err === 'object' && err !== null && 'data' in err ? 
        (err.data as { message?: string }).message || String(err) : String(err));
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    if (business) {
      const theme = business.theme ? {
        primaryColor: business.theme.primaryColor ?? '',
        accentColor: business.theme.accentColor ?? '',
      } : undefined;
      
      setEditData({
        name: business.name,
        description: business.description ?? undefined,
        businessPhone: business.businessPhone ?? undefined,
        phonePubliclyDisplayed: business.phonePubliclyDisplayed,
        logoUrl: business.logoUrl ?? undefined,
        theme,
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full space-y-6">
          <div className="h-10 w-64 bg-[var(--subtle)] rounded-lg animate-pulse" />
          <div className="h-64 w-full bg-[var(--subtle)] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <Card className="p-6 text-center">
            <h2 className="text-[var(--danger)] text-lg font-semibold mb-2">{t('error')}</h2>
            <p className="text-[var(--text-muted)] text-sm mb-4">{t('failedToLoad')}</p>
            <Button variant="outline" onClick={() => navigate('/merchant')}>
              {t('backToDashboard')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <Card className="p-6 text-center">
            <h2 className="text-[var(--text)] text-lg font-semibold mb-2">{t('noBusiness')}</h2>
            <p className="text-[var(--text-muted)] text-sm mb-4">{t('setupBusinessToContinue')}</p>
            <Button onClick={() => navigate('/merchant/onboarding')}>
              {t('setupBusiness')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const logo = parseLogo(business.logoUrl);
  const logoName = logo.kind === 'preset'
    ? t(getLogoPreset(logo.id).labelKey)
    : logo.kind === 'image' ? t('logoCurrent') : t('noLogoUploaded');

  return (
    <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-screen-md w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
              {t('businessProfile')}
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
              {t('manageYourBusinessInformation')}
            </p>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              {t('edit')}
            </Button>
          )}
        </header>

        <Section title={t('businessProfile')}>
          <FormFeedback error={error || undefined} success={success || undefined} />

          <Card className="p-6">
          {isEditing ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Logo: presets (file upload hidden until real storage exists) */}
              <LogoPresetPicker
                value={editData.logoUrl ?? ''}
                onChange={(value) => handleInputChange('logoUrl', value)}
                businessName={editData.name || business.name}
                color={editData.theme?.primaryColor || business.theme?.primaryColor}
                disabled={isUpdating}
              />

              {/* Business Name */}
              <Input
                label={t('businessName')}
                value={editData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isUpdating}
                required
              />

              {/* Business Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text)]">
                  {t('businessDescription')}
                </label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={isUpdating}
                  className="w-full p-3 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] min-h-[100px]"
                />
              </div>

              {/* Business Phone */}
              <Input
                label={t('businessPhone')}
                type="tel"
                value={editData.businessPhone || ''}
                onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                disabled={isUpdating}
              />

              {/* Phone Visibility */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text)]">
                  {t('phoneVisibility')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editData.phonePubliclyDisplayed === true}
                      onChange={() => handleInputChange('phonePubliclyDisplayed', true)}
                      disabled={isUpdating}
                    />
                    <span className="text-sm">{t('phonePubliclyDisplayed')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editData.phonePubliclyDisplayed === false}
                      onChange={() => handleInputChange('phonePubliclyDisplayed', false)}
                      disabled={isUpdating}
                    />
                    <span className="text-sm">{t('phoneKeptPrivate')}</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  isLoading={isUpdating}
                >
                  {t('save')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Logo Display */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <BusinessLogo
                  logoUrl={business.logoUrl}
                  name={business.name}
                  color={business.theme?.primaryColor}
                  size="xl"
                  className="border-2 border-[var(--border)]"
                />
                <div className="flex-1">
                  <h3 className="text-[var(--text)] font-medium">{t('businessLogo')}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{logoName}</p>
                </div>
              </div>

              {/* Business Name */}
              <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
                <Building2 className="h-6 w-6 text-[var(--text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[var(--text)] font-medium">{business.name}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{t('businessName')}</p>
                </div>
              </div>

              {/* Business Description */}
              {business.description && (
                <div className="flex items-start gap-4 pt-4 border-t border-[var(--border)]">
                  <Mail className="h-6 w-6 text-[var(--text-muted)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text)] text-sm">{business.description}</p>
                    <p className="text-[var(--text-muted)] text-xs">{t('businessDescription')}</p>
                  </div>
                </div>
              )}

              {/* Business Phone */}
              {business.businessPhone && (
                <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
                  <Phone className="h-6 w-6 text-[var(--text-muted)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text)] text-sm">{business.businessPhone}</p>
                    <p className="text-[var(--text-muted)] text-xs">
                      {business.phonePubliclyDisplayed ? t('phonePubliclyDisplayed') : t('phoneKeptPrivate')}
                    </p>
                  </div>
                </div>
              )}

              {/* Branch Count */}
              <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
                <Globe className="h-6 w-6 text-[var(--text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text)] text-sm">
                    {t('branchCount')}: {business.branchCount}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
        </Section>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/merchant')}>
            {t('backToDashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
}
