/**
 * Sign-in / sign-up against the backend's `/auth/*` routes. Stores the JWT via
 * `session.ts`. In mock mode a placeholder token is stored so the auth gate
 * lets the app through without a real server.
 */

import { API_BASE_URL, USE_MOCK_API } from '@/services/config';
import { apiFetch, clearToken, saveToken } from '@/services/session';

const MOCK_TOKEN = 'mock-session';

export async function signIn(email: string, password: string): Promise<void> {
  if (USE_MOCK_API) {
    await saveToken(MOCK_TOKEN);
    return;
  }
  const { token } = await apiFetch<{ token: string }>(API_BASE_URL, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  await saveToken(token);
}

export async function signUp(email: string, password: string, name?: string): Promise<void> {
  if (USE_MOCK_API) {
    await saveToken(MOCK_TOKEN);
    return;
  }
  await apiFetch(API_BASE_URL, '/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      ...(name?.trim() ? { name: name.trim() } : {}),
    }),
  });
  await signIn(email, password);
}

export async function signOut(): Promise<void> {
  await clearToken();
}
