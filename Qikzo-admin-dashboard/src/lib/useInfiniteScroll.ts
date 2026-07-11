import { useEffect, useRef } from 'react';

/**
 * Attaches an IntersectionObserver to the returned ref. When the sentinel
 * scrolls into view AND `hasMore` is true AND not currently loading,
 * `onLoadMore` fires. Uses a 200px rootMargin so pagination pre-fetches
 * before the user hits the exact bottom.
 */
export function useInfiniteScroll(hasMore: boolean, loading: boolean, onLoadMore: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cbRef = useRef(onLoadMore);
  cbRef.current = onLoadMore;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !loading) cbRef.current();
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading]);

  return ref;
}
