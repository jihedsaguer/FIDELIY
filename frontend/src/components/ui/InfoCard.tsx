import type { ReactNode } from 'react';

interface InfoCardProps {
  label: string;
  value?: ReactNode;
  variant?: 'default' | 'muted';
}

export function InfoCard({ label, value, variant = 'default' }: InfoCardProps) {
  return (
    <dl className={`info-card info-card--${variant}`}>
      <dt className="info-card-label">{label}</dt>
      {value !== undefined && <dd className="info-card-value">{value}</dd>}
    </dl>
  );
}

// Dashboard summary card component
interface SummaryCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
}

export function SummaryCard({ title, value, icon }: SummaryCardProps) {
  return (
    <div className="summary-card">
      {icon && <div className="summary-card-icon">{icon}</div>}
      <div className="summary-card-content">
        <span className="summary-card-title">{title}</span>
        <strong className="summary-card-value">{value}</strong>
      </div>
    </div>
  );
}
