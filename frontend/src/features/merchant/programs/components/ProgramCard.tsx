import { Gift, Power } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/shared/i18n/i18n';
import type { ProgramDto } from '../../api/programApi';
import { ProgramTypeIcon } from './ProgramTypeIcon';
import { ProgramStatusBadge } from './ProgramStatusBadge';
import { PROGRAM_TYPE_ACCENT, formatProgramType, getProgramDetails } from './programUtils';

interface ProgramCardProps {
  program: ProgramDto;
  /** Active programme: accent strip and larger heading. */
  isFeatured?: boolean;
  /** Heading level of the programme name. */
  headingLevel?: 2 | 3;
  /** When set, a "Deactivate" action is shown (the caller confirms it). */
  onDeactivate?: (program: ProgramDto) => void;
}

/**
 * ProgramCard - programme summary: type accent header (icon, name, status,
 * version, type), real rewards and points rate read from the stored
 * configuration, activation/deactivation dates and an optional Deactivate action.
 */
export function ProgramCard({
  program,
  isFeatured = false,
  headingLevel = 3,
  onDeactivate,
}: ProgramCardProps) {
  const { t, locale, formatDate } = useI18n();
  const accent = PROGRAM_TYPE_ACCENT[program.type] ?? PROGRAM_TYPE_ACCENT.stamps;
  const { rewards, pointsPerCurrencyUnit } = getProgramDetails(program);
  const name = program.name || t('unnamedProgramme');
  const Heading = `h${headingLevel}` as const;
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' : 'fr-TN', { maximumFractionDigits: 2 }).format(value);

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[var(--radius-xl)] border bg-[var(--surface)] shadow-sm motion-safe:animate-[program-card-in_300ms_ease-out] motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md',
        accent.border,
      )}
    >
      {isFeatured && <div aria-hidden="true" className={cn('h-1.5', accent.strip)} />}

      <div className={cn('flex items-start gap-3 p-4 sm:p-5', accent.soft)}>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface)]',
            accent.text,
          )}
        >
          <ProgramTypeIcon type={program.type} />
        </span>
        <div className="min-w-0 flex-1">
          <Heading
            className={cn(
              'break-words font-bold text-[var(--text)]',
              isFeatured ? 'text-lg sm:text-xl' : 'text-base',
            )}
          >
            {name}
          </Heading>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <ProgramStatusBadge status={program.status} />
            <span className="text-[var(--text-muted)]" dir="ltr">{`v${program.version}`}</span>
            <span className={cn('font-medium', accent.text)}>{formatProgramType(program.type, t)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {program.description && (
          <p className="break-words text-sm text-[var(--text-muted)]">{program.description}</p>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--text)]">{t('rewards')}</p>
          {rewards.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t('cardNoRewards')}</p>
          ) : (
            <ul className="space-y-2">
              {rewards.map((reward, index) => (
                <li
                  key={`${reward.activityType}-${reward.cost}-${index}`}
                  className="flex items-center gap-3 text-sm"
                >
                  <Gift aria-hidden="true" className={cn('h-4 w-4 shrink-0', accent.text)} />
                  <span className="min-w-0 flex-1 break-words text-[var(--text)]">{reward.name}</span>
                  <span className="shrink-0 font-medium text-[var(--text-muted)]">
                    {`${reward.cost} ${reward.activityType === 'stamps' ? t('stamps') : t('points')}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {pointsPerCurrencyUnit !== null && (
            <div>
              <dt className="text-[var(--text-muted)]">{t('pointsPerTND')}</dt>
              <dd className="font-medium text-[var(--text)]">{formatNumber(pointsPerCurrencyUnit)}</dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--text-muted)]">{t('activatedOn')}</dt>
            <dd className="font-medium text-[var(--text)]">{formatDate(program.activatedAt)}</dd>
          </div>
          {program.deactivatedAt && (
            <div>
              <dt className="text-[var(--text-muted)]">{t('deactivatedOn')}</dt>
              <dd className="font-medium text-[var(--text)]">{formatDate(program.deactivatedAt)}</dd>
            </div>
          )}
        </dl>
      </div>

      {onDeactivate && (
        <div className="flex justify-end border-t border-[var(--border)] p-4 sm:px-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onDeactivate(program)}
            className="w-full gap-2 border-[var(--danger)]! text-[var(--danger)]! hover:bg-[var(--danger-light)]! sm:w-auto"
          >
            <Power aria-hidden="true" className="h-4 w-4" />
            {t('deactivateProgramme')}
          </Button>
        </div>
      )}
    </article>
  );
}
