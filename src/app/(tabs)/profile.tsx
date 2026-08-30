import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ZoneTable } from '@/components/ZoneTable';
import { calcSwimPaceZones } from '@/domain/zones';
import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@/i18n';
import { useT } from '@/i18n/useT';
import { formatPace } from '@/lib/format';
import { useAppStore, useAthlete, useGarmin, useIsCoach, useLocale } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';
import type { ThresholdValues } from '@/types/domain';

type FieldKey = keyof ThresholdValues;

function thresholdsToDraft(values: ThresholdValues | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = values?.[f.key];
    next[f.key] = v != null ? String(v) : '';
  }
  return next;
}

const FIELDS: { key: FieldKey; labelKey: string; hintKey: string }[] = [
  { key: 'ftpWatts', labelKey: 'profile.fieldFtp', hintKey: 'profile.hintWatts' },
  {
    key: 'runThresholdPaceSecPerKm',
    labelKey: 'profile.fieldRunPace',
    hintKey: 'profile.hintSecPerKm',
  },
  { key: 'cssSecPer100m', labelKey: 'profile.fieldCss', hintKey: 'profile.hintSecPer100m' },
  { key: 'thresholdHr', labelKey: 'profile.fieldLthr', hintKey: 'profile.hintBpm' },
  { key: 'maxHr', labelKey: 'profile.fieldMaxHr', hintKey: 'profile.hintBpm' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const athlete = useAthlete();
  const updateThresholds = useAppStore((s) => s.updateThresholds);
  const resetToSeed = useAppStore((s) => s.resetToSeed);
  const signOut = useAppStore((s) => s.signOut);
  const garmin = useGarmin();
  const isCoach = useIsCoach();
  const t = useT();
  const locale = useLocale();
  const setLocale = useAppStore((s) => s.setLocale);
  const loadGarminStatus = useAppStore((s) => s.loadGarminStatus);

  useEffect(() => {
    void loadGarminStatus();
  }, [loadGarminStatus]);

  const [draft, setDraft] = useState<Record<string, string>>(() =>
    thresholdsToDraft(athlete?.thresholds),
  );
  const [saving, setSaving] = useState(false);

  // Re-sync the draft when the stored thresholds change (e.g. after a reset).
  // Guarded render-time state adjustment — the React-recommended pattern.
  const [syncKey, setSyncKey] = useState(athlete?.updatedAt);
  if (athlete && athlete.updatedAt !== syncKey) {
    setSyncKey(athlete.updatedAt);
    setDraft(thresholdsToDraft(athlete.thresholds));
  }

  if (!athlete) {
    return (
      <Screen className="items-center justify-center">
        <Text muted>{t('profile.loadingProfile')}</Text>
      </Screen>
    );
  }

  const onSave = async () => {
    setSaving(true);
    const patch: ThresholdValues = {};
    for (const f of FIELDS) {
      const raw = draft[f.key];
      if (raw !== '' && raw != null) patch[f.key] = Number(raw);
    }
    await updateThresholds(patch);
    setSaving(false);
  };

  const swimZones = calcSwimPaceZones(athlete.thresholds);

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-lg py-sm">
        <View>
          <Text variant="title">{athlete.name}</Text>
          <Text variant="caption" muted>
            {athlete.disciplines.map((d) => t(`sport.${d}`)).join(' · ')}
          </Text>
        </View>
        <Ionicons name="person-circle-outline" size={36} color={palette.brand} />
      </View>

      <ScrollView contentContainerClassName="p-lg gap-lg pb-24">
        <View className="gap-sm">
          <Text variant="heading">{t('profile.thresholds')}</Text>
          {FIELDS.map((f) => (
            <View
              key={f.key}
              className="flex-row items-center justify-between rounded-md border border-border bg-surface px-md py-2 dark:border-border-dark dark:bg-surface-dark">
              <View className="flex-1">
                <Text variant="label">{t(f.labelKey)}</Text>
                <Text variant="caption" muted>
                  {t(f.hintKey)}
                  {(f.key === 'runThresholdPaceSecPerKm' || f.key === 'cssSecPer100m') &&
                  draft[f.key]
                    ? ` · ${formatPace(Number(draft[f.key]))}`
                    : ''}
                </Text>
              </View>
              <TextInput
                value={draft[f.key] ?? ''}
                onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                keyboardType="number-pad"
                className="w-20 rounded-md border border-border bg-bg px-sm py-1.5 text-right text-base text-fg dark:border-border-dark dark:bg-bg-dark dark:text-fg-dark"
              />
            </View>
          ))}
          <Button label={t('profile.saveZones')} onPress={onSave} loading={saving} />
        </View>

        <View className="gap-sm">
          <Text variant="heading">{t('profile.calculatedZones')}</Text>
          <ZoneTable title={t('profile.zonesHr')} zones={athlete.hrZones} unit="bpm" />
          <ZoneTable title={t('profile.zonesPower')} zones={athlete.powerZones} unit="w" />
          <ZoneTable
            title={t('profile.zonesRunPace')}
            zones={athlete.runPaceZones}
            unit="pace"
            paceSuffix="/km"
          />
          <ZoneTable
            title={t('profile.zonesSwimPace')}
            zones={swimZones}
            unit="pace"
            paceSuffix="/100m"
          />
        </View>

        <View className="gap-sm">
          <Text variant="heading">{t('profile.language')}</Text>
          <View className="flex-row flex-wrap gap-sm">
            {SUPPORTED_LOCALES.map((loc) => {
              const on = loc === locale;
              return (
                <Button
                  key={loc}
                  label={LOCALE_LABELS[loc]}
                  variant={on ? 'primary' : 'secondary'}
                  onPress={() => void setLocale(loc)}
                />
              );
            })}
          </View>
        </View>

        {isCoach ? (
          <View className="gap-sm">
            <Text variant="heading">{t('profile.coaching')}</Text>
            <Card
              onPress={() => router.push('/coach')}
              className="flex-row items-center gap-md">
              <Ionicons name="people-outline" size={22} color={palette.brand} />
              <View className="flex-1">
                <Text variant="label">{t('profile.coachingAthletes')}</Text>
                <Text variant="caption" muted>
                  {t('profile.coachingSubtitle')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
            </Card>
          </View>
        ) : null}

        <View className="gap-sm">
          <Text variant="heading">{t('profile.connections')}</Text>
          <Card onPress={() => router.push('/garmin')} className="flex-row items-center gap-md">
            <Ionicons name="watch-outline" size={22} color={palette.brand} />
            <View className="flex-1">
              <Text variant="label">{t('nav.garminConnect')}</Text>
              <Text variant="caption" muted>
                {garmin.status?.connected
                  ? t('profile.garminConnected', {
                      suffix: garmin.status.garminEmail
                        ? ` · ${garmin.status.garminEmail}`
                        : '',
                    })
                  : t('profile.garminNotConnected')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
          </Card>
        </View>

        <Button
          label={t('profile.viewTrends')}
          variant="secondary"
          onPress={() => router.push('/trends')}
        />
        <Button
          label={t('profile.resetDemo')}
          variant="ghost"
          onPress={() => {
            resetToSeed().catch((e) =>
              Alert.alert(
                t('profile.resetUnavailable'),
                e instanceof Error ? e.message : String(e),
              ),
            );
          }}
        />
        <Button label={t('profile.signOut')} variant="ghost" onPress={() => signOut()} />
        {/* TODO: implement weight/birthdate editing, discipline toggles, and manual zone overrides */}
      </ScrollView>
    </Screen>
  );
}
