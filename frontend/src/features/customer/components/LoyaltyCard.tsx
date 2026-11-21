import type { CustomerMembership } from '../../loyalty/api/customerApi';
import { StampProgress, PointsProgress, getProgramTypeLabel } from '../../../features/loyalty/components';

/**
 * LoyaltyCard - Visual representation of a customer's loyalty programme membership
 * 
 * Displays business information, programme type, and progress towards rewards.
 * Supports both stamp-based and points-based programmes.
 * Uses shared StampProgress and PointsProgress components for consistent visualization.
 */
interface LoyaltyCardProps {
  membership: CustomerMembership & {
    nextRewardThreshold?: number;
    stampThreshold?: number;
  };
  isFeatured?: boolean;
  onClick?: () => void;
}

/**
 * LoyaltyCard component
 * 
 * Renders a card showing:
 * - Business logo or initial
 * - Business name
 * - Programme type (stamp/points/both)
 * - Stamp progress (for stamp programmes)
 * - Points progress (for points programmes)
 * - Join date
 */
export function LoyaltyCard({ membership, isFeatured = false, onClick }: LoyaltyCardProps) {
  const programmeLabel = getProgramTypeLabel(membership.programType || 'unknown');
  const businessName = membership.businessName || 'Business';

  // Join date formatting
  const joinDate = new Date(membership.joinedAt).toLocaleDateString();

  return (
    <div 
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-4 hover:shadow-md transition-shadow ${
        isFeatured ? 'border-2 border-[var(--brand)] shadow-md' : ''
      } ${onClick ? 'cursor-pointer hover:bg-[var(--subtle)]' : ''}`}
      onClick={onClick}
      aria-label={`View details for ${businessName}`}
    >
      <div className="flex items-center gap-4">
        {/* Business logo or initial */}
        {membership.logoUrl && (
          <img 
            src={membership.logoUrl} 
            alt="Business logo"
            className="w-14 h-14 object-cover rounded-[var(--radius-lg)] bg-[var(--subtle)]"
          />
        )}
        {!membership.logoUrl && (
          <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] flex items-center justify-center">
            <span className="text-[var(--brand)] font-bold text-lg">
              {businessName.charAt(0)}
            </span>
          </div>
        )}
        
        {/* Business info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--text)] truncate">
            {businessName}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">{programmeLabel}</p>
        </div>
      </div>

      {/* Progress visualization */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        {membership.programType === 'stamps' && (
          <StampProgress
            earned={membership.balance.stamps || 0}
            threshold={membership.stampThreshold || 10}
            label={`${membership.balance.stamps || 0} of ${membership.stampThreshold || 10} stamps`}
          />
        )}
        
        {membership.programType === 'points' && (
          <PointsProgress
            points={membership.balance.points || 0}
            threshold={membership.nextRewardThreshold || 100}
            label={`${membership.balance.points || 0} points earned`}
          />
        )}
        
        {/* Show secondary balance if programme is mixed type */}
        {(membership.programType === 'stamps' && membership.balance.points > 0) && (
          <div className="mt-3">
            <p className="text-sm text-[var(--text-muted)]">+{membership.balance.points} points</p>
          </div>
        )}
        {(membership.programType === 'points' && membership.balance.stamps > 0) && (
          <div className="mt-3">
            <p className="text-sm text-[var(--text-muted)]">+{membership.balance.stamps} stamps</p>
          </div>
        )}
        
        {/* Both stamps and points for 'both' programme type */}
        {membership.programType === 'both' && (
          <div className="space-y-4">
            <StampProgress
              earned={membership.balance.stamps || 0}
              threshold={membership.stampThreshold || 10}
              label={`${membership.balance.stamps || 0} of ${membership.stampThreshold || 10} stamps`}
            />
            <PointsProgress
              points={membership.balance.points || 0}
              threshold={membership.nextRewardThreshold || 100}
              label={`${membership.balance.points || 0} points earned`}
            />
          </div>
        )}
      </div>

      {/* Join date */}
      <div className="mt-3 text-right">
        <p className="text-xs text-[var(--text-muted)]">
          Joined {joinDate}
        </p>
      </div>
    </div>
  );
}

export default LoyaltyCard;
