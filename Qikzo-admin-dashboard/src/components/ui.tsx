import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type BtnSize = 'sm' | 'md' | 'icon';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; loading?: boolean }>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'icon' && 'h-9 w-9',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'bg-muted text-foreground hover:bg-muted/70',
        variant === 'outline' && 'border border-border bg-transparent hover:bg-muted',
        variant === 'ghost' && 'hover:bg-muted',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  ),
);
Button.displayName = 'Button';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground',
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-lg border border-border bg-card p-5', className)}>{children}</div>;
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const map: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-primary/10 text-primary',
  };
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', map[tone])}>{children}</span>;
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <div className="font-medium">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((__, j) => <Skeleton key={j} className="h-9" />)}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Infinite-scroll sentinel. Place at the end of any list; feed it the
 * ref returned by `useInfiniteScroll(hasMore, loading, loadMore)`.
 * Shows an inline spinner while more is loading, and an end-of-list hint
 * once fully paginated.
 */
export function InfiniteSentinel({ innerRef, hasMore, loading, empty }: {
  innerRef: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
  loading: boolean;
  empty?: boolean;
}) {
  return (
    <div ref={innerRef} className="flex justify-center py-6 text-sm text-muted-foreground">
      {loading && <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>}
      {!loading && !hasMore && !empty && <span>— end of list —</span>}
    </div>
  );
}

