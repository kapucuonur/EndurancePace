/**
 * Periodization helpers — derive phase-block date ranges and "where are we now"
 * from a plan's `startDate` + `blocks` (weeks). Blocks are the source of truth
 * for the timeline; `endDate` is informational.
 */

import { daysBetween, shiftDays, shiftWeeks } from '@/lib/date';
import type { ISODate, PeriodizationPhase, PlanBlock, TrainingPlan } from '@/types/domain';

export function totalWeeks(blocks: PlanBlock[]): number {
  return blocks.reduce((sum, b) => sum + Math.max(0, b.weeks), 0);
}

/** Whole weeks from `startISO` to `endISO`, minimum 1. */
export function weeksBetween(startISO: ISODate, endISO: ISODate): number {
  return Math.max(1, Math.ceil(daysBetween(startISO, endISO) / 7));
}

/**
 * A sensible starting breakdown for `weeks` total: ~45% base / ~40% build /
 * ~15% peak, plus a 1-week taper for plans of 8+ weeks. Short plans collapse to
 * a single build block. Rounding drift is absorbed by the build block.
 */
export function defaultBlocks(weeks: number): PlanBlock[] {
  const w = Math.max(1, Math.round(weeks));
  if (w <= 3) return [{ phase: 'build', weeks: w }];

  const taper = w >= 8 ? 1 : 0;
  const body = w - taper;
  const base = Math.max(1, Math.round(body * 0.45));
  const peak = Math.max(1, Math.round(body * 0.15));
  const build = Math.max(1, body - base - peak);

  const blocks: PlanBlock[] = [
    { phase: 'base', weeks: base },
    { phase: 'build', weeks: build },
    { phase: 'peak', weeks: peak },
  ];
  if (taper) blocks.push({ phase: 'taper', weeks: taper });
  return blocks;
}

export interface BlockRange {
  block: PlanBlock;
  index: number;
  startDate: ISODate;
  /** Last day of the block (inclusive). */
  endDate: ISODate;
}

type PlanShape = Pick<TrainingPlan, 'startDate' | 'blocks'>;

export function blockRanges(plan: PlanShape): BlockRange[] {
  const blocks = plan.blocks ?? [];
  const out: BlockRange[] = [];
  let cursor = plan.startDate;
  blocks.forEach((block, index) => {
    const next = shiftWeeks(cursor, Math.max(0, block.weeks));
    out.push({
      block,
      index,
      startDate: cursor,
      endDate: shiftDays(next, -1),
    });
    cursor = next;
  });
  return out;
}

/**
 * Index of the block containing `todayISO`. `-1` if the plan hasn't started;
 * the last block's index if it's already over.
 */
export function currentBlockIndex(plan: PlanShape, todayISO: ISODate): number {
  const ranges = blockRanges(plan);
  if (ranges.length === 0) return -1;
  if (todayISO < ranges[0].startDate) return -1;
  const i = ranges.findIndex((r) => todayISO >= r.startDate && todayISO <= r.endDate);
  return i >= 0 ? i : ranges.length - 1;
}

export function currentPhase(
  plan: PlanShape & { phase: PeriodizationPhase },
  todayISO: ISODate,
): PeriodizationPhase {
  const i = currentBlockIndex(plan, todayISO);
  return i >= 0 ? (plan.blocks?.[i]?.phase ?? plan.phase) : plan.phase;
}
