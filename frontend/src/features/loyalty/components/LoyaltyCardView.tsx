import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gift, RotateCw } from 'lucide-react';
import { BusinessLogo } from '../../../components/ui/BusinessLogo';
import { cn } from '../../../lib/utils';
import { useI18n } from '../../../shared/i18n/i18n';
import type { LoyaltyProgramType, MembershipReward } from '../api/customerApi';
import { MAX_STAMP_SLOTS, StampSlots } from './StampSlots';
import { RewardProgressBar } from './RewardProgressBar';
import { getProgramTypeLabel } from './ProgramTypeLabel';
import { getRewardProgress } from './rewardProgress';

type Currency = 'stamps' | 'points';

export interface LoyaltyCardViewProps {
  businessName: string;
  logoUrl: string | null;
  /** `null` when the business has no active programme: only non-zero balances are shown. */
  programType: LoyaltyProgramType | null;
  balance: { stamps: number; points: number };
  rewards: MembershipReward[];
  joinedAt: string;
  /** When set, the card header is a link to this route. */
  detailsHref?: string;
  /** Accessible name of the header link (used with `detailsHref`). */
  detailsLabel?: string;
  isFeatured?: boolean;
}

const HEADER_CLASS =
  'flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/**
 * LoyaltyCardView - presentational credit-card style loyalty card.
 *
 * Front: logo (preset icon, image or initial; `BusinessLogo`), business name (a link only when `detailsHref` is set),
 * programme type, the current balance and progress toward the cheapest reward not
 * yet affordable (stamp slots up to 12, else a text count; a progress bar for
 * points), and a "Reward available" state. Back (tap the flip button): the
 * rewards list. The hidden face is `inert` so it is not focusable. Motion is
 * CSS only and honours prefers-reduced-motion (globals.css + motion-safe:).
 * Shared by the customer dashboard and the merchant scan result.
 */
export function LoyaltyCardView({
  businessName,
  logoUrl,
  programType,
  balance,
  rewards,
  joinedAt,
  detailsHref,
  detailsLabel,
  isFeatured = false,
}: LoyaltyCardViewProps) {
  const { t, formatDate } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const backId = useId();

  const programmeLabel = programType ? getProgramTypeLabel(programType, t) : '';
  const currencies: Currency[] = programType
    ? programType === 'both'
      ? ['stamps', 'points']
      : [programType]
    : (['stamps', 'points'] as const).filter((type) => balance[type] > 0);
  const unitLabel = (type: Currency) => (type === 'stamps' ? t('stamps') : t('points'));
  const progress = currencies.map((type) => ({
    type,
    balance: balance[type],
    ...getRewardProgress(rewards, type, balance[type]),
  }));
  const rewardAvailable = progress.some((entry) => entry.available);
  const sortedRewards: MembershipReward[] = [...rewards].sort((a, b) => a.cost - b.cost);

  const headerContent: ReactNode = (
    <>
      <BusinessLogo logoUrl={logoUrl} name={businessName} size="sm" variant="translucent" />
      <span className="min-w-0">
        <span className="block truncate font-bold">{businessName}</span>
        {programmeLabel && (
          <span className="block truncate text-sm text-white/80">{programmeLabel}</span>
        )}
      </span>
    </>
  );

  return (
    <div className="[perspective:1200px]">
      <div
        className={cn(
          'relative aspect-[1.586] w-full text-start',
          isFeatured ? 'drop-shadow-lg' : 'drop-shadow-md',
        )}
      >
        <div
          className={cn(
            'grid h-full min-h-full w-full transform-3d motion-safe:transition-transform motion-safe:duration-500',
            flipped && 'rotate-y-180',
          )}
        >
          {/* Front */}
          <div
            inert={flipped}
            aria-hidden={flipped}
            className="col-start-1 row-start-1 flex min-h-0 flex-col justify-between gap-3 rounded-[var(--radius-2xl)] bg-[linear-gradient(135deg,var(--brand-900),var(--brand-700))] p-4 text-white backface-hidden"
          >
            <div className="flex items-start gap-3">
              {detailsHref ? (
                <Link to={detailsHref} aria-label={detailsLabel} className={HEADER_CLASS}>
                  {headerContent}
                </Link>
              ) : (
                <div className={HEADER_CLASS}>{headerContent}</div>
              )}
              {rewardAvailable && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--brand-800)]">
                  <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('cardRewardAvailable')}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {progress.map(({ type, balance: value, next }) => {
                const unit = unitLabel(type);
                return (
                  <div key={type} className="space-y-1.5">
                    <p className="text-lg font-bold leading-tight">{`${value} ${unit}`}</p>
                    {type === 'stamps' && next && next.cost <= MAX_STAMP_SLOTS && (
                      <StampSlots
                        earned={value}
                        target={next.cost}
                        label={`${value} / ${next.cost} ${unit}`}
                      />
                    )}
                    {type === 'stamps' && next && next.cost > MAX_STAMP_SLOTS && (
                      <p className="text-sm text-white/80">{`${value} / ${next.cost} ${unit}`}</p>
                    )}
                    {type === 'points' && next && (
                      <>
                        <RewardProgressBar
                          value={value}
                          max={next.cost}
                          label={`${t('cardNextReward')} ${next.name}`.trim()}
                        />
                        <p className="text-sm text-white/80">{`${value} / ${next.cost} ${unit}`}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="pe-12 text-xs text-white/80">
              {t('memberSince')} {formatDate(joinedAt)}
            </p>
          </div>

          {/* Back: rewards list */}
          <div
            id={backId}
            inert={!flipped}
            aria-hidden={!flipped}
            className="col-start-1 row-start-1 flex min-h-0 flex-col gap-2 overflow-y-auto rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] backface-hidden rotate-y-180"
          >
            <h3 className="pe-12 font-bold">{`${businessName} - ${t('rewards')}`}</h3>
            {sortedRewards.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">{t('cardNoRewards')}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {sortedRewards.map((reward, index) => {
                  const affordable = balance[reward.activityType] >= reward.cost;
                  return (
                    <li
                      key={`${reward.activityType}-${reward.cost}-${index}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 truncate">{reward.name}</span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1',
                          affordable
                            ? 'font-semibold text-[var(--success)]'
                            : 'text-[var(--text-muted)]',
                        )}
                      >
                        {affordable && <Check className="h-4 w-4" aria-hidden="true" />}
                        {`${reward.cost} ${unitLabel(reward.activityType)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Flip control: outside both faces so it stays operable on either side. */}
        <button
          type="button"
          aria-expanded={flipped}
          aria-controls={backId}
          aria-label={t('cardRewardsToggle')}
          onClick={() => setFlipped((value) => !value)}
          className={cn(
            'absolute bottom-2 end-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2',
            flipped
              ? 'bg-[var(--brand)] text-white focus-visible:outline-[var(--brand)]'
              : 'bg-white/20 text-white focus-visible:outline-white',
          )}
        >
          <RotateCw className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default LoyaltyCardView;
