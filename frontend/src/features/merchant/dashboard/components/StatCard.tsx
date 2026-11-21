import { Card, Badge, type BadgeVariant } from '@/components/ui';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number | React.ReactNode;
  badge?: {
    variant: BadgeVariant;
    text: string;
  };
}

export function StatCard({ icon: Icon, label, value, badge }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
          <Icon className="h-5 w-5 text-[var(--text)]" />
        </div>
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
      </div>
      <p className="text-[var(--text-muted)] text-sm">{label}</p>
      <p className="text-[var(--text)] text-3xl font-bold mt-1">{value}</p>
    </Card>
  );
}
