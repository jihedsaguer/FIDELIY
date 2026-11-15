import type { ReactNode } from 'react';

export function FormFeedback({
  error,
  success,
  notice,
  children,
}: {
  error?: string;
  success?: string;
  notice?: string;
  children?: ReactNode;
}) {
  const message = error || success || notice;
  if (!message) return null;
  const className = error
    ? 'form-feedback error'
    : success
      ? 'form-feedback success'
      : 'form-feedback notice';
  const role = error ? 'alert' : 'status';
  return (
    <div className={className} role={role}>
      {message} {children}
    </div>
  );
}
