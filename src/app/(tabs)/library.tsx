import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { ScheduleModal } from '@/components/library/ScheduleModal';
import { SportGlyph } from '@/components/SportGlyph';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { longDate } from '@/lib/date';
import { formatDurationShort } from '@/lib/format';
import { useAppStore, useLibraryWorkouts } from '@/store/useAppStore';
import { sportColor } from '@/theme/sport';
import { palette } from '@/theme/tokens';
import { SPORTS, type Sport, type Workout } from '@/types/domain';

type SportFilter = Sport | 'all';

export default function LibraryScreen() {
  const router = useRouter();
  const t = useT();
  const templates = useLibraryWorkouts();
  const scheduleFromTemplate = useAppStore((s) => s.scheduleFromTemplate);

  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<SportFilter>('all');
  const [scheduling, setScheduling] = useState<Workout | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter(
      (t) =>
        (sport === 'all' || t.sport === sport) &&
        (q === '' ||
          t.title.toLowerCase().includes(q) ||
          (t.templateCategory ?? '').toLowerCase().includes(q)),
    );
  }, [templates, query, sport]);

  const grouped = useMemo(() => {
    const map: Record<string, Workout[]> = {};
    for (const t of filtered) (map[t.sport] ??= []).push(t);
    return map;
  }, [filtered]);

  const schedule = async (dateISO: string) => {
    if (!scheduling) return;
    const tpl = scheduling;
    setScheduling(null);
    await scheduleFromTemplate(tpl.id, dateISO);
    Alert.alert(
      t('library.addedTitle'),
      t('library.added', { title: tpl.title, date: longDate(dateISO) }),
    );
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-lg py-sm">
        <Text variant="title">{t('library.title')}</Text>
        <Pressable
          onPress={() => router.push('/workout/new')}
          className="h-10 w-10 items-center justify-center rounded-full bg-brand">
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Search + sport filter */}
      <View className="gap-sm px-lg pb-sm">
        <View className="flex-row items-center gap-sm rounded-md border border-border bg-surface px-md dark:border-border-dark dark:bg-surface-dark">
          <Ionicons name="search" size={16} color={palette.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('library.searchPlaceholder')}
            placeholderTextColor={palette.textFaint}
            className="flex-1 py-2.5 text-base text-fg dark:text-fg-dark"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={palette.textFaint} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-sm">
          {(['all', ...SPORTS] as SportFilter[]).map((s) => {
            const active = sport === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSport(s)}
                className={`flex-row items-center gap-xs rounded-full border px-md py-1.5 ${
                  active ? 'border-brand bg-brand' : 'border-border dark:border-border-dark'
                }`}>
                {s !== 'all' ? (
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: active ? '#fff' : sportColor(s) }}
                  />
                ) : null}
                <Text
                  variant="caption"
                  className={
                    active ? 'font-semibold text-white' : 'text-muted dark:text-muted-dark'
                  }>
                  {s === 'all' ? t('sport.all') : t(`sport.${s}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerClassName="p-lg gap-lg pb-24">
        {templates.length === 0 ? (
          <Text muted>{t('library.empty')}</Text>
        ) : filtered.length === 0 ? (
          <Text muted>{t('library.noMatch')}</Text>
        ) : (
          (Object.keys(grouped) as Sport[]).map((s) => (
            <View key={s} className="gap-sm">
              <View className="flex-row items-center gap-sm">
                <SportGlyph sport={s} size={16} />
                <Text variant="heading">{t(`sport.${s}`)}</Text>
                <Text variant="caption" muted>
                  {grouped[s].length}
                </Text>
              </View>
              {grouped[s].map((tpl) => (
                <Card key={tpl.id} className="flex-row items-center gap-md">
                  <View className="flex-1">
                    <Text variant="label">{tpl.title}</Text>
                    <Text variant="caption" muted>
                      {formatDurationShort(tpl.plannedDuration)} · {tpl.plannedTss} TSS
                      {tpl.templateCategory ? ` · ${tpl.templateCategory}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/workout/new', params: { id: tpl.id } })
                    }
                    hitSlop={8}
                    className="p-xs">
                    <Ionicons name="create-outline" size={18} color={palette.textMuted} />
                  </Pressable>
                  <Pressable onPress={() => setScheduling(tpl)} hitSlop={8} className="p-xs">
                    <Ionicons name="calendar-outline" size={20} color={palette.brand} />
                  </Pressable>
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <ScheduleModal
        visible={scheduling !== null}
        title={scheduling?.title}
        onClose={() => setScheduling(null)}
        onPick={schedule}
      />
    </Screen>
  );
}
