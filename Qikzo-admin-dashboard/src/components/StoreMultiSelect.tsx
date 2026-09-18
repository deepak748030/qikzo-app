import { useMemo, useState } from 'react';
import { Check, Search, Store, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';

export type StoreOption = {
  _id: string;
  name: string;
  kind?: 'restaurant' | 'store';
  address?: string;
};

/**
 * Searchable multi-select used by the Banner Management form.
 *
 * The "nothing selected = ALL" rule lives in the hint line: the server treats
 * an empty `storeIds` array as "applies to every merchant of this type", so
 * the admin must be able to see that state explicitly rather than guess.
 */
export function StoreMultiSelect({
  options,
  value,
  onChange,
  typeLabel,
  loading,
}: {
  options: StoreOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  typeLabel: string;
  loading?: boolean;
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      o => o.name.toLowerCase().includes(needle) || (o.address || '').toLowerCase().includes(needle),
    );
  }, [options, q]);

  const selected = new Set(value);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Preserve the option order so the saved name snapshot reads naturally.
    onChange(options.filter(o => next.has(o._id)).map(o => o._id));
  };

  const allSelected = filtered.length > 0 && filtered.every(o => selected.has(o._id));

  return (
    <div className="rounded-md border border-border">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search restaurants / stores…"
            className="h-9 pl-8"
          />
        </div>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : filtered.map(o => o._id))}
            className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap px-1"
          >
            {allSelected ? 'Clear' : 'Select all'}
          </button>
        )}
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-border">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {options.length === 0
              ? 'No merchants yet. Add them under Stores first.'
              : 'No match for that search.'}
          </div>
        ) : (
          filtered.map(o => {
            const on = selected.has(o._id);
            return (
              <button
                key={o._id}
                type="button"
                onClick={() => toggle(o._id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/60',
                  on && 'bg-primary/5',
                )}
              >
                <span
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                    on ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {o.kind === 'store' ? (
                  <Store className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm truncate">{o.name}</span>
                  {o.address && (
                    <span className="block text-xs text-muted-foreground truncate">{o.address}</span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div
        className={cn(
          'px-3 py-2 text-xs border-t border-border',
          selected.size === 0 ? 'text-primary bg-primary/5' : 'text-muted-foreground',
        )}
      >
        {selected.size === 0 ? (
          <>
            <span className="font-medium">No selection</span> → this banner applies to{' '}
            <span className="font-medium">ALL {typeLabel}</span>
          </>
        ) : (
          <>
            <span className="font-medium">{selected.size} selected</span> → banner shows only for these
          </>
        )}
      </div>
    </div>
  );
}

export default StoreMultiSelect;
