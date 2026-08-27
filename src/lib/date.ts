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
  parseISO,
  startOfWeek,
} from 'date-fns';

import type { ISODate } from '@/types/domain';

const WEEK_OPTS = { weekStartsOn: 1 } as const; // Monday

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
  return format(fromISODate(dateISO), 'EEE');
}

export function dayNumber(dateISO: ISODate): string {
  return format(fromISODate(dateISO), 'd');
}

export function longDate(dateISO: ISODate): string {
  return format(fromISODate(dateISO), 'EEEE, MMMM d');
}

export function monthTitle(dateISO: ISODate): string {
  return format(fromISODate(dateISO), 'MMMM yyyy');
}
