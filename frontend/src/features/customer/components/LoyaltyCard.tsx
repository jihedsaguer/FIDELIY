import { paths } from '../../../app/routes/paths';
import { useI18n } from '../../../shared/i18n/i18n';
import { LoyaltyCardView } from '../../loyalty/components';
import type { LoyaltyCardProps } from '../types';

/**
 * LoyaltyCard - the customer's card for one joined business. Maps the membership
 * API shape to the shared `LoyaltyCardView` and links the header to the detail page.
 */
export function LoyaltyCard({ membership, isFeatured = false }: LoyaltyCardProps) {
  const { t } = useI18n();
  const businessName = membership.business.name || t('business');

  return (
    <LoyaltyCardView
      businessName={businessName}
      logoUrl={membership.business.logoUrl}
      programType={membership.program?.type ?? null}
      balance={membership.balance}
      rewards={membership.rewards}
      joinedAt={membership.joinedAt}
      detailsHref={paths.customerMembership.replace(':membershipId', membership.id)}
      detailsLabel={`${t('viewDetailsFor')} ${businessName}`}
      isFeatured={isFeatured}
    />
  );
}

export default LoyaltyCard;
