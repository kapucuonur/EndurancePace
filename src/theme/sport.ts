import { sportColors } from '@/theme/tokens';
import type { Sport } from '@/types/domain';

export const SPORT_LABEL: Record<Sport, string> = {
  swim: 'Swim',
  bike: 'Bike',
  run: 'Run',
  strength: 'Strength',
};

/** Ionicons name per sport (from @expo/vector-icons). */
export const SPORT_ICON: Record<Sport, string> = {
  swim: 'water',
  bike: 'bicycle',
  run: 'walk',
  strength: 'barbell',
};

export function sportColor(sport: Sport): string {
  return sportColors[sport];
}
