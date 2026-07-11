import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

type Page<T> = { items: T[]; nextCursor: string | null };

/**
 * Cursor-pagination hook aligned with the server envelope
 * `{ items, nextCursor }`. Supports infinite append + refetch.
 */
export function usePaginated<T = any>(
  path: string,
  query: Record<string, unknown> = {},
  opts: { pageSize?: number; enabled?: boolean } = {},
) {
  const { pageSize = 30, enabled = true } = opts;
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryKey = JSON.stringify(query);
  const reqId = useRef(0);

  const load = useCallback(async (append: boolean) => {
    const id = ++reqId.current;
    setLoading(true); setError(null);
    try {
      const res = await api<Page<T>>(path, { query: { ...query, limit: pageSize, cursor: append ? cursor : undefined } });
      if (id !== reqId.current) return;
      setItems(prev => append ? [...prev, ...res.items] : res.items);
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } catch (e: any) {
      if (id !== reqId.current) return;
      setError(e);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, cursor, pageSize]);

  useEffect(() => {
    if (!enabled) return;
    setCursor(null); setHasMore(true); setItems([]);
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, enabled]);

  return {
    items, loading, error, hasMore,
    loadMore: () => (!loading && hasMore ? load(true) : undefined),
    refresh: () => { setCursor(null); return load(false); },
  };
}
