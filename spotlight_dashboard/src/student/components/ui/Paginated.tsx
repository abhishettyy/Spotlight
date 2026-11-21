import { ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Paginated<T>({
  items,
  children,
  pageSize = 12,
  resetKey,
}: {
  items: T[];
  children: (pageItems: T[]) => ReactNode;
  pageSize?: number;
  resetKey?: unknown;
}) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPage(1); }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);
  const from = items.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, items.length);

  const goTo = (n: number) => {
    setPage(n);
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pageNumbers: (number | '…')[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - current) <= 1) pageNumbers.push(n);
    else if (pageNumbers[pageNumbers.length - 1] !== '…') pageNumbers.push('…');
  }

  return (
    <div ref={topRef} className="stu-paginated">
      {children(pageItems)}
      {totalPages > 1 && (
        <nav className="stu-pager" aria-label="Pagination">
          <span className="stu-pager-count">{from}–{to} of {items.length}</span>
          <div className="stu-pager-pages">
            <button className="stu-pager-btn" disabled={current <= 1} onClick={() => goTo(current - 1)} aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((n, i) =>
              n === '…' ? (
                <span key={`gap${i}`} className="stu-pager-gap">…</span>
              ) : (
                <button
                  key={n}
                  className="stu-pager-btn"
                  aria-current={n === current ? 'page' : undefined}
                  onClick={() => goTo(n)}
                >
                  {n}
                </button>
              )
            )}
            <button className="stu-pager-btn" disabled={current >= totalPages} onClick={() => goTo(current + 1)} aria-label="Next page">
              <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
