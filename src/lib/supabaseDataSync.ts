import { getValidSession } from './supabaseWeb';

const SUPABASE_URL = 'https://nqmmlhrkhafwrfhwljdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WopUD0nNEX6VwqJzIlNEwQ_DaiBQZyp';
const LAST_CLOUD_SYNC_MARKER = 'lingua_supabase_state_updated_at';
const LOCAL_MUTATION_MARKER = 'lingua_local_state_updated_at';
const RELOAD_GUARD = 'lingua_supabase_restore_done';
const SYNC_KEYS = [
  'lingua_prompts',
  'lingua_items',
  'lingua_fossilized',
  'lingua_daily_history',
  'lingua_dark_mode',
  'lingua_auto_sync',
] as const;

type SyncKey = (typeof SYNC_KEYS)[number];

interface CloudStateRow {
  state: Record<string, unknown> | null;
  updated_at: string;
}

function parseTime(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function markLocalDataChanged(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_MUTATION_MARKER, nowIso());
}

export function persistSyncedLocalValue(key: SyncKey, value: unknown): void {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (localStorage.getItem(key) === serialized) return;
  localStorage.setItem(key, serialized);
  markLocalDataChanged();
}

export function removeSyncedLocalValue(key: SyncKey): void {
  if (localStorage.getItem(key) === null) return;
  localStorage.removeItem(key);
  markLocalDataChanged();
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

function hasMeaningfulLocalState(): boolean {
  return SYNC_KEYS.some((key) => localStorage.getItem(key) !== null);
}

function writeLocalState(state: Record<string, unknown>): void {
  for (const key of SYNC_KEYS) {
    if (!(key in state)) {
      localStorage.removeItem(key);
      continue;
    }
    const value = state[key];
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
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

  const uploadedAt = nowIso();
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
      updated_at: uploadedAt,
    }),
  });

  if (!response.ok) return false;
  localStorage.setItem(LAST_CLOUD_SYNC_MARKER, uploadedAt);
  localStorage.setItem(LOCAL_MUTATION_MARKER, uploadedAt);
  return true;
}

type InitialResolution = 'restored' | 'upload-local' | 'unchanged' | 'no-session';

async function resolveInitialConflict(): Promise<InitialResolution> {
  const session = await getValidSession();
  if (!session) return 'no-session';

  const cloud = await requestCloudState();
  if (!cloud?.state) {
    return hasMeaningfulLocalState() && await uploadCloudState() ? 'upload-local' : 'unchanged';
  }

  const cloudTime = parseTime(cloud.updated_at);
  const localMutationTime = parseTime(localStorage.getItem(LOCAL_MUTATION_MARKER));
  const lastCloudSyncTime = parseTime(localStorage.getItem(LAST_CLOUD_SYNC_MARKER));
  const localDecisionTime = Math.max(localMutationTime, lastCloudSyncTime);

  if (localMutationTime > lastCloudSyncTime && localMutationTime >= cloudTime) {
    return await uploadCloudState() ? 'upload-local' : 'unchanged';
  }

  if (cloudTime > localDecisionTime || !hasMeaningfulLocalState()) {
    writeLocalState(cloud.state);
    localStorage.setItem(LAST_CLOUD_SYNC_MARKER, cloud.updated_at);
    localStorage.setItem(LOCAL_MUTATION_MARKER, cloud.updated_at);
    return 'restored';
  }

  return 'unchanged';
}

export async function startSupabaseDataSync(): Promise<() => void> {
  if (typeof window === 'undefined') return () => undefined;

  const initialResolution = await resolveInitialConflict();
  if (initialResolution === 'restored' && sessionStorage.getItem(RELOAD_GUARD) !== 'true') {
    sessionStorage.setItem(RELOAD_GUARD, 'true');
    window.location.reload();
    return () => undefined;
  }
  sessionStorage.removeItem(RELOAD_GUARD);

  let lastSnapshot = stableSnapshot();
  let isSyncing = false;
  let debounceId: number | null = null;

  const syncIfChanged = async (force = false) => {
    if (isSyncing) return;
    const current = stableSnapshot();
    if (!force && current === lastSnapshot) return;

    if (current !== lastSnapshot && parseTime(localStorage.getItem(LOCAL_MUTATION_MARKER)) <= parseTime(localStorage.getItem(LAST_CLOUD_SYNC_MARKER))) {
      markLocalDataChanged();
    }

    isSyncing = true;
    try {
      if (await uploadCloudState()) lastSnapshot = current;
    } finally {
      isSyncing = false;
    }
  };

  const scheduleSync = () => {
    if (debounceId !== null) window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      debounceId = null;
      void syncIfChanged();
    }, 1500);
  };

  let observedSnapshot = lastSnapshot;
  let warmupAttempts = 0;
  const intervalId = window.setInterval(() => {
    const current = stableSnapshot();
    if (current !== observedSnapshot) {
      observedSnapshot = current;
      markLocalDataChanged();
      scheduleSync();
    }

    warmupAttempts += 1;
    if (warmupAttempts <= 6) void syncIfChanged(true);
  }, 2000);

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void syncIfChanged(true);
  };
  const onPageHide = () => void syncIfChanged(true);
  const onOnline = () => void resolveInitialConflict().then((resolution) => {
    if (resolution === 'restored') window.location.reload();
    else void syncIfChanged(true);
  });

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('online', onOnline);

  return () => {
    window.clearInterval(intervalId);
    if (debounceId !== null) window.clearTimeout(debounceId);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('online', onOnline);
  };
}
