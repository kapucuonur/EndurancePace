/**
 * Auth token storage + the authenticated `fetch` wrapper.
 *
 * The JWT lives in AsyncStorage and an in-memory mirror (for sync reads).
 * On a 401 the token is cleared and the registered `unauthorized` handler
 * fires — the store uses that to sign the user out, which the root layout's
 * gate turns into a redirect to /login.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'endurancepace:auth:token:v1';

let inMemoryToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function loadToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  try {
    inMemoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    inMemoryToken = null;
  }
  return inMemoryToken;
}

export function getTokenSync(): string | null {
  return inMemoryToken;
}

export async function saveToken(token: string): Promise<void> {
  inMemoryToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // in-memory token still serves this session
  }
}

export async function clearToken(): Promise<void> {
  inMemoryToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function setUnauthorizedHandler(cb: (() => void) | null): void {
  unauthorizedHandler = cb;
}

/** `fetch` + JSON + bearer token + uniform error handling. */
export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await loadToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    await clearToken();
    unauthorizedHandler?.();
    throw new ApiError(401, 'Your session expired. Please sign in again.');
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      detail = JSON.parse(text).detail ?? text;
    } catch {
      // keep raw text
    }
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}
