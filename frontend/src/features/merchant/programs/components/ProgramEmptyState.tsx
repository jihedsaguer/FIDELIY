import { useI18n } from '@/shared/i18n/i18n';

/**
 * ProgramEmptyState - Modernized empty state for programmes
 * Uses FIDELIY design tokens and translation keys
 */
export function ProgramEmptyState() {
  const { t } = useI18n();

  return (
    <div className="empty-state">
      <p className="empty-state-message">
        {t('noActiveProgram')}
      </p>
    </div>
  );
}

/**
 * ProgramHistoryEmptyState - Modernized empty state for programme history
 * Uses FIDELIY design tokens and translation keys
 */
export function ProgramHistoryEmptyState() {
  const { t } = useI18n();

  return (
    <div className="empty-state">
      <p className="empty-state-message">{t('noPreviousVersions')}</p>
    </div>
  );
}
