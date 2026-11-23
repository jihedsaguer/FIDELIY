import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ListboxOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface ListboxProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: ListboxOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

/**
 * Select-only combobox (WAI-ARIA APG pattern): focus stays on the trigger button,
 * the active option is exposed through aria-activedescendant.
 * Keys: Enter/Space/ArrowDown/ArrowUp open; arrows, Home, End move; Enter/Space
 * select; Escape closes the list only (it does not reach an enclosing Modal);
 * Tab and outside clicks close without selecting.
 * Below `sm` the list expands inline (no clipping in bottom sheets); from `sm` it
 * is a popover on `--z-dropdown`.
 */
export function Listbox<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  error,
  required = false,
  className,
}: ListboxProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const labelId = `${id}-label`;
  const listId = `${id}-listbox`;
  const errorId = `${id}-error`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const active = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  const open = (index = selectedIndex) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  const select = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        open();
      } else if (event.key === 'Home') {
        event.preventDefault();
        open(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        open(last);
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => Math.min(last, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        select(activeIndex);
        break;
      case 'Escape':
        // Keep the Escape inside the list: an enclosing dialog must stay open.
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative space-y-1', className)}>
      <span id={labelId} className="block text-sm font-medium text-[var(--text)]">
        {label}
        {required && (
          <span aria-hidden="true" className="ms-1 text-[var(--danger)]">
            *
          </span>
        )}
      </span>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={isOpen ? optionId(activeIndex) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-required={required || undefined}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex min-h-[44px] w-full items-center gap-3 rounded-[var(--radius-lg)] border bg-[var(--surface)] py-2 ps-3 pe-3 text-start text-sm text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
          error ? 'border-[var(--danger)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]',
        )}
      >
        {selected?.icon && (
          <span aria-hidden="true" className="flex shrink-0 items-center">
            {selected.icon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--text-muted)] motion-safe:transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          // Keep focus on the trigger while clicking options.
          onMouseDown={(event) => event.preventDefault()}
          className="max-h-72 w-full overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg motion-safe:animate-[listbox-in_150ms_ease-out] sm:absolute sm:start-0 sm:top-full sm:z-[var(--z-dropdown)] sm:mt-1"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onClick={() => select(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[var(--radius-md)] px-3 py-2 text-start text-sm',
                  index === activeIndex ? 'bg-[var(--subtle)]' : '',
                )}
              >
                {option.icon && (
                  <span aria-hidden="true" className="mt-0.5 flex shrink-0 items-center">
                    {option.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[var(--text)]">{option.label}</span>
                  {option.description && (
                    <span className="block text-xs text-[var(--text-muted)]">{option.description}</span>
                  )}
                </span>
                {isSelected && (
                  <Check aria-hidden="true" className="ms-2 mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-dark)]" />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p id={errorId} className="text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export default Listbox;
