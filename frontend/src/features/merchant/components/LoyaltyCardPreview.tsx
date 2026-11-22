import type { ProgramDto, EnhancedProgramConfigurationRequest } from '../api/programApi';
import { StampProgress, PointsProgress, getProgramTypeLabel, type TranslateFunction } from '../../loyalty/components';

interface LoyaltyCardPreviewProps {
  programme: ProgramDto | EnhancedProgramConfigurationRequest;
  showCustomerView?: boolean;
  t?: TranslateFunction;
}

/**
 * Loyalty Card Preview - Shows how the customer will see this programme
 * Matches the design used in CustomerDashboardPage
 * Uses shared StampProgress and PointsProgress components for consistency.
 */
export function LoyaltyCardPreview({ programme, t }: LoyaltyCardPreviewProps) {
  const isStamps = programme.type === 'stamps';
  const isPoints = programme.type === 'points';
  const isBoth = programme.type === 'both';
  
  // Extract configuration from programme
  let stampThreshold = 10;
  let pointsThreshold = 100;
  let stampRewardName = t ? t('reward') : 'Reward';
  let pointsRewardName = t ? t('reward') : 'Reward';
  
  if ('config' in programme) {
    // EnhancedProgramConfigurationRequest structure
    const config = programme as unknown as EnhancedProgramConfigurationRequest;
    if (config.stamps?.rewardThresholds?.[0]) {
      stampThreshold = config.stamps.rewardThresholds[0].stampsRequired;
      stampRewardName = config.stamps.rewardThresholds[0].name;
    }
    if (config.points?.rewardThresholds?.[0]) {
      pointsThreshold = config.points.rewardThresholds[0].pointsRequired;
      pointsRewardName = config.points.rewardThresholds[0].name;
    }
  }
  
  // For preview, show sample progress
  const sampleStampsEarned = isStamps || isBoth ? Math.floor(stampThreshold / 2) : 0;
  const samplePointsEarned = isPoints || isBoth ? Math.floor(pointsThreshold / 2) : 0;

  const programmeLabel = getProgramTypeLabel(programme.type, t);
  
  // Get programme name and description safely
  const programmeName = 'name' in programme ? (programme as { name: string | null }).name || (t ? t('programme') : 'Programme') : (t ? t('programme') : 'Programme');
  const programmeDescription = 'description' in programme ? (programme as { description: string | null }).description || '' : '';
  const programmeVersion = 'version' in programme ? (programme as { version: number }).version : 1;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
      <div className="text-center mb-4">
        <p className="text-sm font-semibold text-[var(--text)]">
          {t ? t('customerViewPreview') : 'Customer View Preview'}
        </p>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-[var(--radius-md)] bg-[var(--glass-brand)] flex items-center justify-center flex-shrink-0">
          <span className="text-[var(--brand)] font-bold text-lg">
            {String(programmeName).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--text)] truncate">{programmeName}</h3>
          <p className="text-sm text-[var(--text-muted)]">{programmeLabel}</p>
          {programmeVersion > 0 && (
            <p className="text-xs text-[var(--text-muted)]">v{programmeVersion}</p>
          )}
        </div>
      </div>
      
      <div className="pt-4 border-t border-[var(--border)]">
        {isStamps && !isPoints && (
          <StampProgress
            earned={sampleStampsEarned}
            threshold={stampThreshold}
            rewardName={stampRewardName}
            showRewardName={true}
          />
        )}
        
        {isPoints && !isStamps && (
          <PointsProgress
            points={samplePointsEarned}
            threshold={pointsThreshold}
            rewardName={pointsRewardName}
            showRewardName={true}
          />
        )}
        
        {/* Mixed programme - show both */}
        {isBoth && (
          <div className="space-y-4">
            <StampProgress
              earned={sampleStampsEarned}
              threshold={stampThreshold}
              rewardName={stampRewardName}
              showRewardName={true}
            />
            <PointsProgress
              points={samplePointsEarned}
              threshold={pointsThreshold}
              rewardName={pointsRewardName}
              showRewardName={true}
            />
          </div>
        )}
      </div>
      
      {programmeDescription && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)]">{programmeDescription}</p>
        </div>
      )}
    </div>
  );
}

export default LoyaltyCardPreview;
