import { Calendar, AlertCircle, Award } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { TransactionHistoryItem } from '../../loyalty/api/customerApi';

/**
 * ActivityItem - Individual transaction/activity item
 * 
 * Displays a single activity with business, action type, value, and date.
 */
interface ActivityItemProps {
  activity: TransactionHistoryItem;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const isEarned = activity.stampsDelta > 0 || activity.pointsDelta > 0;
  const isRedeemed = activity.stampsDelta < 0 || activity.pointsDelta < 0;

  // Format the date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-TN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Format the value display
  const formatValue = (): string => {
    if (isEarned) {
      const stamps = activity.stampsDelta > 0 ? `+${activity.stampsDelta} stamps` : '';
      const points = activity.pointsDelta > 0 ? `+${activity.pointsDelta} points` : '';
      return [stamps, points].filter(Boolean).join(' ');
    }
    if (isRedeemed) {
      const stamps = activity.stampsDelta < 0 ? `${Math.abs(activity.stampsDelta)} stamps` : '';
      const points = activity.pointsDelta < 0 ? `${Math.abs(activity.pointsDelta)} points` : '';
      return `Redeemed: ${[stamps, points].filter(Boolean).join(' + ')}`;
    }
    return 'Transaction';
  };

  return (
    <Card key={activity.id} className="p-4 flex items-center gap-4">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
          {isEarned ? (
            <span className="text-[var(--success)] text-lg font-bold">+</span>
          ) : isRedeemed ? (
            <span className="text-[var(--danger)] text-lg font-bold">-</span>
          ) : (
            <Award className="h-5 w-5 text-[var(--brand)]" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text)] font-medium truncate">
          {activity.branchName || 'Business'}
        </p>
        <p className="text-[var(--text-muted)] text-sm">
          {formatValue()}
        </p>
      </div>
      <div className="text-[var(--text-muted)] text-sm flex items-center gap-1">
        <Calendar className="h-4 w-4" />
        <span>{formatDate(activity.occurredAt)}</span>
      </div>
    </Card>
  );
}

/**
 * ActivityListProps
 * 
 * Props for the ActivityList component.
 */
export interface ActivityListProps {
  activities: TransactionHistoryItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  showEmptyState?: boolean;
}

/**
 * ActivityList - Displays a list of customer activities/transactions
 * 
 * Shows loading, empty, error, and populated states.
 * Renders activity items with appropriate styling based on type (earned/redeemed).
 */
export function ActivityList({
  activities,
  isLoading = false,
  error = null,
  onRetry,
  showEmptyState = true,
}: ActivityListProps) {
  if (isLoading) {
    return (
      <Card className="text-center py-12 px-4 bg-[var(--subtle)] border border-[var(--border)]">
        <Award className="mx-auto h-12 w-12 text-[var(--brand)] mb-4" />
        <h3 className="text-[var(--text)] text-lg font-semibold mb-2">
          Loading activity
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          Please wait...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12 px-4 bg-[var(--danger-light)] border border-[var(--danger)]">
        <AlertCircle className="mx-auto h-12 w-12 text-[var(--danger)] mb-4" />
        <h3 className="text-[var(--danger)] text-lg font-semibold mb-2">
          Failed to load activity
        </h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          {error}
        </p>
        {onRetry && (
          <Button onClick={onRetry}>
            Retry
          </Button>
        )}
      </Card>
    );
  }

  if (activities.length === 0 && showEmptyState) {
    return (
      <Card className="text-center py-12 px-4 bg-[var(--subtle)] border border-[var(--border)]">
        <AlertCircle className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
        <h3 className="text-[var(--text)] text-lg font-semibold mb-2">
          No activity yet
        </h3>
        <p className="text-[var(--text-muted)] text-sm">
          Your transactions will appear here
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export { ActivityItem };
export type { ActivityItemProps };
