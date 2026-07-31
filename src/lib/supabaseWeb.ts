const SUPABASE_URL = 'https://nqmmlhrkhafwrfhwljdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WopUD0nNEX6VwqJzIlNEwQ_DaiBQZyp';
const SESSION_STORAGE_KEY = 'lingua_supabase_session_v1';
export const AUTH_REQUIRED_EVENT = 'lingua:auth-required';

export interface WebSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number;
  user: {
    id: string;
    email?: string;
  };
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id?: string; email?: string };
  id?: string;
  email?: string;
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
}

type FetchImplementation = typeof globalThis.fetch;

function authHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    'Content-Type': 'application/json',
  };
}

function normalizeSession(data: AuthResponse): WebSession | null {
  if (!data.access_token || !data.refresh_token || !data.user?.id) return null;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type ?? 'bearer',
    expires_at:
      typeof data.expires_at === 'number'
        ? data.expires_at
        : Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user: {
      id: data.user.id,
      ...(data.user.email ? { email: data.user.email } : {}),
    },
  };
}

function readStoredSession(): WebSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebSession;
    if (
      !parsed.access_token ||
      !parsed.refresh_token ||
      !parsed.user?.id ||
      typeof parsed.expires_at !== 'number'
    ) {
      clearSession();
      return null;
    }
    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

function storeSession(session: WebSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function providerError(data: AuthResponse, fallback: string): string {
  return data.error_description || data.msg || data.message || data.error || fallback;
}

function notifyAuthRequired(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
}

function cleanRecoveryUrl(): void {
  if (typeof window === 'undefined') return;
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

async function fetchUser(
  accessToken: string,
  fetchImpl: FetchImplementation,
): Promise<{ id: string; email?: string } | null> {
  try {
    const response = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        ...authHeaders(),
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as AuthResponse;
    if (!data.id) return null;
    return { id: data.id, ...(data.email ? { email: data.email } : {}) };
  } catch {
    return null;
  }
}

export async function consumeRecoverySessionFromUrl(
  fetchImpl: FetchImplementation = globalThis.fetch,
): Promise<{ session: WebSession | null; isRecovery: boolean; error: string | null }> {
  if (typeof window === 'undefined') return { session: null, isRecovery: false, error: null };

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);
  const type = hashParams.get('type') || queryParams.get('type');
  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const errorDescription =
    hashParams.get('error_description') ||
    queryParams.get('error_description') ||
    hashParams.get('error') ||
    queryParams.get('error');

  if (type !== 'recovery' && !accessToken) return { session: null, isRecovery: false, error: null };

  if (errorDescription) {
    cleanRecoveryUrl();
    return { session: null, isRecovery: true, error: decodeURIComponent(errorDescription) };
  }

  if (!accessToken || !refreshToken) {
    cleanRecoveryUrl();
    return {
      session: null,
      isRecovery: true,
      error: 'Parola sıfırlama bağlantısındaki oturum bilgisi eksik veya süresi dolmuş.',
    };
  }

  const user = await fetchUser(accessToken, fetchImpl);
  if (!user) {
    cleanRecoveryUrl();
    return {
      session: null,
      isRecovery: true,
      error: 'Parola sıfırlama oturumu doğrulanamadı. Yeni bir bağlantı isteyin.',
    };
  }

  const expiresIn = Number(hashParams.get('expires_in') || queryParams.get('expires_in') || 3600);
  const session: WebSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: hashParams.get('token_type') || queryParams.get('token_type') || 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
    user,
  };

  storeSession(session);
  cleanRecoveryUrl();
  return { session, isRecovery: true, error: null };
}

export async function updatePassword(
  password: string,
  session: WebSession,
  fetchImpl: FetchImplementation = globalThis.fetch,
): Promise<{ error: string | null }> {
  if (password.length < 8) return { error: 'Yeni şifre en az 8 karakter olmalı.' };

  try {
    const response = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        ...authHeaders(),
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json().catch(() => ({}))) as AuthResponse;
    if (!response.ok) return { error: providerError(data, 'Yeni şifre kaydedilemedi.') };
    return { error: null };
  } catch {
    return { error: 'Şifre güncelleme servisine ulaşılamadı.' };
  }
}

