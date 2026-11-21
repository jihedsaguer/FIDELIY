import { LoyaltyCardPreview } from '../../components/LoyaltyCardPreview';
import { getProgramTypeLabel, type TranslateFunction } from '../../../loyalty/components';
import type { EnhancedProgramConfigurationRequest } from '../../api/programApi';
import type { ProgramFormData } from '../types/programForm.types';

interface ProgrammeSummaryPanelProps {
  formData: ProgramFormData;
  t: TranslateFunction;
}

/**
 * ProgrammeSummaryPanel - Shows a live summary of the programme being configured
 * Improved organization:
 * - Clear section hierarchy with programme metadata first
 * - Separate sections for Stamps and Points configurations
 * - Earning rules and rewards clearly grouped
 * - Customer Loyalty Card Preview for visual verification
 * Includes text summary and visual preview of customer loyalty card
 * Uses shared ProgramTypeLabel for consistent type labeling.
 */
export function ProgrammeSummaryPanel({ formData, t }: ProgrammeSummaryPanelProps) {
  const programmeLabel = getProgramTypeLabel(formData.type, t);
  
  const hasStampConfig = formData.type === 'stamps' || formData.type === 'both';
  const hasPointsConfig = formData.type === 'points' || formData.type === 'both';

  // Create a preview programme object from form data
  const previewProgramme: EnhancedProgramConfigurationRequest = {
    name: formData.name || t('previewProgramme'),
    description: formData.description || '',
    type: formData.type,
    stamps: hasStampConfig ? {
      earningRule: { purchasesPerStamp: formData.stampPurchasesPerStamp },
      rewardThresholds: [{ 
        stampsRequired: formData.stampRewardThreshold, 
        name: formData.stampRewardName || t('reward'), 
        isActive: true 
      }],
      stampExpirationDays: formData.stampExpirationDays ?? undefined,
    } : undefined,
    points: hasPointsConfig ? {
      earningRule: { 
        pointsPerCurrencyUnit: formData.pointsPerCurrency, 
        currencyCode: 'TND' 
      },
      rewardThresholds: [{ 
        pointsRequired: formData.pointsRewardThreshold, 
        name: formData.pointsRewardName || t('reward'), 
        isActive: true 
      }],
      pointsExpirationDays: formData.pointsExpirationDays ?? undefined,
    } : undefined,
  };

  return (
    <div className="program-summary-panel">
      <h4>{t('programmeDetails')}</h4>
      
      {/* Programme Metadata Section */}
      <div className="summary-section">
        <div className="summary-row">
          <span className="summary-label">{t('programmeName')}</span>
          <span className="summary-value">{formData.name || <em>{t('notSet')}</em>}</span>
        </div>
        
        <div className="summary-row">
          <span className="summary-label">{t('programmeType')}</span>
          <span className="summary-value">{programmeLabel}</span>
        </div>
        
        {formData.description && (
          <div className="summary-row">
            <span className="summary-label">{t('programmeDescription')}</span>
            <span className="summary-value">{formData.description}</span>
          </div>
        )}
      </div>

      {/* Stamp Configuration Section */}
      {hasStampConfig && (
        <div className="summary-section">
          <h5>{t('stamps')}</h5>
          <div className="summary-row">
            <span className="summary-label">{t('stampsPerPurchase')}</span>
            <span className="summary-value">
              {formData.stampPurchasesPerStamp} {t('purchase')}{formData.stampPurchasesPerStamp !== 1 ? 's' : ''} = 1 {t('stamp')}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">{t('reward')}</span>
            <span className="summary-value">
              {formData.stampRewardThreshold} {t('stamps')} = {formData.stampRewardName || <em>{t('reward')}</em>}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">{t('expiration')}</span>
            <span className="summary-value">
              {formData.stampExpirationDays ? `${formData.stampExpirationDays} ${t('days')}` : t('noExpiration')}
            </span>
          </div>
        </div>
      )}

      {/* Points Configuration Section */}
      {hasPointsConfig && (
        <div className="summary-section">
          <h5>{t('points')}</h5>
          <div className="summary-row">
            <span className="summary-label">{t('pointsPerTND')}</span>
            <span className="summary-value">
              1 TND = {formData.pointsPerCurrency} {t('point')}{formData.pointsPerCurrency !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">{t('reward')}</span>
            <span className="summary-value">
              {formData.pointsRewardThreshold} {t('points')} = {formData.pointsRewardName || <em>{t('reward')}</em>}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">{t('expiration')}</span>
            <span className="summary-value">
              {formData.pointsExpirationDays ? `${formData.pointsExpirationDays} ${t('days')}` : t('noExpiration')}
            </span>
          </div>
        </div>
      )}

      {/* Customer Loyalty Card Preview */}
      {formData.name && (
        <div className="summary-section">
          <h5>{t('customerView')}</h5>
          <LoyaltyCardPreview programme={previewProgramme} t={t} />
        </div>
      )}
    </div>
  );
}

export default ProgrammeSummaryPanel;
