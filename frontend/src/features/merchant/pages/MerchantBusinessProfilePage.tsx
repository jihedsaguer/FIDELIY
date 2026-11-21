import { useState, useEffect, type FormEvent } from 'react';
import { useI18n } from '../../../shared/i18n/i18n';
import { Button, Card, Section, FormFeedback, Input } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useGetBusinessSetupQuery, useUpdateBusinessMutation, useUploadLogoMutation, useGetLogoQuery } from '@/features/business-onboarding/api/businessOnboardingApi';
import { Building2, Mail, Phone, Globe, Image as ImageIcon } from 'lucide-react';
import type { UpdateBusinessRequest } from '@/features/business-onboarding/api/businessOnboardingApi';
import type { BusinessSetup } from '@/features/business-onboarding/types/businessOnboarding.types';

export default function MerchantBusinessProfilePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  
  // API hooks
  const setupQuery = useGetBusinessSetupQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();
  const [uploadLogo, { isLoading: isUploading }] = useUploadLogoMutation();
  
  // Logo query
  const logoQuery = useGetLogoQuery(undefined, {
    skip: !setupQuery.data?.business?.logoUrl,
  });
  
  const businessSetup = setupQuery.data as BusinessSetup | undefined;
  const business = businessSetup?.business;
  
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateBusinessRequest>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);
  
  // Error and success states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Loading state
  const isLoading = setupQuery.isLoading || setupQuery.isFetching;
  const hasError = setupQuery.isError;
  const logoQueryError = logoQuery.error;
  
  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoObjectUrl) {
        URL.revokeObjectURL(logoObjectUrl);
      }
    };
  }, [logoObjectUrl]);
  
  // Update logo object URL when query data changes
  useEffect(() => {
    if (logoQuery.data) {
      const url = URL.createObjectURL(logoQuery.data);
      setLogoObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoObjectUrl(null);
  }, [logoQuery.data]);
  
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
  
  // Handle logo file selection
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('logoMustBeImage'));
      return;
    }
    
    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError(t('logoTooLarge'));
      return;
    }
    
    setLogoFile(file);
    setError(null);
    
    // Create preview using FileReader (doesn't need cleanup)
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
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
      // Upload logo if file selected
      let logoUrl = editData.logoUrl;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const uploadResult = await uploadLogo(formData).unwrap();
        logoUrl = uploadResult.storageKey;
      }
      
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
      setLogoFile(null);
      setLogoPreview(null);
      
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
    setLogoFile(null);
    setLogoPreview(null);
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
      <main className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full space-y-6">
          <div className="h-10 w-64 bg-[var(--subtle)] rounded-lg animate-pulse" />
          <div className="h-64 w-full bg-[var(--subtle)] rounded-lg animate-pulse" />
        </div>
      </main>
    );
  }

  if (hasError) {
    return (
      <main className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <Card className="p-6 text-center">
            <h2 className="text-[var(--danger)] text-lg font-semibold mb-2">{t('error')}</h2>
            <p className="text-[var(--text-muted)] text-sm mb-4">{t('failedToLoad')}</p>
            <Button variant="outline" onClick={() => navigate('/merchant')}>
              {t('backToDashboard')}
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-screen-md w-full">
          <Card className="p-6 text-center">
            <h2 className="text-[var(--text)] text-lg font-semibold mb-2">{t('noBusiness')}</h2>
            <p className="text-[var(--text-muted)] text-sm mb-4">{t('setupBusinessToContinue')}</p>
            <Button onClick={() => navigate('/merchant/onboarding')}>
              {t('setupBusiness')}
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[var(--background)] p-4 md:p-8">
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
              {/* Logo Upload */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-shrink-0 h-20 w-20 rounded-lg bg-[var(--subtle)] border-2 border-[var(--border)] flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Business logo preview"
                      className="w-full h-full object-cover"
                    />
                  ) : logoObjectUrl ? (
                    <img
                      src={logoObjectUrl}
                      alt="Business logo"
                      className="w-full h-full object-cover"
                    />
                  ) : business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt="Business logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">
                    {t('businessLogo')}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="text-sm"
                    disabled={isUpdating || isUploading}
                  />
                  <p className="text-[var(--text-muted)] text-xs mt-1">
                    {t('logoUploadHint')}
                  </p>
                </div>
              </div>

              {/* Business Name */}
              <Input
                label={t('businessName')}
                value={editData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isUpdating || isUploading}
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
                  disabled={isUpdating || isUploading}
                  className="w-full p-3 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] min-h-[100px]"
                />
              </div>

              {/* Business Phone */}
              <Input
                label={t('businessPhone')}
                type="tel"
                value={editData.businessPhone || ''}
                onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                disabled={isUpdating || isUploading}
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
                      disabled={isUpdating || isUploading}
                    />
                    <span className="text-sm">{t('phonePubliclyDisplayed')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editData.phonePubliclyDisplayed === false}
                      onChange={() => handleInputChange('phonePubliclyDisplayed', false)}
                      disabled={isUpdating || isUploading}
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
                  disabled={isUpdating || isUploading}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  isLoading={isUpdating || isUploading}
                >
                  {t('save')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Logo Display */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-shrink-0 h-20 w-20 rounded-lg bg-[var(--subtle)] border-2 border-[var(--border)] flex items-center justify-center overflow-hidden">
                  {logoObjectUrl ? (
                    <img
                      src={logoObjectUrl}
                      alt="Business logo"
                      className="w-full h-full object-cover"
                    />
                  ) : business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt="Business logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[var(--text)] font-medium">{t('businessLogo')}</h3>
                  {logoQueryError ? (
                    <p className="text-[var(--danger)] text-sm">{t('failedToLoad')}</p>
                  ) : (
                    <p className="text-[var(--text-muted)] text-sm">
                      {business.logoUrl ? t('logoUploaded') : t('noLogoUploaded')}
                    </p>
                  )}
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
    </main>
  );
}
