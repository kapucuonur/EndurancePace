import { Modal, Pressable, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { todayISO } from '@/lib/date';
import { palette } from '@/theme/tokens';

interface Props {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onPick: (dateISO: string) => void;
}

/** Bottom-sheet date picker for "add a template to the calendar". */
export function ScheduleModal({ visible, title, onClose, onPick }: Props) {
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="gap-md rounded-t-xl bg-bg p-lg dark:bg-bg-dark"
          onPress={() => {}}>
          <View className="flex-row items-center justify-between">
            <Text variant="heading">{t('scheduleModal.addToCalendar')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text className="text-brand">{t('common.close')}</Text>
            </Pressable>
          </View>
          {title ? (
            <Text variant="caption" muted numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          <Calendar
            current={todayISO()}
            minDate={todayISO()}
            onDayPress={(d) => onPick(d.dateString)}
            theme={{
              arrowColor: palette.brand,
              todayTextColor: palette.brand,
              selectedDayBackgroundColor: palette.brand,
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
