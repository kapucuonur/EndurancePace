import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatDuration, formatPace } from '@/lib/format';
import { useAppStore, useAthlete, useGarmin } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';
import type { GarminMetrics, ThresholdValues } from '@/types/domain';

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

type ThreshKey = keyof GarminMetrics['thresholds'];

const THRESH_META: Record<ThreshKey, { label: string; fmt: (n: number) => string }> = {
  ftpWatts: { label: 'Bike FTP', fmt: (n) => `${n} W` },
  thresholdHr: { label: 'Threshold HR', fmt: (n) => `${n} bpm` },
  runThresholdPaceSecPerKm: { label: 'Run threshold pace', fmt: (n) => `${formatPace(n)} /km` },
};

export default function GarminScreen() {
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
    Alert.alert('Disconnect Garmin?', 'Imported workouts stay. You can reconnect any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
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
            <Text variant="title">Garmin Connect</Text>
            <Text variant="caption" muted>
              Pull completed activities into your calendar
            </Text>
          </View>
        </View>

        {/* Status */}
        {loading && !status ? (
          <Text muted>Checking connection…</Text>
        ) : (
          <View className="gap-sm rounded-lg border border-border bg-surface p-lg dark:border-border-dark dark:bg-surface-dark">
            <View className="flex-row items-center gap-sm">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: connected ? palette.success : palette.textFaint }}
              />
              <Text variant="label">{connected ? 'Connected' : 'Not connected'}</Text>
            </View>
            {connected ? (
              <>
                <Text variant="caption" muted>
                  {status?.displayName || status?.garminEmail}
                </Text>
                <Text variant="caption" muted>
                  Last sync: {timeAgo(status?.lastSyncAt ?? null)}
                </Text>
              </>
            ) : null}
            {cooldown > 0 ? (
              <Text variant="caption" className="text-warning">
                Garmin is rate-limiting logins. Try again in ~{Math.ceil(cooldown / 60)}m.
              </Text>
            ) : null}
            {status?.lastError && status.state === 'error' ? (
              <Text variant="caption" className="text-warning">
                Last error: {status.lastError}
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
            <Text variant="heading">Enter the code</Text>
            <Text variant="caption" muted>
              Garmin just sent a one-time code to your email or phone. Enter it to finish
              connecting.
            </Text>
            <Field
              label="Verification code"
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
            <Button
              label="Verify & connect"
              onPress={onVerify}
              loading={busy}
              disabled={code.trim().length < 4 || busy}
            />
            <Button label="Start over" variant="ghost" onPress={onStartOver} />
          </View>
        ) : !connected ? (
          <View className="gap-md">
            {/* Privacy note — shown BEFORE any credentials are entered. */}
            <View className="gap-xs rounded-lg border border-border bg-brand-tint p-md dark:border-border-dark dark:bg-surface-alt-dark">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="lock-closed" size={14} color={palette.brand} />
                <Text variant="label">Before you sign in</Text>
              </View>
              <Text variant="caption" muted>
                Garmin has no third-party sign-in for this, so EndurancePace signs in with your
                Garmin.com email and password directly. They are sent over HTTPS to your
                EndurancePace server, stored encrypted, and used only to read your activities.
                Disconnecting deletes them.
              </Text>
            </View>

            <Field
              label="Garmin email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label="Garmin password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your Garmin.com password"
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              label="Connect"
              onPress={onConnect}
              loading={busy}
              disabled={email.trim().length < 4 || password.length < 1 || busy || cooldown > 0}
            />
          </View>
        ) : (
          <View className="gap-md">
            <Button
              label="Sync now"
              onPress={() => void garminSync()}
              loading={busy}
              disabled={busy || cooldown > 0}
            />
            <Text variant="caption" muted className="text-center">
              Imports the last 30 days. Runs only when you tap it.
            </Text>

            {lastSync?.status === 'ok' ? (
              <View className="gap-xs rounded-md border border-border bg-surface p-md dark:border-border-dark dark:bg-surface-dark">
                <Text variant="label">Last sync</Text>
                <Text variant="caption" muted>
                  {lastSync.imported} imported · {lastSync.matched} matched to plan ·{' '}
                  {lastSync.updated} updated
                  {lastSync.skipped ? ` · ${lastSync.skipped} skipped` : ''}
                </Text>
              </View>
            ) : null}
            {lastSync?.status === 'skipped' ? (
              <Text variant="caption" muted className="text-center">
                Synced very recently — give it a minute and try again.
              </Text>
            ) : null}

            <View className="mt-md gap-sm border-t border-border pt-md dark:border-border-dark">
              <Text variant="heading">Training thresholds</Text>
              {metrics ? (
                <ThresholdImport
                  metrics={metrics}
                  current={athlete?.thresholds ?? {}}
                  busy={busy}
                  onApply={async (patch) => {
                    await updateThresholds(patch);
                    Alert.alert('Applied', 'Thresholds updated and zones recalculated.');
                  }}
                />
              ) : (
                <>
                  <Text variant="caption" muted>
                    Pull FTP, threshold HR and run threshold pace from Garmin. You choose which
                    to keep before anything changes.
                  </Text>
                  <Button
                    label="Import from Garmin"
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
                <Text variant="label">Garmin insights</Text>
                {metrics.insights.vo2MaxRunning ? (
                  <Text variant="caption" muted>
                    VO₂max — run {metrics.insights.vo2MaxRunning}
                    {metrics.insights.vo2MaxCycling
                      ? ` · bike ${metrics.insights.vo2MaxCycling}`
                      : ''}
                  </Text>
                ) : null}
                {metrics.insights.racePredictions ? (
                  <Text variant="caption" muted>
                    Race predictions — {racePred(metrics.insights.racePredictions)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Button label="Disconnect Garmin" variant="ghost" onPress={onDisconnect} />
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
  metrics,
  current,
  busy,
  onApply,
}: {
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
        Garmin didn&apos;t return any thresholds for this account. Enter them on your profile
        instead.
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
              <Text variant="label">{THRESH_META[k].label}</Text>
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
        label={picked.size ? `Apply ${picked.size} to profile` : 'Select at least one'}
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
