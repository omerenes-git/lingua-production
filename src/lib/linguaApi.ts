import { AUTH_REQUIRED_EVENT, clearSession, getValidSession } from './supabaseWeb';

const SUPABASE_URL = 'https://nqmmlhrkhafwrfhwljdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WopUD0nNEX6VwqJzIlNEwQ_DaiBQZyp';

interface ApiErrorBody {
  error?: string;
  message?: string;
}

function notifyAuthRequired(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error || body.message || `İstek başarısız (${response.status}).`;
  } catch {
    return `İstek başarısız (${response.status}).`;
  }
}

export async function callLinguaApi<TResponse>(action: string, payload: unknown): Promise<TResponse> {
  const session = await getValidSession();
  if (!session) {
    notifyAuthRequired();
    throw new Error('Oturum süresi doldu. Yeniden giriş yapın.');
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/lingua-web-api`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });
  } catch {
    throw new Error('Sunucu bağlantısı kurulamadı. İnternet bağlantısını kontrol edin.');
  }

  if (response.status === 401 || response.status === 403) {
    clearSession();
    notifyAuthRequired();
  }

  if (!response.ok) throw new Error(await readError(response));

  try {
    return (await response.json()) as TResponse;
  } catch {
    throw new Error('Sunucu geçerli JSON yanıtı döndürmedi.');
  }
}
