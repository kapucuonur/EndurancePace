import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SportGlyph } from '@/components/SportGlyph';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { palette } from '@/theme/tokens';
import { SPORTS, type ISODate, type Sport } from '@/types/domain';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Day the new workout lands on. */
  date: ISODate;
}

/**
 * "Create" bottom sheet behind the calendar's create button: pick a sport to
 * start a workout, or jump to the library, a new plan or a new race.
 */
export function CreateSheet({ visible, onClose, date }: Props) {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (fn: () => void) => {
    onClose();
    fn();
  };
  const startWorkout = (sport: Sport) =>
    go(() => router.push({ pathname: '/workout/new', params: { date, sport } }));

  const more: { key: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    {
      key: 'fromLibrary',
      icon: 'library-outline',
      onPress: () => go(() => router.push('/library')),
    },
    { key: 'newPlan', icon: 'map-outline', onPress: () => go(() => router.push('/plan/new')) },
    {
      key: 'addRace',
      icon: 'flag-outline',
      onPress: () => go(() => router.push('/event/new')),
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel={t('common.close')}
        className="flex-1 justify-end bg-black/40">
        {/* Inner Pressable swallows taps so they don't close the sheet. */}
        <Pressable
          onPress={() => {}}
          style={{ paddingBottom: insets.bottom + 16 }}
          className="gap-lg rounded-t-2xl bg-bg px-lg pt-md dark:bg-bg-dark">
          <View className="h-1 w-10 self-center rounded-full bg-border dark:bg-border-dark" />

          <View className="gap-sm">
            <Text variant="heading">{t('createSheet.newWorkout')}</Text>
            <Text variant="caption" muted>
              {t('createSheet.pickSport')}
            </Text>
            <View className="flex-row gap-sm">
              {SPORTS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => startWorkout(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('createSheet.newWorkout')}: ${t(`sport.${s}`)}`}
                  className="flex-1 items-center gap-1.5 rounded-lg border border-border bg-surface py-md active:opacity-70 dark:border-border-dark dark:bg-surface-dark">
                  <SportGlyph sport={s} size={24} />
                  <Text variant="caption">{t(`sport.${s}`)}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-xs">
            {more.map((m) => (
              <Pressable
                key={m.key}
                onPress={m.onPress}
                accessibilityRole="button"
                className="flex-row items-center gap-md rounded-md px-sm py-md active:bg-surface dark:active:bg-surface-dark">
                <Ionicons name={m.icon} size={20} color={palette.brand} />
                <Text variant="label" className="flex-1">
                  {t(`createSheet.${m.key}`)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
