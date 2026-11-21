/**
 * ProgramStatusBadge - Displays the status of a programme
 * Used in programme cards and listings
 * Improved for better scanning:
 * - Uses design tokens for consistent styling
 * - Clear visual distinction between active and inactive states
 * - Supports FR/EN/AR via i18n (future enhancement)
 */
export function ProgramStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'status-badge status-badge--active' },
    inactive: { label: 'Inactive', className: 'status-badge status-badge--inactive' },
  };
  const variant = variants[status] || { label: status, className: 'status-badge' };
  return <span className={variant.className} aria-label={`Programme status: ${variant.label}`}>{variant.label}</span>;
}
