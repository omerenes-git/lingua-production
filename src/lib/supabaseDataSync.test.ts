import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOUD_DATA_APPLIED_EVENT,
  getLastSyncedAt,
  persistSyncedLocalValue,
  startSupabaseDataSync,
  syncNow,
} from './supabaseDataSync';
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

  it.each([404, 429, 503])('%i durumunda da veri üzerine yazılmıyor', async (status) => {
    const { calls } = installFetchMock({ get: () => jsonResponse(status) });

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(getUploadCalls(calls)).toHaveLength(0);
  });

  it('404, boş sonuçtan farklı olarak "kayıt yok" sayılmıyor ve ilk yükleme tetiklenmiyor', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'local-item' }]));
    const { calls } = installFetchMock({ get: () => jsonResponse(404) });

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(getUploadCalls(calls)).toHaveLength(0);
    expect(localStorage.getItem('lingua_sync_versions')).toBeNull();
    expect(getLastSyncedAt()).toBeNull();
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

  it('birleşim gerekiyorken upload 500 dönerse senkron zamanı güncellenmez, birleşmiş veri korunur ve sonraki denemede yüklenir', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'a', targetText: 'local-a' }]));
    localStorage.setItem(
      'lingua_sync_versions',
      JSON.stringify({ lingua_items: { a: { at: '2025-06-01T00:00:00.000Z' } } }),
    );
    const cloudRow = {
      state: {
        lingua_items: [{ id: 'b', targetText: 'cloud-b' }],
        lingua_sync_versions: { lingua_items: { b: { at: '2025-06-02T00:00:00.000Z' } } },
      },
      updated_at: '2025-06-02T00:00:00.000Z',
    };

    const attempt1 = installFetchMock({
      get: () => jsonResponse(200, [cloudRow]),
      post: () => jsonResponse(500),
    });

    const firstResolution = await syncNow();

    expect(firstResolution).toBe('error');
    expect(getUploadCalls(attempt1.calls)).toHaveLength(1);
    expect(getLastSyncedAt()).toBeNull();
    const itemsAfterFailedUpload = JSON.parse(localStorage.getItem('lingua_items')!) as Array<{ id: string }>;
    expect(itemsAfterFailedUpload.map((item) => item.id).sort()).toEqual(['a', 'b']);

    const attempt2 = installFetchMock({
      get: () => jsonResponse(200, [cloudRow]),
      post: () => jsonResponse(201),
    });

    const retryResolution = await syncNow();

    expect(retryResolution).toBe('uploaded');
    expect(getUploadCalls(attempt2.calls)).toHaveLength(1);
    expect(getLastSyncedAt()).not.toBeNull();
    const itemsAfterRetry = JSON.parse(localStorage.getItem('lingua_items')!) as Array<{ id: string }>;
    expect(itemsAfterRetry.map((item) => item.id).sort()).toEqual(['a', 'b']);
  });

  it('birleşim gerekiyorken upload ağ hatası verirse senkron zamanı güncellenmez ve birleşmiş veri korunur', async () => {
    localStorage.setItem('lingua_items', JSON.stringify([{ id: 'a', targetText: 'local-a' }]));
    localStorage.setItem(
      'lingua_sync_versions',
      JSON.stringify({ lingua_items: { a: { at: '2025-06-01T00:00:00.000Z' } } }),
    );
    const cloudRow = {
      state: {
        lingua_items: [{ id: 'b', targetText: 'cloud-b' }],
        lingua_sync_versions: { lingua_items: { b: { at: '2025-06-02T00:00:00.000Z' } } },
      },
      updated_at: '2025-06-02T00:00:00.000Z',
    };

    installFetchMock({
      get: () => jsonResponse(200, [cloudRow]),
      post: () => {
        throw new TypeError('Failed to fetch');
      },
    });

    const resolution = await syncNow();

    expect(resolution).toBe('error');
    expect(getLastSyncedAt()).toBeNull();
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

  it.each([
    { label: 'POST 500 dönerse', post: () => jsonResponse(500) },
    {
      label: 'POST ağ hatası atarsa',
      post: () => {
        throw new TypeError('Failed to fetch');
      },
    },
  ])(
    'ilk bulut yüklemesi başarısız olursa ($label) sonuç error olur, senkron zamanı güncellenmez, yerel veri ve versiyon metadata korunur',
    async ({ post }) => {
      localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'local-item' }]));
      const { calls } = installFetchMock({
        get: () => jsonResponse(200, []),
        post,
      });

      const resolution = await syncNow();

      expect(resolution).toBe('error');
      expect(getUploadCalls(calls)).toHaveLength(1);
      expect(getLastSyncedAt()).toBeNull();
      expect(JSON.parse(localStorage.getItem('lingua_items')!)).toEqual([
        { id: 'x', targetText: 'local-item' },
      ]);
      const versions = JSON.parse(localStorage.getItem('lingua_sync_versions')!);
      expect(typeof versions.lingua_items.x?.at).toBe('string');
    },
  );
});

