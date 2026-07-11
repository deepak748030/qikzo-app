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

export function fmtPhone(p?: string) {
  if (!p) return '—';
  return p.startsWith('+91') ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p;
}
