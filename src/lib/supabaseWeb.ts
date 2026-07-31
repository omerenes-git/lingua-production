const SUPABASE_URL = 'https://nqmmlhrkhafwrfhwljdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WopUD0nNEX6VwqJzIlNEwQ_DaiBQZyp';
const SESSION_STORAGE_KEY = 'lingua_supabase_session_v1';

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
  user?: {
    id?: string;
    email?: string;
  };
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
  if (
    !data.access_token ||
    !data.refresh_token ||
    !data.user?.id
  ) {
    return null;
  }

  const expiresAt =
    typeof data.expires_at === 'number'
      ? data.expires_at
      : Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type ?? 'bearer',
    expires_at: expiresAt,
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
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function storeSession(session: WebSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function authErrorMessage(data: AuthResponse, status: number): string {
  const providerMessage =
    data.error_description || data.msg || data.message || data.error;

  if (status === 400 || status === 401) {
    return 'E-posta veya şifre doğru değil.';
  }

  return providerMessage || 'Oturum açılamadı. Lütfen tekrar dene.';
}

export async function signInWithPassword(
  email: string,
  password: string,
  fetchImpl: FetchImplementation = globalThis.fetch,
): Promise<{ session: WebSession | null; error: string | null }> {
  try {
    const response = await fetchImpl(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: email.trim(), password }),
      },
    );

    const data = (await response.json()) as AuthResponse;
    if (!response.ok) {
      return { session: null, error: authErrorMessage(data, response.status) };
    }

    const session = normalizeSession(data);
    if (!session) {
      return {
        session: null,
        error: 'Sunucudan geçerli bir oturum alınamadı.',
      };
    }

    storeSession(session);
    return { session, error: null };
  } catch {
    return {
      session: null,
      error: 'Supabase bağlantısı kurulamadı. İnternet bağlantını kontrol et.',
    };
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
  if (!refreshed) clearSession();
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
    // Yerel oturum zaten temizlendi; ağ hatası çıkışı engellemez.
  }
}

function isLegacyApiRequest(input: RequestInfo | URL): string | null {
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (raw.startsWith('/api/')) return raw.split('?')[0] ?? raw;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
      return url.pathname;
    }
  } catch {
    return null;
  }

  return null;
}

export function installLegacyApiBridge(): void {
  if (typeof window === 'undefined') return;
  const bridgeFlag = '__linguaLegacyApiBridgeInstalled';
  const flaggedWindow = window as typeof window & Record<string, unknown>;
  if (flaggedWindow[bridgeFlag]) return;

  const nativeFetch = window.fetch.bind(window);
  flaggedWindow[bridgeFlag] = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const action = isLegacyApiRequest(input);
    if (!action) return nativeFetch(input, init);

    const session = await getValidSession(nativeFetch);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Supabase oturumu gerekli.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    let payload: unknown = {};
    if (typeof init?.body === 'string' && init.body.trim()) {
      try {
        payload = JSON.parse(init.body);
      } catch {
        return new Response(JSON.stringify({ error: 'Geçersiz JSON isteği.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return nativeFetch(`${SUPABASE_URL}/functions/v1/lingua-web-api`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });
  };
}
