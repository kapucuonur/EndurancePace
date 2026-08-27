/**
 * Runtime API config, from `EXPO_PUBLIC_*` env vars (see `.env`).
 * `process.env.EXPO_PUBLIC_*` is statically inlined by Metro at bundle time —
 * restart the dev server after changing `.env`.
 */

export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://endurancepace-api.coachonurai.com';
