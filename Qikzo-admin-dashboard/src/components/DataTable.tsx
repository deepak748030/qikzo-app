import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** Hidden from the mobile card layout when true. */
  hideOnMobile?: boolean;
  /** Shown as the primary row title in mobile card layout. */
  primary?: boolean;
};

/**
 * Responsive table:
 *  - md+ screens: traditional table
 *  - mobile: stacked cards, each column becomes label+value
 */
export function DataTable<T extends { _id?: string; id?: string }>({ columns, rows, onRowClick }: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map(c => (
                <th key={c.key} style={{ width: c.width }} className={cn(
                  'px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                )}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row._id ?? row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={cn('border-t border-border transition', onRowClick && 'cursor-pointer hover:bg-muted/40')}
              >
                {columns.map(c => (
                  <td key={c.key} className={cn(
                    'px-4 py-3 align-top',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                  )}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => {
          const primary = columns.find(c => c.primary) || columns[0];
          const rest = columns.filter(c => c.key !== primary.key && !c.hideOnMobile);
          return (
            <div
              key={row._id ?? row.id ?? i}
              onClick={() => onRowClick?.(row)}
              className={cn('rounded-lg border border-border bg-card p-4 space-y-2', onRowClick && 'cursor-pointer active:bg-muted/40')}
            >
              <div>{primary.render(row)}</div>
              {rest.map(c => (
                <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-xs text-muted-foreground shrink-0">{c.header}</span>
                  <div className="text-right min-w-0">{c.render(row)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
