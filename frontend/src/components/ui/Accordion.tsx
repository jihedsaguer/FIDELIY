import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccordionProps {
  children: ReactNode;
  className?: string;
}

/** Visual group for AccordionItem; each item opens and closes independently. */
export function Accordion({ children, className }: AccordionProps) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}

interface AccordionItemProps {
  title: ReactNode;
  children: ReactNode;
  /** Initial state; the item manages its own open state afterwards. */
  defaultOpen?: boolean;
  /** Heading level wrapping the trigger button. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/**
 * Disclosure item: a native button (Enter/Space) controls a labelled region
 * through aria-expanded / aria-controls.
 */
export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  headingLevel = 3,
  className,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const regionId = `${baseId}-region`;
  const Heading = `h${headingLevel}` as const;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]',
        className,
      )}
    >
      <Heading className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={regionId}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] px-4 py-3 text-start font-semibold text-[var(--text)] hover:bg-[var(--subtle)]"
        >
          <span className="min-w-0 flex-1">{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </button>
      </Heading>
      <div
        id={regionId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
        className="border-t border-[var(--border)] px-4 py-3"
      >
        {isOpen ? children : null}
      </div>
    </div>
  );
}

export default Accordion;