describe('cloud merges apply in place instead of reloading the page', () => {
  // A background sync used to call window.location.reload() on every merge,
  // which wiped in-memory UI state (active tab, in-progress Üret session)
  // any time it ran mid-session. It must now notify listeners instead.
  it('a merge during syncNow() never reloads the page and dispatches CLOUD_DATA_APPLIED_EVENT with the merged data', async () => {
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

    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload: reloadSpy }, writable: true });
    const events: Array<Record<string, unknown>> = [];
    const handler = (event: Event) => events.push((event as CustomEvent).detail);
    window.addEventListener(CLOUD_DATA_APPLIED_EVENT, handler);

    const resolution = await syncNow();

    window.removeEventListener(CLOUD_DATA_APPLIED_EVENT, handler);
    expect(resolution).toBe('merged');
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    const items = events[0].lingua_items as Array<{ id: string }>;
    expect(items.map((item) => item.id).sort()).toEqual(['a', 'b']);
  });

  it('startSupabaseDataSync() does not reload on its initial sync, even when it merges cloud data', async () => {
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

    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload: reloadSpy }, writable: true });

    const stop = await startSupabaseDataSync();
    try {
      expect(reloadSpy).not.toHaveBeenCalled();
      const items = JSON.parse(localStorage.getItem('lingua_items')!) as Array<{ id: string }>;
      expect(items.map((item) => item.id).sort()).toEqual(['a', 'b']);
    } finally {
      stop();
    }
  });

  it('the ongoing background interval reconciles local changes without ever reloading', async () => {
    vi.useFakeTimers();
    try {
      installFetchMock({ get: () => jsonResponse(200, []), post: () => jsonResponse(201) });
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', { value: { ...window.location, reload: reloadSpy }, writable: true });

      const stop = await startSupabaseDataSync();
      try {
        // Simulate a local mutation the way App.tsx's useEffect persistence does.
        localStorage.setItem('lingua_items', JSON.stringify([{ id: 'x', targetText: 'new-answer' }]));

        // Advance past the 2s polling tick that detects the change, the 1.5s
        // debounce, and a couple more ticks so a merge cycle can complete.
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(1500);
        await vi.advanceTimersByTimeAsync(2000);

        expect(reloadSpy).not.toHaveBeenCalled();
      } finally {
        stop();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('persists a state mutation from the explicit autosave event without waiting for the 2-second fallback poll', async () => {
    vi.useFakeTimers();
    try {
      const { calls } = installFetchMock({ get: () => jsonResponse(200, []), post: () => jsonResponse(201) });
      const stop = await startSupabaseDataSync();
      try {
        const uploadsBeforeMutation = getUploadCalls(calls).length;
        persistSyncedLocalValue('lingua_items', [{ id: 'event-save', targetText: 'saved immediately' }]);

        await vi.advanceTimersByTimeAsync(249);
        expect(getUploadCalls(calls)).toHaveLength(uploadsBeforeMutation);
        await vi.advanceTimersByTimeAsync(1);
        expect(getUploadCalls(calls).length).toBeGreaterThan(uploadsBeforeMutation);
      } finally {
        stop();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('automatically retries a failed cloud upload; manual sync is not required', async () => {
    vi.useFakeTimers();
    try {
      localStorage.setItem('lingua_items', JSON.stringify([{ id: 'retry-me', targetText: 'durable' }]));
      let postAttempt = 0;
      const { calls } = installFetchMock({
        get: () => jsonResponse(200, []),
        post: () => {
          postAttempt += 1;
          return jsonResponse(postAttempt === 1 ? 500 : 201);
        },
      });

      const stop = await startSupabaseDataSync();
      try {
        expect(getUploadCalls(calls)).toHaveLength(1);
        expect(getLastSyncedAt()).toBeNull();

        await vi.advanceTimersByTimeAsync(2_000);
        expect(getUploadCalls(calls)).toHaveLength(2);
        expect(getLastSyncedAt()).not.toBeNull();
      } finally {
        stop();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
