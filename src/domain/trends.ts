/**
 * Performance Management Chart (PMC) style load model.
 *
 *  CTL ("Fitness")  = exponentially-weighted average of daily TSS, 42-day.
 *  ATL ("Fatigue")  = same, 7-day.
 *  TSB ("Form")     = yesterday's CTL - yesterday's ATL.
 */

import { shiftDays, todayISO } from '@/lib/date';
import type { ISODate, Workout } from '@/types/domain';

export interface LoadPoint {
  date: ISODate;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

function ewmaNext(prev: number, value: number, timeConstant: number): number {
  const alpha = 1 - Math.exp(-1 / timeConstant);
  return prev + alpha * (value - prev);
}

export function buildLoadSeries(workouts: Workout[], days = 21): LoadPoint[] {
  const start = shiftDays(todayISO(), -days);
  const tssByDay = new Map<string, number>();
  for (const w of workouts) {
    if (w.isTemplate || !w.date || w.date < start) continue;
    const tss =
      w.status === 'completed' ? (w.completed?.actualTss ?? w.plannedTss) : w.plannedTss;
    if (w.status === 'skipped') continue;
    tssByDay.set(w.date, (tssByDay.get(w.date) ?? 0) + tss);
  }

  const points: LoadPoint[] = [];
  let ctl = 0;
  let atl = 0;
  for (let i = 0; i <= days; i++) {
    const date = shiftDays(start, i);
    const tss = tssByDay.get(date) ?? 0;
    const prevCtl = ctl;
    const prevAtl = atl;
    ctl = ewmaNext(prevCtl, tss, 42);
    atl = ewmaNext(prevAtl, tss, 7);
    points.push({
      date,
      tss,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((prevCtl - prevAtl) * 10) / 10,
    });
  }
  return points;
}
