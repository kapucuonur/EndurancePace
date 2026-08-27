import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { SPORT_ICON, sportColor } from '@/theme/sport';
import type { Sport } from '@/types/domain';

interface Props {
  sport: Sport;
  size?: number;
  /** Render inside a soft tinted circle. */
  chip?: boolean;
}

export function SportGlyph({ sport, size = 18, chip }: Props) {
  const color = sportColor(sport);
  const icon = SPORT_ICON[sport] as keyof typeof Ionicons.glyphMap;

  if (!chip) return <Ionicons name={icon} size={size} color={color} />;

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: size * 2,
        height: size * 2,
        backgroundColor: color + '22',
      }}>
      <Ionicons name={icon} size={size} color={color} />
    </View>
  );
}
