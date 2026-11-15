import { useState } from 'react';
import type { BranchDto } from '../../features/merchant/api/branchApi';

interface BranchCardProps {
  branch: BranchDto;
  onEdit: (branch: BranchDto) => void;
  onDelete: (branchId: string) => void;
  isDeleting?: boolean;
  showDeleteConfirm: boolean;
  onConfirmDelete: (branchId: string) => void;
  onCancelDelete: () => void;
  deletingId?: string | null;
  canDelete: boolean;
}

export function BranchCard({
  branch,
  onEdit,
  onDelete,
  isDeleting,
  showDeleteConfirm,
  onConfirmDelete,
  onCancelDelete,
  deletingId,
  canDelete,
}: BranchCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="branch-card">
      <div className="branch-card-header">
        <div className="branch-card-main">
          <strong className="branch-card-name">{branch.name}</strong>
          {branch.address && (
            <span className="branch-card-address">{branch.address}</span>
          )}
        </div>
        <div className="branch-card-actions">
          <button
            className="quiet-button branch-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} branch details`}
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          <button className="quiet-button" onClick={() => onEdit(branch)}>
            Edit
          </button>
          {canDelete && (
            showDeleteConfirm ? (
              <>
                <button
                  className="quiet-button danger"
                  onClick={() => onConfirmDelete(branch.id)}
                  disabled={isDeleting}
                >
                  {isDeleting && deletingId === branch.id ? 'Deleting...' : 'Confirm'}
                </button>
                <button className="quiet-button" onClick={onCancelDelete}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="quiet-button danger"
                onClick={() => onDelete(branch.id)}
              >
                Delete
              </button>
            )
          )}
        </div>
      </div>

      {expanded && (
        <div className="branch-card-details">
          {branch.phone && (
            <div className="branch-detail-row">
              <span className="branch-detail-label">Phone</span>
              <span className="branch-detail-value">{branch.phone}</span>
            </div>
          )}
          <div className="branch-detail-row">
            <span className="branch-detail-label">Branch ID</span>
            <span className="branch-detail-value">{branch.qrCodeId}</span>
          </div>
          <div className="branch-detail-row">
            <span className="branch-detail-label">Created</span>
            <span className="branch-detail-value">{branch.createdAt}</span>
          </div>
        </div>
      )}
    </div>
  );
}
