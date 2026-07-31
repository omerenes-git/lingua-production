import { getValidSession } from './supabaseWeb';

const SUPABASE_URL = 'https://nqmmlhrkhafwrfhwljdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WopUD0nNEX6VwqJzIlNEwQ_DaiBQZyp';
const LOCAL_SYNC_MARKER = 'lingua_supabase_state_updated_at';
const RELOAD_GUARD = 'lingua_supabase_restore_done';
const SYNC_KEYS = [
  'lingua_prompts',
  'lingua_items',
  'lingua_fossilized',
  'lingua_daily_history',
  'lingua_dark_mode',
  'lingua_auto_sync',
] as const;

interface CloudStateRow {
  state: Record<string, unknown> | null;
  updated_at: string;
}

function readLocalState(): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      state[key] = JSON.parse(raw);
    } catch {
      state[key] = raw;
    }
  }
  return state;
}

function writeLocalState(state: Record<string, unknown>): void {
  for (const key of SYNC_KEYS) {
    if (!(key in state)) continue;
    const value = state[key];
    localStorage.setItem(
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    );
  }
}

function stableSnapshot(): string {
  return JSON.stringify(readLocalState());
}

async function requestCloudState(): Promise<CloudStateRow | null> {
  const session = await getValidSession();
  if (!session) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/app_state?select=state,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) return null;
  const rows = (await response.json()) as CloudStateRow[];
  return rows[0] ?? null;
}

async function uploadCloudState(): Promise<boolean> {
  const session = await getValidSession();
  if (!session) return false;

  const now = new Date().toISOString();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?on_conflict=user_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: session.user.id,
      state: readLocalState(),
      updated_at: now,
    }),
  });

  if (!response.ok) return false;
  localStorage.setItem(LOCAL_SYNC_MARKER, now);
  return true;
}

async function restoreNewerCloudState(): Promise<boolean> {
  const cloud = await requestCloudState();
  if (!cloud?.state) return false;

  const localUpdatedAt = localStorage.getItem(LOCAL_SYNC_MARKER);
  const cloudTime = Date.parse(cloud.updated_at);
  const localTime = localUpdatedAt ? Date.parse(localUpdatedAt) : 0;
  if (!Number.isFinite(cloudTime) || cloudTime <= localTime) return false;

  writeLocalState(cloud.state);
  localStorage.setItem(LOCAL_SYNC_MARKER, cloud.updated_at);
  return true;
}

export async function startSupabaseDataSync(): Promise<() => void> {
  if (typeof window === 'undefined') return () => undefined;

  const restored = await restoreNewerCloudState();
  if (restored && sessionStorage.getItem(RELOAD_GUARD) !== 'true') {
    sessionStorage.setItem(RELOAD_GUARD, 'true');
    window.location.reload();
    return () => undefined;
  }
  sessionStorage.removeItem(RELOAD_GUARD);

  let lastSnapshot = stableSnapshot();
  let isSyncing = false;

  const syncIfChanged = async () => {
    if (isSyncing || document.visibilityState === 'hidden') return;
    const current = stableSnapshot();
    if (current === lastSnapshot) return;

    isSyncing = true;
    try {
      if (await uploadCloudState()) lastSnapshot = current;
    } finally {
      isSyncing = false;
    }
  };

  // İlk cihazdaki mevcut veriyi de hesapla ilişkilendir.
  if (!(await requestCloudState())) {
    await uploadCloudState();
    lastSnapshot = stableSnapshot();
  }

  const intervalId = window.setInterval(syncIfChanged, 5000);
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void syncIfChanged();
  };
  const onBeforeUnload = () => void syncIfChanged();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('beforeunload', onBeforeUnload);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}
