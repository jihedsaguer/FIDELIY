/**
 * ProgramEmptyState - Empty state for programmes
 * Used when no programmes exist
 */

export function ProgramEmptyState() {
  return (
    <div className="empty-state">
      <p className="empty-state-message">
        You don't have an active loyalty programme yet. Create one to start rewarding your customers.
      </p>
    </div>
  );
}

export function ProgramHistoryEmptyState() {
  return (
    <div className="empty-state">
      <p className="empty-state-message">No previous programme versions yet.</p>
    </div>
  );
}
