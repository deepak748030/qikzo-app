import { useEffect, useState } from 'react';

// Simple first-paint loading flag — flips false after `ms` so screens can
// show a skeleton before their real content mounts. Kept low (250 ms) so
// navigation feels instant on modern devices; slow devices still render the
// skeleton because the JS thread stays busy longer than the timer.
export function useInitialLoad(ms = 250) {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), ms);
        return () => clearTimeout(t);
    }, [ms]);
    return loading;
}
