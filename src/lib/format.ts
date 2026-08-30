/** Display formatters for durations, paces, and distances. */

import type { Sport } from '@/types/domain';

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Compact form for headers: "1h 15m", "45m". */
export function formatDurationShort(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** sec/km or sec/100m -> "m:ss". */
export function formatPace(secPerUnit: number): string {
  const s = Math.round(secPerUnit);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** "m:ss" (or a bare seconds string) -> seconds. `null` when unparseable. */
export function parsePace(text: string): number | null {
  const t = text.trim();
  const mmss = t.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * Average speed (m/s) rendered the way each sport is usually read: pace per km
 * for the run, pace per 100 m for the swim, km/h for the bike.
 */
export function formatSpeed(mps: number, sport: Sport): { value: string; unit: string } {
  if (mps <= 0) return { value: '—', unit: '' };
  if (sport === 'bike') return { value: (mps * 3.6).toFixed(1), unit: 'km/h' };
  if (sport === 'swim') return { value: formatPace(100 / mps), unit: '/100m' };
  return { value: formatPace(1000 / mps), unit: '/km' };
}

export function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
