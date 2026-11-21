import { Card, Badge } from '@/components/ui';
import { Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import type { BranchDto } from '@/features/merchant/api/branchApi';
import { useI18n } from '@/shared/i18n/i18n';

interface BranchOverviewProps {
  branches: BranchDto[];
}

/**
 * BranchOverview - Modernized branch listing component
 * Uses shadcn/ui Card and Badge components with design tokens
 */
export function BranchOverview({ branches }: BranchOverviewProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  if (branches.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Store className="h-5 w-5 text-[var(--text)]" />
        <h3 className="text-[var(--text)] text-lg font-semibold">{t('branches')}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.slice(0, 3).map((branch, index) => (
          <Card key={branch.id} className="p-4 cursor-pointer hover:bg-[var(--subtle)] transition-colors" onClick={() => navigate(paths.merchantBranches)}>
            <div className="flex items-center gap-2">
              <p className="text-[var(--text)] font-medium">{branch.name}</p>
              {index === 0 && (
                <Badge variant="brand" size="sm">
                  {t('activeBranch')}
                </Badge>
              )}
            </div>
            <p className="text-[var(--text-muted)] text-sm mt-1">{branch.address ?? t('notSpecified')}</p>
          </Card>
        ))}
        {branches.length > 3 && (
          <Card className="p-4 cursor-pointer hover:bg-[var(--subtle)] transition-colors flex items-center justify-center" onClick={() => navigate(paths.merchantBranches)}>
            <p className="text-[var(--brand)] font-medium">+{branches.length - 3} {t('branches')}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
