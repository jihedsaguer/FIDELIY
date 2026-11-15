import type { ReactNode } from 'react';

export function LoadingPanel({ children }: { children: ReactNode }) {
  return <section className="panel"><p role="status">{children}</p></section>;
}
