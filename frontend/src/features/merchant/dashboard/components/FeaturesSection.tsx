import { Card } from '@/components/ui';
import type { LucideIcon } from 'lucide-react';

export interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface FeaturesSectionProps {
  features: FeatureItem[];
}

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {features.map((feature, index) => (
        <Card key={index} className="p-6 text-center">
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center mx-auto mb-4">
            <feature.icon className="h-6 w-6 text-[var(--text)]" />
          </div>
          <h3 className="text-[var(--text)] font-semibold text-lg mb-2">{feature.title}</h3>
          <p className="text-[var(--text-muted)] text-sm">{feature.description}</p>
        </Card>
      ))}
    </div>
  );
}
