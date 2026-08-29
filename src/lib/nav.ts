import { router } from 'expo-router';

/**
 * `router.back()` that survives having no history to pop.
 *
 * A modal or detail screen reached by a deep link or a fresh web page load
 * (common on the static web build) has an empty back stack, so `router.back()`
 * silently no-ops — the user taps "Cancel"/"Save" and nothing happens. Fall
 * back to the tab root in that case.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
