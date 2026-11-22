import { Card } from '@/components/ui';
import { Building2 } from 'lucide-react';
import type { BusinessSetup } from '@/features/business-onboarding/types/businessOnboarding.types';
import { useI18n } from '@/shared/i18n/i18n';

interface BusinessOverviewProps {
  business?: BusinessSetup['business'];
  children?: React.ReactNode;
}

/**
 * BusinessOverview - Modernized business information card
 * Uses shadcn/ui Card component and design tokens
 */
export function BusinessOverview({ business, children }: BusinessOverviewProps) {
  const { t } = useI18n();

  if (!business) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center flex-shrink-0">
          <Building2 className="h-6 w-6 text-[var(--brand)]" />
        </div>
        <div>
          <h3 className="text-[var(--text)] font-semibold text-lg">{business.name}</h3>
          <p className="text-[var(--text-muted)] text-sm">{t('business')}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}
