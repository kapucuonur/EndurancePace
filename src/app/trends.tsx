import { useMemo } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { buildLoadSeries } from '@/domain/trends';
import { useAppStore } from '@/store/useAppStore';
import { palette, sportColors } from '@/theme/tokens';

/**
 * Fitness / Fatigue / Form trend.
 *
 * NOTE: `victory-native` (v42, Skia-based) is installed for this screen. It
 * needs a custom dev build (Skia native module), so this placeholder renders
 * the same PMC series with `react-native-svg`, which runs in Expo Go today.
 * To switch: replace `<PmcChart>` below with a `<CartesianChart>` from
 * `victory-native` — the `series` data shape is already what it expects.
 */
export default function TrendsScreen() {
  const workouts = useAppStore((s) => s.workouts);
  const series = useMemo(() => buildLoadSeries(workouts), [workouts]);
  const { width } = useWindowDimensions();

  const last = series[series.length - 1];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerClassName="p-lg gap-lg">
        <Text variant="title">Fitness Trends</Text>
        <Text variant="caption" muted>
          Performance Management Chart — CTL (fitness), ATL (fatigue), TSB (form).
        </Text>

        <View className="flex-row gap-md">
          <Stat
            label="Fitness (CTL)"
            value={String(Math.round(last?.ctl ?? 0))}
            color={palette.brand}
          />
          <Stat
            label="Fatigue (ATL)"
            value={String(Math.round(last?.atl ?? 0))}
            color={sportColors.bike}
          />
          <Stat
            label="Form (TSB)"
            value={String(Math.round(last?.tsb ?? 0))}
            color={sportColors.run}
          />
        </View>

        <PmcChart series={series} width={width - 32} />

        <View className="flex-row gap-md">
          <Legend label="CTL" color={palette.brand} />
          <Legend label="ATL" color={sportColors.bike} />
          <Legend label="Daily TSS" color={palette.border} />
        </View>

        {/* TODO: implement date-range selector, per-sport breakdown, and swap in victory-native on a dev build */}
      </ScrollView>
    </Screen>
  );
}

function PmcChart({
  series,
  width,
}: {
  series: ReturnType<typeof buildLoadSeries>;
  width: number;
}) {
  const height = 220;
  const pad = 24;
  const maxLoad = Math.max(60, ...series.map((p) => Math.max(p.ctl, p.atl, p.tss)));
  const x = (i: number) => pad + (i / (series.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - (v / maxLoad) * (height - pad * 2);

  const line = (key: 'ctl' | 'atl') =>
    series
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`)
      .join(' ');

  return (
    <View className="rounded-lg border border-border bg-surface p-sm dark:border-border-dark dark:bg-surface-dark">
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((f) => (
          <Line
            key={f}
            x1={pad}
            x2={width - pad}
            y1={pad + f * (height - pad * 2)}
            y2={pad + f * (height - pad * 2)}
            stroke={palette.border}
            strokeWidth={1}
          />
        ))}
        {series.map((p, i) =>
          p.tss > 0 ? (
            <Rect
              key={p.date}
              x={x(i) - 1.5}
              y={y(p.tss)}
              width={3}
              height={height - pad - y(p.tss)}
              fill={palette.textFaint}
              opacity={0.5}
            />
          ) : null,
        )}
        <Path d={line('atl')} stroke={sportColors.bike} strokeWidth={2} fill="none" />
        <Path d={line('ctl')} stroke={palette.brand} strokeWidth={2.5} fill="none" />
      </Svg>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 rounded-lg bg-surface p-md dark:bg-surface-dark">
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="title" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <View className="h-2 w-4 rounded-full" style={{ backgroundColor: color }} />
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}
