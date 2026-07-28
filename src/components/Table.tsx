import React, { useState, useCallback } from 'react';
import { RiArrowUpLine, RiArrowDownLine, RiArrowUpDownLine, RiSubtractLine } from 'react-icons/ri';

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  /** Whether this column can be sorted. Requires `key` to be a primitive field. */
  sortable?: boolean;
  /** Custom CSS classes for the cell container. Overrides default 'truncate'. */
  className?: string;
}

type SortDir = 'asc' | 'desc';

interface SortState {
  key: string;
  dir: SortDir;
}

interface TableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  keyExtractor: (row: T) => string | number;
  /** When provided, selection checkboxes are rendered and this is called when selection changes. */
  onSelectionChange?: (selected: Set<string | number>) => void;
}

/**
 * Generic table with sortable columns and multi-row checkbox selection.
 */
export function Table<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found.',
  keyExtractor,
  onSelectionChange,
}: TableProps<T>): React.JSX.Element {
  const [sort, setSort] = useState<SortState | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const selectable = Boolean(onSelectionChange);

  /* ── Sorting ── */
  const sorted = React.useMemo((): T[] => {
    if (!sort) {
      return data;
    }
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key];
      const bv = (b as Record<string, unknown>)[sort.key];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  const handleSort = useCallback((key: string): void => {
    setSort(prev => {
      if (prev?.key === key) {
        return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
      }
      return { key, dir: 'asc' };
    });
  }, []);

  /* ── Selection ── */
  const allKeys = sorted.map(keyExtractor);
  const allSelected = allKeys.length > 0 && allKeys.every(k => selected.has(k));
  const someSelected = !allSelected && allKeys.some(k => selected.has(k));

  const toggleAll = (): void => {
    const next = allSelected ? new Set<string | number>() : new Set(allKeys);
    setSelected(next);
    onSelectionChange?.(next);
  };

  const toggleRow = (key: string | number): void => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
    onSelectionChange?.(next);
  };

  /* ── Grid template ── */
  const colWidths = [
    ...(selectable ? ['40px'] : []),
    ...columns.map(c => c.width ?? '1fr'),
  ].join(' ');

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col gap-2 relative">
      {/* Header */}
      <div
        className="grid items-center bg-stone-200 rounded-xl px-3 py-2.5 shadow-1 z-10 flex-shrink-0"
        style={{ gridTemplateColumns: colWidths }}
      >
        {selectable && (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleAll}
            />
          </div>
        )}
        {columns.map((col) => (
          <div key={String(col.key)} className="flex items-center gap-1 pr-3">
            {col.sortable ? (
              <button
                onClick={() => handleSort(col.key as string)}
                className="flex items-center gap-1 text-xs font-medium text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors group"
              >
                {col.header}
                <SortIcon sortKey={col.key as string} sort={sort} />
              </button>
            ) : (
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                {col.header}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Rows */}
      {sorted.length === 0 ? (
        <div className="px-4 py-12 text-center bg-white border border-stone-200 rounded-xl shadow-sm flex-shrink-0">
          <p className="text-sm text-stone-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pb-12 pr-2 -mr-2 relative z-0">
          <div className="flex flex-col divide-y divide-stone-200 border-b border-stone-200/80">
            {sorted.map((row) => {
              const key = keyExtractor(row);
              const isSelected = selected.has(key);
              return (
                <div
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={`scroll-animate-row grid items-center px-3 py-3 transition-colors duration-100
                  ${onRowClick ? 'cursor-pointer' : ''}
                  ${isSelected ? 'bg-stone-200/40' : 'bg-transparent hover:bg-stone-200/10'}
                `}
                  style={{ gridTemplateColumns: colWidths }}
                >
                  {selectable && (
                    <div
                      className="flex items-center justify-center"
                      onClick={(e) => { e.stopPropagation(); toggleRow(key); }}
                    >
                      <Checkbox checked={isSelected} onChange={() => toggleRow(key)} />
                    </div>
                  )}
                  {columns.map((col) => (
                    <div
                      key={String(col.key)}
                      className={`text-sm text-stone-700 pr-3 ${col.className ?? 'truncate'}`}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key as string] ?? '—')}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom gradient overlay */}
      {sorted.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
}

/* ── Sub-components ── */

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, indeterminate, onChange }) => {
  const ref = React.useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center rounded-md border transition-colors duration-150
        ${checked || indeterminate
          ? 'bg-stone-800 border-stone-800 text-white'
          : 'bg-white border-stone-300 hover:border-stone-500'
        }`}
    >
      {indeterminate && !checked
        ? <RiSubtractLine className="w-3 h-3" />
        : checked
          ? <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 4 7 9 1" /></svg>
          : null}
    </button>
  );
};

interface SortIconProps {
  sortKey: string;
  sort: SortState | null;
}

const SortIcon: React.FC<SortIconProps> = ({ sortKey, sort }) => {
  if (sort?.key !== sortKey) {
    return <RiArrowUpDownLine className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
  }
  return sort.dir === 'asc'
    ? <RiArrowUpLine className="w-3 h-3 text-stone-700" />
    : <RiArrowDownLine className="w-3 h-3 text-stone-700" />;
};
