import { useCallback } from 'react';

import { i18n } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';

export type TranslateOptions = Record<string, unknown>;
export type TranslateFn = (key: string, opts?: TranslateOptions) => string;

/**
 * `const t = useT()` → `t('calendar.thisWeek')`. Re-renders the component when
 * the locale changes; the locale is passed straight to `i18n.t` so we never
 * mutate the shared instance from render. Calendar + date-fns wiring is handled
 * by `applyLocale`, which the store calls on boot and on every switch.
 */
export function useT(): TranslateFn {
  const locale = useAppStore((s) => s.locale);
  return useCallback(
    (key: string, opts?: TranslateOptions) => i18n.t(key, { ...opts, locale }),
    [locale],
  );
}
