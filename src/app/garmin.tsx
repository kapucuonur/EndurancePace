import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT, type TranslateFn } from '@/i18n/useT';
import { formatDuration, formatPace } from '@/lib/format';
import { useAppStore, useAthlete, useGarmin } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';
import type { GarminMetrics, ThresholdValues } from '@/types/domain';

function timeAgo(iso: string | null, t: TranslateFn): string {
  if (!iso) return t('time.never');
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return t('time.justNow');
  const mins = Math.round(secs / 60);
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return t('time.hoursAgo', { count: hrs });
  return t('time.daysAgo', { count: Math.round(hrs / 24) });
}

type ThreshKey = keyof GarminMetrics['thresholds'];

const THRESH_META: Record<ThreshKey, { labelKey: string; fmt: (n: number) => string }> = {
  ftpWatts: { labelKey: 'garmin.threshBikeFtp', fmt: (n) => `${n} W` },
  thresholdHr: { labelKey: 'garmin.threshHr', fmt: (n) => `${n} bpm` },
  runThresholdPaceSecPerKm: {
    labelKey: 'garmin.threshRunPace',
    fmt: (n) => `${formatPace(n)} /km`,
  },
};

export default function GarminScreen() {
  const t = useT();
  const garmin = useGarmin();
  const athlete = useAthlete();
  const loadGarminStatus = useAppStore((s) => s.loadGarminStatus);
  const garminConnect = useAppStore((s) => s.garminConnect);
  const garminCompleteMfa = useAppStore((s) => s.garminCompleteMfa);
  const garminDisconnect = useAppStore((s) => s.garminDisconnect);
  const garminSync = useAppStore((s) => s.garminSync);
  const garminFetchMetrics = useAppStore((s) => s.garminFetchMetrics);
  const updateThresholds = useAppStore((s) => s.updateThresholds);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    void loadGarminStatus();
  }, [loadGarminStatus]);

  const { status, loading, busy, needsMfa, lastSync, metrics, error } = garmin;
  const connected = status?.connected ?? false;
  const cooldown = status?.cooldownRemaining ?? 0;

  const onConnect = async () => {
    await garminConnect(email.trim(), password);
    setPassword('');
  };

  const onVerify = async () => {
    await garminCompleteMfa(code.trim());
    setCode('');
  };

  const onStartOver = async () => {
    setCode('');
    setPassword('');
    await garminDisconnect();
  };

  const onDisconnect = () => {
    Alert.alert(t('garmin.disconnectTitle'), t('garmin.disconnectBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('garmin.disconnect'),
        style: 'destructive',
        onPress: () => {
          setEmail('');
          setPassword('');
          setCode('');
          void garminDisconnect();
        },
      },
    ]);
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerClassName="p-lg gap-lg pb-24"
        keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-md">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand">
            <Ionicons name="watch-outline" size={24} color="#fff" />
          </View>
          <View className="flex-1">
            <Text variant="title">{t('garmin.title')}</Text>
            <Text variant="caption" muted>
              {t('garmin.subtitle')}
            </Text>
          </View>
        </View>

        {/* Status */}
        {loading && !status ? (
          <Text muted>{t('garmin.checking')}</Text>
        ) : (
          <View className="gap-sm rounded-lg border border-border bg-surface p-lg dark:border-border-dark dark:bg-surface-dark">
            <View className="flex-row items-center gap-sm">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: connected ? palette.success : palette.textFaint }}
              />
              <Text variant="label">
                {connected ? t('garmin.connected') : t('garmin.notConnected')}
              </Text>
            </View>
            {connected ? (
              <>
                <Text variant="caption" muted>
                  {status?.displayName || status?.garminEmail}
                </Text>
                <Text variant="caption" muted>
                  {t('garmin.lastSync', { time: timeAgo(status?.lastSyncAt ?? null, t) })}
                </Text>
              </>
            ) : null}
            {cooldown > 0 ? (
              <Text variant="caption" className="text-warning">
                {t('garmin.rateLimited', { minutes: Math.ceil(cooldown / 60) })}
              </Text>
            ) : null}
            {status?.lastError && status.state === 'error' ? (
              <Text variant="caption" className="text-warning">
                {t('garmin.lastError', { error: status.lastError })}
              </Text>
            ) : null}
          </View>
        )}

        {error ? (
          <View className="flex-row items-center gap-xs rounded-md bg-danger/10 px-md py-2">
            <Ionicons name="alert-circle" size={15} color={palette.danger} />
            <Text variant="caption" className="flex-1 text-danger">
              {error}
            </Text>
          </View>
        ) : null}

        {/* MFA step */}
        {needsMfa ? (
          <View className="gap-md">
            <Text variant="heading">{t('garmin.enterCode')}</Text>
            <Text variant="caption" muted>
              {t('garmin.codeSubtitle')}
            </Text>
            <Field
              label={t('garmin.verificationCode')}
              value={code}
              onChangeText={setCode}
              placeholder={t('garmin.codePlaceholder')}
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
            <Button
              label={t('garmin.verifyConnect')}
              onPress={onVerify}
              loading={busy}
              disabled={code.trim().length < 4 || busy}
            />
            <Button label={t('garmin.startOver')} variant="ghost" onPress={onStartOver} />
          </View>
        ) : !connected ? (
          <View className="gap-md">
            {/* Privacy note — shown BEFORE any credentials are entered. */}
            <View className="gap-xs rounded-lg border border-border bg-brand-tint p-md dark:border-border-dark dark:bg-surface-alt-dark">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="lock-closed" size={14} color={palette.brand} />
                <Text variant="label">{t('garmin.beforeSignIn')}</Text>
              </View>
              <Text variant="caption" muted>
                {t('garmin.privacyNote')}
              </Text>
            </View>

            <Field
              label={t('garmin.garminEmail')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label={t('garmin.garminPassword')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('garmin.passwordPlaceholder')}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              label={t('garmin.connect')}
              onPress={onConnect}
              loading={busy}
              disabled={email.trim().length < 4 || password.length < 1 || busy || cooldown > 0}
            />
          </View>
        ) : (
          <View className="gap-md">
            <Button
              label={t('garmin.syncNow')}
              onPress={() => void garminSync()}
              loading={busy}
              disabled={busy || cooldown > 0}
            />
            <Text variant="caption" muted className="text-center">
              {t('garmin.syncNote')}
            </Text>

            {lastSync?.status === 'ok' ? (
              <View className="gap-xs rounded-md border border-border bg-surface p-md dark:border-border-dark dark:bg-surface-dark">
                <Text variant="label">{t('garmin.lastSyncLabel')}</Text>
                <Text variant="caption" muted>
                  {t('garmin.lastSyncResult', {
                    imported: lastSync.imported,
                    matched: lastSync.matched,
                    updated: lastSync.updated,
                  })}
                  {lastSync.skipped
                    ? t('garmin.skippedSuffix', { count: lastSync.skipped })
                    : ''}
                </Text>
              </View>
            ) : null}
            {lastSync?.status === 'skipped' ? (
              <Text variant="caption" muted className="text-center">
                {t('garmin.syncedRecently')}
              </Text>
            ) : null}

            <View className="mt-md gap-sm border-t border-border pt-md dark:border-border-dark">
              <Text variant="heading">{t('garmin.trainingThresholds')}</Text>
              {metrics ? (
                <ThresholdImport
                  t={t}
                  metrics={metrics}
                  current={athlete?.thresholds ?? {}}
                  busy={busy}
                  onApply={async (patch) => {
                    await updateThresholds(patch);
                    Alert.alert(
                      t('garmin.thresholdsApplied'),
                      t('garmin.thresholdsAppliedBody'),
                    );
                  }}
                />
              ) : (
                <>
                  <Text variant="caption" muted>
                    {t('garmin.thresholdsIntro')}
                  </Text>
                  <Button
                    label={t('garmin.importFromGarmin')}
                    variant="secondary"
                    onPress={() => void garminFetchMetrics()}
                    loading={busy}
                    disabled={busy || cooldown > 0}
                  />
                </>
              )}
            </View>

            {metrics && hasInsights(metrics.insights) ? (
              <View className="gap-xs rounded-md border border-border bg-surface p-md dark:border-border-dark dark:bg-surface-dark">
                <Text variant="label">{t('garmin.insights')}</Text>
                {metrics.insights.vo2MaxRunning ? (
                  <Text variant="caption" muted>
                    {t('garmin.vo2max', { run: metrics.insights.vo2MaxRunning })}
                    {metrics.insights.vo2MaxCycling
                      ? t('garmin.vo2maxBike', { bike: metrics.insights.vo2MaxCycling })
                      : ''}
                  </Text>
                ) : null}
                {metrics.insights.racePredictions ? (
                  <Text variant="caption" muted>
                    {t('garmin.racePredictions', {
                      value: racePred(metrics.insights.racePredictions),
                    })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Button label={t('garmin.disconnect')} variant="ghost" onPress={onDisconnect} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function hasInsights(i: GarminMetrics['insights']): boolean {
  return Boolean(i.vo2MaxRunning || i.vo2MaxCycling || i.racePredictions);
}

function racePred(r: NonNullable<GarminMetrics['insights']['racePredictions']>): string {
  const parts: string[] = [];
  if (r.time5K) parts.push(`5K ${formatDuration(r.time5K)}`);
  if (r.time10K) parts.push(`10K ${formatDuration(r.time10K)}`);
  if (r.timeHalfMarathon) parts.push(`HM ${formatDuration(r.timeHalfMarathon)}`);
  if (r.timeMarathon) parts.push(`M ${formatDuration(r.timeMarathon)}`);
  return parts.join(' · ');
}

/** Preview of Garmin's threshold values with a per-field toggle. */
function ThresholdImport({
  t,
  metrics,
  current,
  busy,
  onApply,
}: {
  t: TranslateFn;
  metrics: GarminMetrics;
  current: ThresholdValues;
  busy: boolean;
  onApply: (patch: ThresholdValues) => Promise<void>;
}) {
  const keys = (Object.keys(metrics.thresholds) as ThreshKey[]).filter(
    (k) => metrics.thresholds[k] != null,
  );
  const [picked, setPicked] = useState<Set<ThreshKey>>(() => new Set(keys));

  if (keys.length === 0) {
    return (
      <Text variant="caption" muted>
        {t('garmin.thresholdsMissing')}
      </Text>
    );
  }

  const toggle = (k: ThreshKey) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const apply = () => {
    const patch: ThresholdValues = {};
    for (const k of keys) if (picked.has(k)) patch[k] = metrics.thresholds[k];
    void onApply(patch);
  };

  return (
    <View className="gap-sm">
      {keys.map((k) => {
        const on = picked.has(k);
        const garminVal = metrics.thresholds[k] as number;
        const cur = current[k];
        return (
          <Pressable
            key={k}
            onPress={() => toggle(k)}
            className="flex-row items-center gap-md rounded-md border border-border bg-surface p-md dark:border-border-dark dark:bg-surface-dark">
            <Ionicons
              name={on ? 'checkbox' : 'square-outline'}
              size={20}
              color={on ? palette.brand : palette.textFaint}
            />
            <View className="flex-1">
              <Text variant="label">{t(THRESH_META[k].labelKey)}</Text>
              <Text variant="caption" muted>
                {cur != null ? `${THRESH_META[k].fmt(cur)}  →  ` : ''}
                <Text variant="caption" className="text-brand">
                  {THRESH_META[k].fmt(garminVal)}
                </Text>
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Button
        label={
          picked.size
            ? t('garmin.applyToProfile', { count: picked.size })
            : t('garmin.selectAtLeastOne')
        }
        onPress={apply}
        loading={busy}
        disabled={busy || picked.size === 0}
      />
    </View>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="gap-xs">
      <Text variant="label" muted>
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={palette.textFaint}
        className="rounded-md border border-border bg-bg px-md py-3 text-base text-fg dark:border-border-dark dark:bg-bg-dark dark:text-fg-dark"
      />
    </View>
  );
}
