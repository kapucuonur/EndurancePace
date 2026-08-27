/**
 * Small ID helper. `crypto.randomUUID` exists in Hermes on modern RN, but we
 * keep a fallback so the mock layer never throws in odd environments.
 */
export function uid(prefix = ''): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const base =
    g.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${base}` : base;
}
