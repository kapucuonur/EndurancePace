import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import aiCoachIcon from '@/assets/images/promo/ai-coach.png';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { AI_COACH_URL, promoUrl } from '@/lib/promo';
import { palette } from '@/theme/tokens';

type Context = 'plans' | 'activity';

const dismissKey = (context: Context) => `endurancepace:nudge:${context}:dismissed`;

/**
 * Small, dismissible pointer to CoachOnur AI shown where it's relevant
 * (planning, a synced Garmin activity). Dismissal is remembered per context on
 * this device. Hidden until storage is read so it never flashes in and out.
 */
export function AiCoachNudge({ context }: { context: Context }) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(dismissKey(context))
      .then((v) => alive && setVisible(v !== '1'))
      .catch(() => alive && setVisible(true));
    return () => {
      alive = false;
    };
  }, [context]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(dismissKey(context), '1').catch(() => {});
  };

  return (
    <View className="flex-row items-start gap-md rounded-lg border border-brand/30 bg-brand-tint p-md dark:bg-surface-alt-dark">
      <Image
        source={aiCoachIcon}
        style={{ width: 40, height: 40, borderRadius: 9 }}
        accessibilityIgnoresInvertColors
      />
      <View className="flex-1 gap-1">
        <Text variant="label">{t(`nudge.${context}Title`)}</Text>
        <Text variant="caption" muted>
          {t(`nudge.${context}Body`)}
        </Text>
        <Pressable
          onPress={() => void Linking.openURL(promoUrl(AI_COACH_URL, context))}
          accessibilityRole="link"
          hitSlop={8}
          className="mt-1 flex-row items-center gap-1 self-start active:opacity-70">
          <Text variant="label" style={{ color: palette.brand }}>
            {t('nudge.cta')}
          </Text>
          <Ionicons name="open-outline" size={14} color={palette.brand} />
        </Pressable>
      </View>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel={t('nudge.dismiss')}
        hitSlop={12}
        className="active:opacity-70">
        <Ionicons name="close" size={18} color={palette.textFaint} />
      </Pressable>
    </View>
  );
}
