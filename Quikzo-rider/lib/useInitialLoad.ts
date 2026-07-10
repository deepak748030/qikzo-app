import { useEffect, useState } from 'react';

// Simple first-paint loading flag — flips false after `ms` so screens can
// show a skeleton before their real content mounts.
export function useInitialLoad(ms = 600) {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), ms);
        return () => clearTimeout(t);
    }, [ms]);
    return loading;
}
