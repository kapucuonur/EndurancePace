import { uid } from '@/lib/id';
import type { Step } from '@/types/domain';

/** Copy of `arr` with the item at `idx` swapped one place up (-1) or down (+1). */
export function moveItem<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const to = idx + dir;
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  [next[idx], next[to]] = [next[to], next[idx]];
  return next;
}

/** Deep copy of a step (and an interval set's children) with fresh ids. */
export function cloneStep(step: Step): Step {
  return { ...step, id: uid('st'), children: step.children.map(cloneStep) };
}
