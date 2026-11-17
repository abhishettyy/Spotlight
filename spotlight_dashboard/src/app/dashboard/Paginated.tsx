import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FM } from "./shared";

/**
 * Shows a long list one page at a time, with the same footer as the events table.
 * `children` renders the current page's items. The footer appears only when there is more than one
 * page size's worth of items. Changing `resetKey` (e.g. a search query) goes back to page 1.
 * `variant="table"` attaches the footer to a bordered table container; "plain" floats it below a grid.
 */
export function Paginated<T>({
  items,
  children,
  pageSize: initialPageSize = 10,
  pageSizes = [10, 25, 50],
  resetKey,
  variant = "table",
}: {
  items: T[];
  children: (pageItems: T[]) => ReactNode;
  pageSize?: number;
  pageSizes?: number[];
  resetKey?: unknown;
  variant?: "table" | "plain";
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPage(1); }, [resetKey, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const from = items.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, items.length);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);
  const showFooter = items.length > Math.min(...pageSizes, pageSize);

  const goTo = (n: number) => {
    setPage(n);
    // Bring the top of the list back into view when it has scrolled off the screen
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pageNumbers: (number | "…")[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - current) <= 1) pageNumbers.push(n);
    else if (pageNumbers[pageNumbers.length - 1] !== "…") pageNumbers.push("…");
  }

  const navBtn = "h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-md text-xs border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const navStyle = { background: "var(--sk-surface)", borderColor: "var(--sk-line)", color: "var(--sk-fg)" };

  return (
    <div ref={topRef} style={{ scrollMarginTop: 16 }}>
      {children(pageItems)}
      {showFooter && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs ${variant === "table" ? "px-5 py-3" : "mt-5 px-1"}`}
          style={{
            ...(variant === "table" ? { borderTop: "1px solid var(--sk-line)", background: "var(--sk-raised)" } : {}),
            color: "var(--sk-muted)",
            fontFamily: FM,
          }}
        >
          <div className="flex items-center gap-3">
            <span>{from}–{to} of {items.length}</span>
            <label className="flex items-center gap-1.5">
              Per page
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="h-7 rounded-md px-1.5 outline-none cursor-pointer"
                style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", color: "var(--sk-fg)" }}
              >
                {Array.from(new Set([...pageSizes, initialPageSize])).sort((a, b) => a - b).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button className={navBtn} disabled={current <= 1} onClick={() => goTo(current - 1)} aria-label="Previous page" style={navStyle}><ChevronLeft size={14} /></button>
            {pageNumbers.map((n, idx) => n === "…" ? (
              <span key={`e${idx}`} className="px-1">…</span>
            ) : (
              <button
                key={n}
                className={navBtn}
                onClick={() => goTo(n)}
                aria-current={n === current ? "page" : undefined}
                style={n === current ? { background: "var(--sk-brand)", borderColor: "var(--sk-brand)", color: "#fff" } : navStyle}
              >{n}</button>
            ))}
            <button className={navBtn} disabled={current >= totalPages} onClick={() => goTo(current + 1)} aria-label="Next page" style={navStyle}><ChevronRight size={14} /></button>
          </nav>
        </div>
      )}
    </div>
  );
}
