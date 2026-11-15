import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  level?: 1 | 2 | 3;
}

export function Section({ title, subtitle, children, level = 2 }: SectionProps) {
  const HeadingTag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
  return (
    <section className="workspace-section">
      <HeadingTag className="workspace-section-title">{title}</HeadingTag>
      {subtitle && <p className="workspace-section-subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}
