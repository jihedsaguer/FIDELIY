import { useState } from 'react';
import { useI18n } from '../../shared/i18n/i18n';
import { Button } from './Button';
import type { BranchDto } from '../../features/merchant/api/branchApi';
import { Building2, MapPin, Phone, Calendar, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';

interface BranchCardProps {
  branch: BranchDto;
  onEdit: (branch: BranchDto) => void;
  onDelete: (branchId: string) => void;
  isDeleting?: boolean;
  showDeleteConfirm: boolean;
  onConfirmDelete: (branchId: string) => void;
  onCancelDelete: () => void;
  canDelete: boolean;
  isActive?: boolean;
}

export function BranchCard({
  branch,
  onEdit,
  onDelete,
  isDeleting,
  showDeleteConfirm,
  onConfirmDelete,
  onCancelDelete,
  canDelete,
  isActive = false,
}: BranchCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--background)]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-[var(--text)] flex-shrink-0" />
              <strong className="text-[var(--text)] font-medium">{branch.name}</strong>
              {isActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--success-light)] border border-[var(--success)] rounded-full text-[var(--success)] text-xs font-medium">
                  {t('activeBranch')}
                </span>
              )}
            </div>
            {branch.address && (
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{branch.address}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium flex items-center gap-1"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={`${expanded ? t('hide') : t('show')} ${t('branchInfo')}`}
            >
              {expanded ? t('hide') : t('show')}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(branch)} disabled={isDeleting}>
            <Pencil className="h-4 w-4" />
          </Button>
          {canDelete && (
            showDeleteConfirm ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onConfirmDelete(branch.id)}
                  disabled={isDeleting}
                >
                  {t('confirm')}
                </Button>
                <Button variant="ghost" size="sm" onClick={onCancelDelete}>
                  {t('cancel')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(branch.id)}
                className="text-[var(--danger)] hover:text-[var(--danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--subtle)]">
          {branch.phone && (
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-1">
              <Phone className="h-4 w-4" />
              <span>{branch.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(branch.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-1">
            <span className="text-xs">{t('id')}: </span>
            <span className="font-mono">{branch.qrCodeId.slice(0, 8)}...</span>
          </div>
        </div>
      )}
    </div>
  );
}
