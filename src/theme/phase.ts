import type { PeriodizationPhase } from '@/types/domain';

export const PHASE_LABEL: Record<PeriodizationPhase, string> = {
  base: 'Base',
  build: 'Build',
  peak: 'Peak',
  taper: 'Taper',
  race: 'Race',
  recovery: 'Recovery',
};

export const PHASE_COLOR: Record<PeriodizationPhase, string> = {
  base: '#1FA971',
  build: '#2F6FED',
  peak: '#E8A13A',
  taper: '#9B51E0',
  race: '#E5484D',
  recovery: '#5B616E',
};
