import { Card } from '@/components/ui';

/**
 * ProgramCardSkeleton - Modernized loading skeleton for programme cards
 * Uses shadcn/ui Card component and design tokens
 */
export function ProgramCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--subtle)] animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-6 w-3/4 bg-[var(--subtle)] rounded-[var(--radius-sm)] animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-[var(--subtle)] rounded-[var(--radius-sm)] animate-pulse" />
            <div className="h-5 w-12 bg-[var(--subtle)] rounded-[var(--radius-sm)] animate-pulse" />
            <div className="h-5 w-10 bg-[var(--subtle)] rounded-[var(--radius-sm)] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="mt-4 h-4 w-full bg-[var(--subtle)] rounded-[var(--radius-sm)] animate-pulse" />
    </Card>
  );
}
