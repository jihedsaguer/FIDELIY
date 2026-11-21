/**
 * ProgramTypeIcon - Displays an icon representing the programme type
 * Used in programme cards and listings
 */
export function ProgramTypeIcon({ type }: { type: string }) {
  const IconStamp = () => (
    <svg className="program-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
  const IconPoints = () => (
    <svg className="program-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="12" cy="19" r="2" fill="currentColor" />
      <path d="M12 8v8" />
    </svg>
  );
  const IconCombined = () => (
    <svg className="program-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
  
  switch (type) {
    case 'stamps': return <IconStamp />;
    case 'points': return <IconPoints />;
    case 'both': return <IconCombined />;
    default: return null;
  }
}
