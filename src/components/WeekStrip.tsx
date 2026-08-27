import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { dayLabel, dayNumber, todayISO, weekDays } from '@/lib/date';
import { useAppStore } from '@/store/useAppStore';
import { sportColor } from '@/theme/sport';
import type { ISODate } from '@/types/domain';

interface Props {
  /** Any date inside the week to render. */
  anchorDate: ISODate;
  selectedDate: ISODate;
  onSelect: (date: ISODate) => void;
}

/** TrainingPeaks-style horizontal 7-day strip with per-sport dots. */
export function WeekStrip({ anchorDate, selectedDate, onSelect }: Props) {
  const days = useMemo(() => weekDays(anchorDate), [anchorDate]);
  const today = todayISO();

  // Select raw state, derive here. A selector that builds a fresh object each
  // call breaks Zustand v5's Object.is snapshot check → infinite render loop.
  const workouts = useAppStore((s) => s.workouts);
  const workoutsByDay = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const w of workouts) {
      if (w.isTemplate || !w.date) continue;
      if (w.date < days[0] || w.date > days[6]) continue;
      (map[w.date] ??= []).push(w.sport);
    }
    return map;
  }, [workouts, days]);

  return (
    // Fixed-height wrapper: a bare horizontal ScrollView in a flex column
    // stretches its rows to fill the remaining vertical space.
    <View className="h-[74px]">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-lg gap-sm items-center">
        {days.map((d) => {
          const selected = d === selectedDate;
          const isToday = d === today;
          const sports = workoutsByDay[d] ?? [];
          return (
            <Pressable
              key={d}
              onPress={() => onSelect(d)}
              className={`h-[68px] w-12 items-center justify-center rounded-lg ${
                selected ? 'bg-brand' : 'bg-surface dark:bg-surface-dark'
              }`}>
              <Text
                className={`text-xs ${
                  selected ? 'text-white/80' : 'text-muted dark:text-muted-dark'
                }`}>
                {dayLabel(d)}
              </Text>
              <Text
                className={`text-base font-bold ${
                  selected ? 'text-white' : isToday ? 'text-brand' : 'text-fg dark:text-fg-dark'
                }`}>
                {dayNumber(d)}
              </Text>
              <View className="mt-xs h-1.5 flex-row gap-0.5">
                {sports.slice(0, 3).map((sp, i) => (
                  <View
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: selected ? '#fff' : sportColor(sp as never) }}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
