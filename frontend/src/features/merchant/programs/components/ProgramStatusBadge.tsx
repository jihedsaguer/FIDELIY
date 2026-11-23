import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/shared/i18n/i18n';

/**
 * ProgramStatusBadge - localized status of a programme (active / inactive).
 */
export function ProgramStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const isActive = status === 'active';
  const label = isActive ? t('active') : t('inactiveStatus');
  return (
    <Badge variant={isActive ? 'success' : 'default'} size="sm" dot>
      <span className="sr-only">{`${t('programmeStatus')} : `}</span>
      <span>{label}</span>
    </Badge>
  );
}
