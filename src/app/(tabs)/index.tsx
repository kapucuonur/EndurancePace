import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { SportGlyph } from '@/components/SportGlyph';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { WeekStrip } from '@/components/WeekStrip';
import { WorkoutCard } from '@/components/WorkoutCard';
import { useT, type TranslateFn } from '@/i18n/useT';
import {
  dayLabel,
  dayNumber,
  longDate,
  monthTitle,
  shiftWeeks,
  todayISO,
  weekDays,
} from '@/lib/date';
import { formatDurationShort } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { sportColor } from '@/theme/sport';
import { palette, sportColors } from '@/theme/tokens';
import type { ISODate } from '@/types/domain';

type Mode = 'week' | 'month';

export default function CalendarHomeScreen() {
  const router = useRouter();
  const t = useT();
  const [anchor, setAnchor] = useState<ISODate>(todayISO());
  const [selected, setSelected] = useState<ISODate>(todayISO());
  const [mode, setMode] = useState<Mode>('week');

  const allWorkouts = useAppStore((s) => s.workouts);
  const loading = useAppStore((s) => s.loading && !s.hydrated);

  const week = useMemo(() => weekDays(anchor), [anchor]);

  const byDay = useMemo(() => {
    const map: Record<string, typeof allWorkouts> = {};
    for (const w of allWorkouts) {
      if (w.isTemplate || !w.date) continue;
      (map[w.date] ??= []).push(w);
    }
    return map;
  }, [allWorkouts]);

  const weekStats = useMemo(() => {
    let duration = 0;
    let tss = 0;
    let count = 0;
    for (const d of week) {
      for (const w of byDay[d] ?? []) {
        duration += w.plannedDuration;
        tss += w.plannedTss;
        count += 1;
      }
    }
    return { duration, tss, count };
  }, [week, byDay]);

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      { dots: { key: string; color: string }[]; selected?: boolean }
    > = {};
    for (const w of allWorkouts) {
      if (w.isTemplate || !w.date) continue;
      const entry = (marks[w.date] ??= { dots: [] });
      if (!entry.dots.some((dot) => dot.key === w.sport)) {
        entry.dots.push({ key: w.sport, color: sportColor(w.sport) });
      }
    }
    marks[selected] = { ...(marks[selected] ?? { dots: [] }), selected: true };
    return marks;
  }, [allWorkouts, selected]);

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center justify-between px-lg pb-sm pt-xs">
        <View>
          <Text variant="title">
            {mode === 'week' ? t('calendar.thisWeek') : monthTitle(anchor)}
          </Text>
          <Text variant="caption" muted>
            {t('calendar.summary', {
              count: weekStats.count,
              duration: formatDurationShort(weekStats.duration),
              tss: weekStats.tss,
            })}
          </Text>
        </View>
        <Pressable
          onPress={() => setMode((m) => (m === 'week' ? 'month' : 'week'))}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark">
          <Ionicons
            name={mode === 'week' ? 'grid-outline' : 'reorder-four-outline'}
            size={20}
            color={palette.brand}
          />
        </Pressable>
      </View>

      {mode === 'week' ? (
        <>
          <View className="flex-row items-center justify-between px-lg py-sm">
            <Pressable onPress={() => setAnchor((a) => shiftWeeks(a, -1))} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={palette.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => {
                setAnchor(todayISO());
                setSelected(todayISO());
              }}>
              <Text variant="label" className="text-brand">
                {t('calendar.today')}
              </Text>
            </Pressable>
            <Pressable onPress={() => setAnchor((a) => shiftWeeks(a, 1))} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={palette.textMuted} />
            </Pressable>
          </View>

          <WeekStrip anchorDate={anchor} selectedDate={selected} onSelect={setSelected} />

          <ScrollView
            className="mt-sm flex-1"
            contentContainerClassName="px-lg pb-32 gap-lg pt-sm">
            {loading ? (
              <Text muted>{t('calendar.loadingPlan')}</Text>
            ) : (
              week.map((d) => (
                <DaySection
                  key={d}
                  t={t}
                  date={d}
                  workouts={byDay[d] ?? []}
                  highlighted={d === selected}
                  onPressWorkout={(id) => router.push(`/workout/${id}`)}
                  onAdd={() => router.push({ pathname: '/workout/new', params: { date: d } })}
                />
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-32">
          <Calendar
            current={anchor}
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day) => {
              setSelected(day.dateString);
              setAnchor(day.dateString);
            }}
            onMonthChange={(m) => setAnchor(m.dateString)}
            theme={{
              todayTextColor: palette.brand,
              selectedDayBackgroundColor: palette.brand,
              arrowColor: palette.brand,
            }}
          />
          <View className="mt-md px-lg">
            <Text variant="heading">{longDate(selected)}</Text>
            <View className="mt-sm gap-sm">
              {(byDay[selected] ?? []).length === 0 ? (
                <Text muted>{t('calendar.noWorkouts')}</Text>
              ) : (
                (byDay[selected] ?? []).map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    onPress={() => router.push(`/workout/${w.id}`)}
                  />
                ))
              )}
            </View>
            <View className="mt-md flex-row gap-md">
              {Object.entries(sportColors).map(([sp, c]) => (
                <View key={sp} className="flex-row items-center gap-xs">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                  <Text variant="caption" muted>
                    {t(`sport.${sp}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Floating add button */}
      <Pressable
        onPress={() => router.push({ pathname: '/workout/new', params: { date: selected } })}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand shadow-lg active:bg-brand-dark">
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </Screen>
  );
}

function DaySection({
  t,
  date,
  workouts,
  highlighted,
  onPressWorkout,
  onAdd,
}: {
  t: TranslateFn;
  date: ISODate;
  workouts: ReturnType<typeof useAppStore.getState>['workouts'];
  highlighted: boolean;
  onPressWorkout: (id: string) => void;
  onAdd: () => void;
}) {
  const isToday = date === todayISO();
  return (
    <View
      className={`rounded-lg ${
        highlighted ? 'bg-surface/60 p-md dark:bg-surface-dark/60' : ''
      }`}>
      <View className="mb-sm flex-row items-center justify-between">
        <View className="flex-row items-baseline gap-sm">
          <Text variant="heading" className={isToday ? 'text-brand' : undefined}>
            {dayLabel(date)}
          </Text>
          <Text variant="caption" muted>
            {dayNumber(date)}
          </Text>
        </View>
        <Pressable onPress={onAdd} hitSlop={10}>
          <Ionicons name="add-circle-outline" size={20} color={palette.textMuted} />
        </Pressable>
      </View>

      {workouts.length === 0 ? (
        <Text variant="caption" muted className="italic">
          {t('calendar.restDay')}
        </Text>
      ) : (
        <View className="gap-sm">
          {workouts.map((w) => {
            const actualTss = w.status === 'completed' ? w.completed?.actualTss : undefined;
            const dur = w.completed?.durationSeconds ?? w.plannedDuration;
            return (
              <Pressable
                key={w.id}
                onPress={() => onPressWorkout(w.id)}
                className="flex-row items-center gap-md rounded-md border border-border bg-surface p-md active:opacity-70 dark:border-border-dark dark:bg-surface-dark">
                <SportGlyph sport={w.sport} chip size={14} />
                <View className="flex-1">
                  <Text variant="label" numberOfLines={1}>
                    {w.title}
                  </Text>
                  <Text variant="caption" muted>
                    {formatDurationShort(dur)} · {actualTss ?? w.plannedTss} TSS ·{' '}
                    {t(`status.${w.status}`)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
