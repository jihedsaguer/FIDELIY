import { LoyaltyCardPreview } from '../../components/LoyaltyCardPreview';
import { getProgramTypeLabel } from '../../../loyalty/components';
import type { EnhancedProgramConfigurationRequest } from '../../api/programApi';
import type { ProgramFormData } from '../types/programForm.types';

interface ProgrammeSummaryPanelProps {
  formData: ProgramFormData;
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
export function ProgrammeSummaryPanel({ formData }: ProgrammeSummaryPanelProps) {
  const programmeLabel = getProgramTypeLabel(formData.type);
  
  const hasStampConfig = formData.type === 'stamps' || formData.type === 'both';
  const hasPointsConfig = formData.type === 'points' || formData.type === 'both';

  // Create a preview programme object from form data
  const previewProgramme: EnhancedProgramConfigurationRequest = {
    name: formData.name || 'Preview Programme',
    description: formData.description || '',
    type: formData.type,
    stamps: hasStampConfig ? {
      earningRule: { purchasesPerStamp: formData.stampPurchasesPerStamp },
      rewardThresholds: [{ 
        stampsRequired: formData.stampRewardThreshold, 
        name: formData.stampRewardName || 'Reward', 
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
        name: formData.pointsRewardName || 'Reward', 
        isActive: true 
      }],
      pointsExpirationDays: formData.pointsExpirationDays ?? undefined,
    } : undefined,
  };

  return (
    <div className="program-summary-panel">
      <h4>Programme Summary</h4>
      
      {/* Programme Metadata Section */}
      <div className="summary-section">
        <div className="summary-row">
          <span className="summary-label">Name</span>
          <span className="summary-value">{formData.name || <em>Not set</em>}</span>
        </div>
        
        <div className="summary-row">
          <span className="summary-label">Type</span>
          <span className="summary-value">{programmeLabel}</span>
        </div>
        
        {formData.description && (
          <div className="summary-row">
            <span className="summary-label">Description</span>
            <span className="summary-value">{formData.description}</span>
          </div>
        )}
      </div>

      {/* Stamp Configuration Section */}
      {hasStampConfig && (
        <div className="summary-section">
          <h5>Stamps</h5>
          <div className="summary-row">
            <span className="summary-label">Earning Rule</span>
            <span className="summary-value">
              {formData.stampPurchasesPerStamp} purchase{formData.stampPurchasesPerStamp !== 1 ? 's' : ''} = 1 stamp
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Reward</span>
            <span className="summary-value">
              {formData.stampRewardThreshold} stamps = {formData.stampRewardName || <em>Reward</em>}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Expiration</span>
            <span className="summary-value">
              {formData.stampExpirationDays ? `${formData.stampExpirationDays} days` : 'No expiration'}
            </span>
          </div>
        </div>
      )}

      {/* Points Configuration Section */}
      {hasPointsConfig && (
        <div className="summary-section">
          <h5>Points</h5>
          <div className="summary-row">
            <span className="summary-label">Earning Rule</span>
            <span className="summary-value">
              1 TND = {formData.pointsPerCurrency} point{formData.pointsPerCurrency !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Reward</span>
            <span className="summary-value">
              {formData.pointsRewardThreshold} points = {formData.pointsRewardName || <em>Reward</em>}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Expiration</span>
            <span className="summary-value">
              {formData.pointsExpirationDays ? `${formData.pointsExpirationDays} days` : 'No expiration'}
            </span>
          </div>
        </div>
      )}

      {/* Customer Loyalty Card Preview */}
      {formData.name && (
        <div className="summary-section">
          <h5>Customer View Preview</h5>
          <LoyaltyCardPreview programme={previewProgramme} />
        </div>
      )}
    </div>
  );
}

export default ProgrammeSummaryPanel;
