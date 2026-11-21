import { Card } from '@/components/ui';
import { useI18n } from '@/shared/i18n/i18n';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface QuickActionItem {
  label: string;
  icon: LucideIcon;
  action?: () => void;
  path?: string;
}

interface QuickActionsProps {
  actions: QuickActionItem[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  function handleAction(action: QuickActionItem) {
    if (action.action) {
      action.action();
    } else if (action.path) {
      navigate(action.path);
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-[var(--text)] font-semibold text-lg mb-4">{t('quickActions')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleAction(action)}
            className="flex flex-col items-center gap-2 p-4 hover:bg-[var(--subtle)] rounded-[var(--radius-lg)] transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
              <action.icon className="h-5 w-5 text-[var(--text)]" />
            </div>
            <span className="text-[var(--text)] text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
