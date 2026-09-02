/**
 * Date helpers. We keep calendar days as `YYYY-MM-DD` strings and treat weeks
 * as Monday-first (endurance training convention).
 */

import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
  startOfWeek,
} from 'date-fns';
import { de, enUS, es, it, ru, tr } from 'date-fns/locale';

import { activeLocale, i18n } from '@/i18n';
import type { ISODate, ISODateTime } from '@/types/domain';

const WEEK_OPTS = { weekStartsOn: 1 } as const; // Monday

const DATE_FNS_LOCALES = { en: enUS, tr, de, ru, it, es } as const;

/** date-fns format options carrying the app's current locale. */
function fmtOpts() {
  return { locale: DATE_FNS_LOCALES[activeLocale()] };
}

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

export function fromISODate(s: ISODate): Date {
  return parseISO(s);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function weekStart(dateISO: ISODate): ISODate {
  return toISODate(startOfWeek(fromISODate(dateISO), WEEK_OPTS));
}

export function weekEnd(dateISO: ISODate): ISODate {
  return toISODate(endOfWeek(fromISODate(dateISO), WEEK_OPTS));
}

/** The 7 ISO dates of the week containing `dateISO`, Monday first. */
export function weekDays(dateISO: ISODate): ISODate[] {
  const start = startOfWeek(fromISODate(dateISO), WEEK_OPTS);
  return eachDayOfInterval({ start, end: addDays(start, 6) }).map(toISODate);
}

export function shiftWeeks(dateISO: ISODate, weeks: number): ISODate {
  return toISODate(addDays(fromISODate(dateISO), weeks * 7));
}

export function shiftDays(dateISO: ISODate, days: number): ISODate {
  return toISODate(addDays(fromISODate(dateISO), days));
}

export function isSameDay(a: ISODate, b: ISODate): boolean {
  return a === b;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(fromISODate(b), fromISODate(a));
}

export function dayLabel(dateISO: ISODate): string {
  return format(fromISODate(dateISO), 'EEE', fmtOpts());
}

export function dayNumber(dateISO: ISODate): string {
  return format(fromISODate(dateISO), 'd', fmtOpts());
}

export function longDate(dateISO: ISODate): string {
  return format(fromISODate(dateISO), 'EEEE, d MMMM', fmtOpts());
}

export function monthTitle(dateISO: ISODate): string {
  return format(fromISODate(dateISO), 'LLLL yyyy', fmtOpts());
}

/** "3 min ago", "2 days ago" — for message timestamps and last-seen lines. */
export function relativeTime(iso: ISODateTime): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, ...fmtOpts() });
}

/** Day separator label for a chat: "Today" / "Yesterday" / "Monday, 1 September". */
export function dayHeading(iso: ISODateTime): string {
  const d = parseISO(iso);
  if (isToday(d)) return i18n.t('time.today');
  if (isYesterday(d)) return i18n.t('time.yesterday');
  return format(d, 'EEEE, d MMMM', fmtOpts());
}

/** Clock time for a single message bubble, e.g. "14:32". */
export function clockTime(iso: ISODateTime): string {
  return format(parseISO(iso), 'HH:mm');
}