export async function signInWithPassword(
  email: string,
  password: string,
  fetchImpl: FetchImplementation = globalThis.fetch,
): Promise<{ session: WebSession | null; error: string | null }> {
  try {
    const response = await fetchImpl(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = (await response.json().catch(() => ({}))) as AuthResponse;

    if (!response.ok) {
      return {
        session: null,
        error:
          response.status === 400 || response.status === 401
            ? 'E-posta veya şifre doğru değil.'
            : providerError(data, 'Oturum açılamadı.'),
      };
    }

    const session = normalizeSession(data);
    if (!session) return { session: null, error: 'Sunucudan geçerli bir oturum alınamadı.' };

    storeSession(session);
    return { session, error: null };
  } catch {
    return {
      session: null,
      error: 'Supabase bağlantısı kurulamadı. İnternet bağlantını kontrol et.',
    };
  }
}

export async function requestPasswordReset(
  email: string,
  redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`,
  fetchImpl: FetchImplementation = globalThis.fetch,
): Promise<{ error: string | null }> {
  try {
    const response = await fetchImpl(
      `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: email.trim() }),
      },
    );
    const data = (await response.json().catch(() => ({}))) as AuthResponse;

    if (!response.ok) {
      return { error: providerError(data, 'Parola sıfırlama e-postası gönderilemedi.') };
    }
    return { error: null };
  } catch {
    return { error: 'Parola sıfırlama servisine ulaşılamadı.' };
  }
}

async function refreshSession(
  session: WebSession,
  fetchImpl: FetchImplementation,
): Promise<WebSession | null> {
  try {
    const response = await fetchImpl(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      },
    );
    if (!response.ok) return null;

    const refreshed = normalizeSession((await response.json()) as AuthResponse);
    if (!refreshed) return null;
    storeSession(refreshed);
    return refreshed;
  } catch {
    return null;
  }
}

export async function getValidSession(
  fetchImpl: FetchImplementation = globalThis.fetch,
): Promise<WebSession | null> {
  const session = readStoredSession();
  if (!session) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (session.expires_at > nowSeconds + 60) return session;

  const refreshed = await refreshSession(session, fetchImpl);
  if (!refreshed) {
    clearSession();
    notifyAuthRequired();
  }
  return refreshed;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function signOut(
  fetchImpl: FetchImplementation = globalThis.fetch,
): Promise<void> {
  const session = readStoredSession();
  clearSession();

  if (!session) return;
  try {
    await fetchImpl(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    // Yerel oturum zaten temizlendi.
  }
}

function legacyApiPath(input: RequestInfo | URL): string | null {
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (raw.startsWith('/api/')) return raw.split('?')[0] ?? raw;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) return url.pathname;
  } catch {
    return null;
  }
  return null;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function installLegacyApiBridge(): void {
  if (typeof window === 'undefined') return;

  const bridgeFlag = '__linguaLegacyApiBridgeInstalled';
  const flaggedWindow = window as typeof window & Record<string, unknown>;
  if (flaggedWindow[bridgeFlag]) return;

  const nativeFetch = window.fetch.bind(window);
  flaggedWindow[bridgeFlag] = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const action = legacyApiPath(input);
    if (!action) return nativeFetch(input, init);

    const session = await getValidSession(nativeFetch);
    if (!session) {
      notifyAuthRequired();
      return jsonError('Oturum süresi doldu. Yeniden giriş yap.', 401);
    }

    let payload: unknown = {};
    if (typeof init?.body === 'string' && init.body.trim()) {
      try {
        payload = JSON.parse(init.body);
      } catch {
        return jsonError('Geçersiz JSON isteği.', 400);
      }
    }

    const response = await nativeFetch(`${SUPABASE_URL}/functions/v1/lingua-web-api`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (response.status === 401 || response.status === 403) {
      clearSession();
      notifyAuthRequired();
    }
    return response;
  };
}
