import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: string | Date | undefined | null) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtMoney(paise: number | undefined | null) {
  if (paise == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

/** Format a rupee amount (booking.price, wallet balance, etc.). */
export function fmtRupees(n: number | undefined | null) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n));
}

export function fmtPhone(p?: string) {
  if (!p) return '—';
  return p.startsWith('+91') ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p;
}

/** Resolve `/uploads/...` (or any relative path) against the API origin. */
export function mediaUrl(url?: string | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const base = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}
