import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { todayISO } from '@/lib/date';
import { useKeyboardOffset } from '@/lib/keyboard';
import { goBack } from '@/lib/nav';
import { useAppStore, useAthlete } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';
import { RACE_PRIORITIES, type RacePriority, type Sport } from '@/types/domain';

// Strength isn't a race discipline; triathlons are entered by distance label.
const RACE_SPORTS: Sport[] = ['run', 'bike', 'swim'];

// Error text is resolved via i18n at render, not shown from here.
const schema = z.object({
  name: z.string().trim().min(2),
  distance: z.string().trim().min(1),
  location: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

const INPUT_CLASS =
  'rounded-md border border-border bg-surface px-md py-3 text-base text-fg dark:border-border-dark dark:bg-surface-dark dark:text-fg-dark';

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      aria-checked={on}
      className={`rounded-full border px-md py-2 ${
        on ? 'border-brand bg-brand/10' : 'border-border dark:border-border-dark'
      }`}>
      <Text variant="label" style={on ? { color: palette.brand } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function NewEventScreen() {
  const keyboardOffset = useKeyboardOffset(useHeaderHeight());
  const t = useT();
  const athlete = useAthlete();
  const createEvent = useAppStore((s) => s.createEvent);

  const [date, setDate] = useState<string | null>(null);
  const [sport, setSport] = useState<Sport>('run');
  const [priority, setPriority] = useState<RacePriority>('A');
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', distance: '', location: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!athlete || !date) return;
    setSaving(true);
    try {
      await createEvent({
        athleteId: athlete.id,
        name: values.name,
        date,
        sport,
        priority,
        distance: values.distance,
        location: values.location || undefined,
      });
      goBack();
    } catch (e) {
      Alert.alert(t('raceBuilder.saveFailed'), e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable
              onPress={goBack}
              hitSlop={8}
              // Web's header has no leading inset, so the label would touch the edge.
              className={Platform.OS === 'web' ? 'px-md' : 'pr-md'}>
              <Text className="text-brand">{t('common.cancel')}</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
        className="flex-1">
        <ScrollView contentContainerClassName="p-lg gap-xl pb-40">
          <View className="gap-sm">
            <Text variant="label" muted>
              {t('raceBuilder.name')}
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={t('raceBuilder.namePlaceholder')}
                    placeholderTextColor={palette.textFaint}
                    accessibilityLabel={t('raceBuilder.name')}
                    className={INPUT_CLASS}
                  />
                  {fieldState.error ? (
                    <Text variant="caption" style={{ color: palette.danger }}>
                      {t('raceBuilder.nameError')}
                    </Text>
                  ) : null}
                </>
              )}
            />
          </View>

          <View className="gap-sm">
            <Text variant="label" muted>
              {t('raceBuilder.date')}
            </Text>
            <Calendar
              current={todayISO()}
              minDate={todayISO()}
              onDayPress={(d) => setDate(d.dateString)}
              markedDates={date ? { [date]: { selected: true } } : undefined}
              theme={{
                arrowColor: palette.brand,
                todayTextColor: palette.brand,
                selectedDayBackgroundColor: palette.brand,
              }}
            />
            {!date ? (
              <Text variant="caption" muted>
                {t('raceBuilder.pickDate')}
              </Text>
            ) : null}
          </View>

          <View className="gap-sm">
            <Text variant="label" muted>
              {t('raceBuilder.distance')}
            </Text>
            <Controller
              control={control}
              name="distance"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={t('raceBuilder.distancePlaceholder')}
                    placeholderTextColor={palette.textFaint}
                    accessibilityLabel={t('raceBuilder.distance')}
                    className={INPUT_CLASS}
                  />
                  {fieldState.error ? (
                    <Text variant="caption" style={{ color: palette.danger }}>
                      {t('raceBuilder.distanceError')}
                    </Text>
                  ) : null}
                </>
              )}
            />
          </View>

          <View className="gap-sm">
            <Text variant="label" muted>
              {t('raceBuilder.sport')}
            </Text>
            <View className="flex-row flex-wrap gap-sm">
              {RACE_SPORTS.map((s) => (
                <Chip
                  key={s}
                  label={t(`sport.${s}`)}
                  on={sport === s}
                  onPress={() => setSport(s)}
                />
              ))}
            </View>
          </View>

          <View className="gap-sm">
            <Text variant="label" muted>
              {t('raceBuilder.priority')}
            </Text>
            <View className="flex-row flex-wrap gap-sm">
              {RACE_PRIORITIES.map((p) => (
                <Chip
                  key={p}
                  label={t(`raceBuilder.priority${p}`)}
                  on={priority === p}
                  onPress={() => setPriority(p)}
                />
              ))}
            </View>
          </View>

          <View className="gap-sm">
            <Text variant="label" muted>
              {t('raceBuilder.location')}
            </Text>
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('raceBuilder.locationPlaceholder')}
                  placeholderTextColor={palette.textFaint}
                  accessibilityLabel={t('raceBuilder.location')}
                  className={INPUT_CLASS}
                />
              )}
            />
          </View>

          <Button
            label={t('raceBuilder.save')}
            onPress={handleSubmit(onSubmit)}
            disabled={!date}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
