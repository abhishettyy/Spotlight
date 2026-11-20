import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * A dropdown styled like the rest of the student app (the browser's own <select> list can't be
 * themed). Click or Enter/Space opens it; arrow keys move, Enter picks, Escape closes.
 * variant "field" looks like a text box; "bare" sits inside a box that draws its own frame.
 */
export default function SelectMenu({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select',
  invalid = false,
  variant = 'field',
  onFocusChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  invalid?: boolean;
  variant?: 'field' | 'bare';
  onFocusChange?: (focused: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // On open, highlight the chosen option and scroll it into view
  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, options.indexOf(value));
    setActive(i);
    requestAnimationFrame(() => {
      listRef.current?.children[i]?.scrollIntoView({ block: 'nearest' });
    });
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault(); setOpen(true); return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active >= 0) pick(options[active]); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className="stu-select" data-variant={variant}>
      <button
        id={id}
        type="button"
        className="stu-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        data-open={open || undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
      >
        <span className={value ? 'stu-select-value' : 'stu-select-placeholder'}>{value || placeholder}</span>
        <ChevronDown size={16} className="stu-select-chevron" />
      </button>
      {open && (
        <ul ref={listRef} role="listbox" className="stu-select-list">
          {options.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              data-active={i === active || undefined}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              className="stu-select-option"
            >
              <span>{o}</span>
              {o === value && <Check size={15} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
