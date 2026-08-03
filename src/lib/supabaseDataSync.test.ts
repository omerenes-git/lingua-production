import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLastSyncedAt, syncNow } from './supabaseDataSync';
import { getValidSession } from './supabaseWeb';

vi.mock('./supabaseWeb', () => ({
  getValidSession: vi.fn(),
}));

const SESSION = {
  access_token: 'token-123',
  refresh_token: 'refresh-123',
  token_type: 'bearer',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'user-1', email: 'test@example.com' },
};

interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Routes mocked fetch calls to GET/POST handlers and records every call made. */
function installFetchMock(handlers: {
  get: () => Response | Promise<Response>;
  post?: (body: unknown) => Response | Promise<Response>;
}): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url: String(url), method, body });
    if (method === 'GET') return handlers.get();
    if (method === 'POST') {
      if (!handlers.post) throw new Error('Bu testte POST beklenmiyordu');
      return handlers.post(body);
    }
    throw new Error(`Beklenmeyen HTTP metodu: ${method}`);
  });
  vi.stubGlobal('fetch', fn);
  return { calls };
}

function getUploadCalls(calls: FetchCall[]): FetchCall[] {
  return calls.filter((call) => call.method === 'POST');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(getValidSession).mockResolvedValue(SESSION as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reconcileWithCloud (via syncNow)', () => {
  it('bulutta hiç kayıt yoksa yerel başlangıç verisi buluta yükleniyor', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'local-item' }]));
    const { calls } = installFetchMock({
      get: () => jsonResponse(200, []),
      post: () => jsonResponse(201),
    });

    const resolution = await syncNow();

    expect(resolution).toBe('uploaded');
    expect(getUploadCalls(calls)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([
      { id: 'x', targetText: 'local-item' },
    ]);
    expect(getLastSyncedAt()).not.toBeNull();
  });

  it('bulut GET isteği 500 dönerse hiçbir upload yapılmıyor', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'local-item' }]));
    const { calls } = installFetchMock({ get: () => jsonResponse(500) });

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(getUploadCalls(calls)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([
      { id: 'x', targetText: 'local-item' },
    ]);
    expect(getLastSyncedAt()).toBeNull();
  });

  it('ağ hatasında hiçbir upload veya localStorage temizliği yapılmıyor', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'local-item' }]));
    localStorage.setItem('lingua_supabase_state_updated_at', '2025-01-01T00:00:00.000Z');
    const fn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fn);

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([
      { id: 'x', targetText: 'local-item' },
    ]);
    expect(localStorage.getItem('lingua_supabase_state_updated_at')).toBe('2025-01-01T00:00:00.000Z');
  });

  it.each([401, 403])('%i durumunda veri üzerine yazılmıyor', async (status) => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'local-item' }]));
    const { calls } = installFetchMock({ get: () => jsonResponse(status) });

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(getUploadCalls(calls)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([
      { id: 'x', targetText: 'local-item' },
    ]);
  });

  it.each([429, 503])('%i durumunda da veri üzerine yazılmıyor', async (status) => {
    const { calls } = installFetchMock({ get: () => jsonResponse(status) });

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(getUploadCalls(calls)).toHaveLength(0);
  });

  it('bulut daha yeniyse doğru birleşim yapılıyor', async () => {
    localStorage.setItem('lingua_local_state_updated_at', '2020-01-01T00:00:00.000Z');
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'a', targetText: 'local-value' }]));

    installFetchMock({
      get: () =>
        jsonResponse(200, [
          {
            state: { lingua_items: [{ id: 'a', targetText: 'cloud-value' }] },
            updated_at: '2030-01-01T00:00:00.000Z',
          },
        ]),
      post: () => jsonResponse(201),
    });

    await syncNow();

    expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([
      { id: 'a', targetText: 'cloud-value' },
    ]);
  });

  it('yerel veri daha yeniyse doğru birleşim yapılıyor', async () => {
    localStorage.setItem('lingua_local_state_updated_at', '2030-01-01T00:00:00.000Z');
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'a', targetText: 'local-value' }]));

    installFetchMock({
      get: () =>
        jsonResponse(200, [
          {
            state: { lingua_items: [{ id: 'a', targetText: 'cloud-value' }] },
            updated_at: '2020-01-01T00:00:00.000Z',
          },
        ]),
      post: () => jsonResponse(201),
    });

    await syncNow();

    expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([
      { id: 'a', targetText: 'local-value' },
    ]);
  });

  it('silinmiş kayıtların tombstone/version bilgisi korunuyor', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([]));
    localStorage.setItem(
      'lingua_sync_versions',
      JSON.stringify({ lingua_items: { a: { at: '2030-01-01T00:00:00.000Z', deleted: true } } }),
    );

    installFetchMock({
      get: () =>
        jsonResponse(200, [
          {
            state: { lingua_items: [{ id: 'a', targetText: 'still-in-cloud' }] },
            updated_at: '2020-01-01T00:00:00.000Z',
          },
        ]),
      post: () => jsonResponse(201),
    });

    await syncNow();

    expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([]);
    const versions = JSON.parse(localStorage.getItem('lingua_sync_versions')!);
    expect(versions.lingua_items.a).toEqual({ at: '2030-01-01T00:00:00.000Z', deleted: true });
  });

  it('iki cihazda değiştirilen farklı kayıtlar kaybolmadan birleşiyor', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'a', targetText: 'local-a' }]));
    localStorage.setItem(
      'lingua_sync_versions',
      JSON.stringify({ lingua_items: { a: { at: '2025-06-01T00:00:00.000Z' } } }),
    );

    installFetchMock({
      get: () =>
        jsonResponse(200, [
          {
            state: {
              lingua_items: [{ id: 'b', targetText: 'cloud-b' }],
              lingua_sync_versions: { lingua_items: { b: { at: '2025-06-02T00:00:00.000Z' } } },
            },
            updated_at: '2025-06-02T00:00:00.000Z',
          },
        ]),
      post: () => jsonResponse(201),
    });

    await syncNow();

    const items = JSON.parse(localStorage.getItem('lingua_items')!) as Array<{ id: string }>;
    expect(items.map((item) => item.id).sort()).toEqual(['a', 'b']);
  });

  it('boş yerel veri, geçici okuma hatası nedeniyle dolu bulut verisinin üzerine yazılmıyor', async () => {
    const { calls } = installFetchMock({ get: () => jsonResponse(500) });

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(getUploadCalls(calls)).toHaveLength(0);
    expect(localStorage.getItem('lingua_items')).toBeNull();
    expect(localStorage.getItem('lingua_sync_versions')).toBeNull();
  });

  it('upload başarısızsa son senkronizasyon zamanı başarılıymış gibi güncellenmiyor', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'local-item' }]));
    installFetchMock({
      get: () => jsonResponse(200, []),
      post: () => jsonResponse(500),
    });

    const resolution = await syncNow();

    expect(resolution).toBe('unchanged');
    expect(getLastSyncedAt()).toBeNull();
  });
});
