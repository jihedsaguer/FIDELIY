// Customer feature types
// Shared types for customer components and pages

import type { CustomerMembership, TransactionHistoryItem } from '../../loyalty/api/customerApi';

/**
 * Profile data for customer profile
 */
export interface ProfileData {
  name: string;
  phone: string;
  email: string;
  birthdate?: string;
}

/**
 * Membership as returned by the API: balance and rewards come from the backend.
 */
export type DisplayMembership = CustomerMembership;

/**
 * Props for LoyaltyCard component
 */
export interface LoyaltyCardProps {
  membership: CustomerMembership;
  isFeatured?: boolean;
}

/**
 * Props for QRCodeDisplay component
 */
export interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  showPlaceholder?: boolean;
  label?: string;
  displaySize?: string | number;
}

/**
 * Props for ActivityList component
 */
export interface ActivityListProps {
  activities: TransactionHistoryItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  showEmptyState?: boolean;
}

/**
 * Props for ProfileActions component (kept for backwards compatibility)
 */
export interface ProfileActionsProps {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

// Re-export API types for convenience
export type { CustomerMembership, TransactionHistoryItem };
