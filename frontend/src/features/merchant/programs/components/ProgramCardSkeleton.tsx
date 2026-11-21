/**
 * ProgramCardSkeleton - Loading skeleton for programme cards
 * Used while programme data is being fetched
 */
export function ProgramCardSkeleton() {
  return (
    <div className="program-card skeleton-card">
      <div className="program-card-header">
        <div className="program-card-info">
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-text short" />
        </div>
        <div className="skeleton skeleton-text short" />
      </div>
      <div className="program-card-details">
        <div className="skeleton skeleton-text short" />
      </div>
    </div>
  );
}
