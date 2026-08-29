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
import { formatPace } from '@/lib/format';
import { useAppStore, useAthlete, useGarmin } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';
import type { ThresholdValues } from '@/types/domain';

type FieldKey = keyof ThresholdValues;

function thresholdsToDraft(t: ThresholdValues | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = t?.[f.key];
    next[f.key] = v != null ? String(v) : '';
  }
  return next;
}

const FIELDS: { key: FieldKey; label: string; hint: string }[] = [
  { key: 'ftpWatts', label: 'Bike FTP', hint: 'watts' },
  { key: 'runThresholdPaceSecPerKm', label: 'Run threshold pace', hint: 'sec/km' },
  { key: 'cssSecPer100m', label: 'Swim CSS', hint: 'sec/100m' },
  { key: 'thresholdHr', label: 'Threshold HR (LTHR)', hint: 'bpm' },
  { key: 'maxHr', label: 'Max HR', hint: 'bpm' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const athlete = useAthlete();
  const updateThresholds = useAppStore((s) => s.updateThresholds);
  const resetToSeed = useAppStore((s) => s.resetToSeed);
  const signOut = useAppStore((s) => s.signOut);
  const garmin = useGarmin();
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
        <Text muted>Loading profile…</Text>
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
            {athlete.disciplines.join(' · ')}
          </Text>
        </View>
        <Ionicons name="person-circle-outline" size={36} color={palette.brand} />
      </View>

      <ScrollView contentContainerClassName="p-lg gap-lg pb-24">
        <View className="gap-sm">
          <Text variant="heading">Thresholds</Text>
          {FIELDS.map((f) => (
            <View
              key={f.key}
              className="flex-row items-center justify-between rounded-md border border-border bg-surface px-md py-2 dark:border-border-dark dark:bg-surface-dark">
              <View className="flex-1">
                <Text variant="label">{f.label}</Text>
                <Text variant="caption" muted>
                  {f.hint}
                  {(f.key === 'runThresholdPaceSecPerKm' || f.key === 'cssSecPer100m') &&
                  draft[f.key]
                    ? ` · ${formatPace(Number(draft[f.key]))}`
                    : ''}
                </Text>
              </View>
              <TextInput
                value={draft[f.key] ?? ''}
                onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))}
                keyboardType="number-pad"
                className="w-20 rounded-md border border-border bg-bg px-sm py-1.5 text-right text-base text-fg dark:border-border-dark dark:bg-bg-dark dark:text-fg-dark"
              />
            </View>
          ))}
          <Button label="Save & recalculate zones" onPress={onSave} loading={saving} />
        </View>

        <View className="gap-sm">
          <Text variant="heading">Calculated Zones</Text>
          <ZoneTable title="Heart Rate (from LTHR)" zones={athlete.hrZones} unit="bpm" />
          <ZoneTable title="Power (from FTP)" zones={athlete.powerZones} unit="w" />
          <ZoneTable
            title="Run Pace (from threshold pace)"
            zones={athlete.runPaceZones}
            unit="pace"
            paceSuffix="/km"
          />
          <ZoneTable
            title="Swim Pace (from CSS)"
            zones={swimZones}
            unit="pace"
            paceSuffix="/100m"
          />
        </View>

        <View className="gap-sm">
          <Text variant="heading">Connections</Text>
          <Card onPress={() => router.push('/garmin')} className="flex-row items-center gap-md">
            <Ionicons name="watch-outline" size={22} color={palette.brand} />
            <View className="flex-1">
              <Text variant="label">Garmin Connect</Text>
              <Text variant="caption" muted>
                {garmin.status?.connected
                  ? `Connected${garmin.status.garminEmail ? ` · ${garmin.status.garminEmail}` : ''}`
                  : 'Not connected · import your activities'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
          </Card>
        </View>

        <Button
          label="View fitness trends"
          variant="secondary"
          onPress={() => router.push('/trends')}
        />
        <Button
          label="Reset demo data"
          variant="ghost"
          onPress={() => {
            resetToSeed().catch((e) =>
              Alert.alert('Reset unavailable', e instanceof Error ? e.message : String(e)),
            );
          }}
        />
        <Button label="Sign out" variant="ghost" onPress={() => signOut()} />
        {/* TODO: implement weight/birthdate editing, discipline toggles, and manual zone overrides */}
      </ScrollView>
    </Screen>
  );
}
