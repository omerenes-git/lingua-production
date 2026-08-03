import { getValidSession } from './supabaseWeb';

const SUPABASE_URL = 'https://nqmmlhrkhafwrfhwljdp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WopUD0nNEX6VwqJzIlNEwQ_DaiBQZyp';
const LAST_CLOUD_SYNC_MARKER = 'lingua_supabase_state_updated_at';
const LOCAL_MUTATION_MARKER = 'lingua_local_state_updated_at';
const VERSION_KEY = 'lingua_sync_versions';

/**
 * Fired on `window` whenever a cloud merge writes new values into
 * localStorage, carrying the applied DATA_KEYS payload. The app used to
 * respond to a merge by calling `window.location.reload()`, which nuked
 * in-memory UI state (active tab, in-progress Üret session) any time a
 * background sync happened to run mid-session. Listeners should instead
 * apply `event.detail` directly onto React state.
 */
export const CLOUD_DATA_APPLIED_EVENT = 'lingua:cloud-data-applied';

const DATA_KEYS = [
  'lingua_prompts',
  'lingua_items',
  'lingua_fossilized',
  'lingua_daily_history',
  'lingua_dark_mode',
  'lingua_auto_sync',
] as const;
const SYNC_KEYS = [...DATA_KEYS, VERSION_KEY] as const;

type DataKey = (typeof DATA_KEYS)[number];
type SyncKey = (typeof SYNC_KEYS)[number];
type JsonRecord = Record<string, unknown>;

interface VersionEntry {
  at: string;
  deleted?: boolean;
}

type VersionMap = Record<string, Record<string, VersionEntry>>;

interface CloudStateRow {
  state: Record<string, unknown> | null;
  updated_at: string;
}

// "Kayıt yok" ile "okuma başarısız" ayrı dallardır; aksi halde bir ağ/sunucu
// hatası kayıt yok sanılıp yerel veri buluttaki kaydın üzerine yazabilir.
type CloudReadResult =
  | { kind: 'found'; state: Record<string, unknown>; updatedAt: string }
  | { kind: 'not-found' }
  | { kind: 'no-session' }
  | { kind: 'unauthorized' }
  | { kind: 'rate-limited' }
  | { kind: 'server-error' }
  | { kind: 'network-error' };

function nowIso(): string {
  return new Date().toISOString();
}

function parseTime(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readJson(raw: string | null): unknown {
  if (raw === null) return undefined;
  try { return JSON.parse(raw); } catch { return raw; }
}

function serialize(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function readLocalState(): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    const value = readJson(localStorage.getItem(key));
    if (value !== undefined) state[key] = value;
  }
  return state;
}

function readDataState(): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    const value = readJson(localStorage.getItem(key));
    if (value !== undefined) state[key] = value;
  }
  return state;
}

function readVersions(state: Record<string, unknown>): VersionMap {
  const value = state[VERSION_KEY];
  if (!isRecord(value)) return {};
  const result: VersionMap = {};
  for (const [key, entries] of Object.entries(value)) {
    if (!isRecord(entries)) continue;
    result[key] = {};
    for (const [id, entry] of Object.entries(entries)) {
      if (!isRecord(entry) || typeof entry.at !== 'string') continue;
      result[key][id] = { at: entry.at, ...(entry.deleted === true ? { deleted: true } : {}) };
    }
  }
  return result;
}

function writeLocalState(state: Record<string, unknown>): void {
  for (const key of SYNC_KEYS) {
    if (!(key in state)) {
      localStorage.removeItem(key);
      continue;
    }
    localStorage.setItem(key, serialize(state[key]));
  }
  if (typeof window !== 'undefined') {
    const applied: Partial<Record<DataKey, unknown>> = {};
    for (const key of DATA_KEYS) if (key in state) applied[key] = state[key];
    window.dispatchEvent(new CustomEvent(CLOUD_DATA_APPLIED_EVENT, { detail: applied }));
  }
}

function stableSnapshot(state = readLocalState()): string {
  return JSON.stringify(state);
}

function itemId(item: JsonRecord, index: number): string {
  const id = item.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : `index:${index}`;
}

function recordMap(value: unknown): Map<string, JsonRecord> {
  const map = new Map<string, JsonRecord>();
  asArray(value).forEach((item, index) => map.set(itemId(item, index), item));
  return map;
}

function ensureVersionBucket(versions: VersionMap, key: string): Record<string, VersionEntry> {
  if (!versions[key]) versions[key] = {};
  return versions[key];
}

function bootstrapVersions(state: Record<string, unknown>, fallbackAt: string): VersionMap {
  const versions = readVersions(state);
  for (const key of ['lingua_prompts', 'lingua_items', 'lingua_fossilized'] as const) {
    const bucket = ensureVersionBucket(versions, key);
    asArray(state[key]).forEach((item, index) => {
      const id = itemId(item, index);
      if (!bucket[id]) bucket[id] = { at: fallbackAt };
    });
  }
  const historyBucket = ensureVersionBucket(versions, 'lingua_daily_history');
  const history = isRecord(state.lingua_daily_history) ? state.lingua_daily_history : {};
  for (const date of Object.keys(history)) if (!historyBucket[date]) historyBucket[date] = { at: fallbackAt };
  for (const key of ['lingua_dark_mode', 'lingua_auto_sync'] as const) {
    if (key in state) {
      const bucket = ensureVersionBucket(versions, key);
      if (!bucket.__value) bucket.__value = { at: fallbackAt };
    }
  }
  return versions;
}

function stampDataChanges(previous: Record<string, unknown>, current: Record<string, unknown>, versions: VersionMap): VersionMap {
  const changedAt = nowIso();
  for (const key of ['lingua_prompts', 'lingua_items', 'lingua_fossilized'] as const) {
    const before = recordMap(previous[key]);
    const after = recordMap(current[key]);
    const bucket = ensureVersionBucket(versions, key);
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const oldValue = before.get(id);
      const newValue = after.get(id);
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
      bucket[id] = { at: changedAt, ...(newValue ? {} : { deleted: true }) };
    }
  }

  const oldHistory = isRecord(previous.lingua_daily_history) ? previous.lingua_daily_history : {};
  const newHistory = isRecord(current.lingua_daily_history) ? current.lingua_daily_history : {};
  const historyBucket = ensureVersionBucket(versions, 'lingua_daily_history');
  for (const date of new Set([...Object.keys(oldHistory), ...Object.keys(newHistory)])) {
    if (JSON.stringify(oldHistory[date]) === JSON.stringify(newHistory[date])) continue;
    historyBucket[date] = { at: changedAt, ...(date in newHistory ? {} : { deleted: true }) };
  }

  for (const key of ['lingua_dark_mode', 'lingua_auto_sync'] as const) {
    if (JSON.stringify(previous[key]) === JSON.stringify(current[key])) continue;
    ensureVersionBucket(versions, key).__value = { at: changedAt, ...(key in current ? {} : { deleted: true }) };
  }
  return versions;
}

function chooseSide(localVersion: VersionEntry | undefined, cloudVersion: VersionEntry | undefined, localFallback: string, cloudFallback: string): 'local' | 'cloud' {
  // Bir taraf bu kaydı hiç bilmiyorsa (versiyonu yok), diğer tarafın genel
  // anlık görüntü zamanı daha yeni diye kayıp sanılıp kayıt silinmemeli.
  if (localVersion && !cloudVersion) return 'local';
  if (cloudVersion && !localVersion) return 'cloud';
  const localTime = parseTime(localVersion?.at) || parseTime(localFallback);
  const cloudTime = parseTime(cloudVersion?.at) || parseTime(cloudFallback);
  return cloudTime > localTime ? 'cloud' : 'local';
}

function mergeArrayKey(key: DataKey, local: Record<string, unknown>, cloud: Record<string, unknown>, mergedVersions: VersionMap, localVersions: VersionMap, cloudVersions: VersionMap, localFallback: string, cloudFallback: string): JsonRecord[] {
  const localMap = recordMap(local[key]);
  const cloudMap = recordMap(cloud[key]);
  const localBucket = localVersions[key] || {};
  const cloudBucket = cloudVersions[key] || {};
  const output: JsonRecord[] = [];
  const mergedBucket = ensureVersionBucket(mergedVersions, key);

  for (const id of new Set([...localMap.keys(), ...cloudMap.keys(), ...Object.keys(localBucket), ...Object.keys(cloudBucket)])) {
    const side = chooseSide(localBucket[id], cloudBucket[id], localFallback, cloudFallback);
    const version = side === 'cloud' ? cloudBucket[id] : localBucket[id];
    const record = side === 'cloud' ? cloudMap.get(id) : localMap.get(id);
    mergedBucket[id] = version || { at: side === 'cloud' ? cloudFallback : localFallback };
    if (!mergedBucket[id].deleted && record) output.push(record);
  }
  return output;
}

function mergeHistory(local: Record<string, unknown>, cloud: Record<string, unknown>, mergedVersions: VersionMap, localVersions: VersionMap, cloudVersions: VersionMap, localFallback: string, cloudFallback: string): JsonRecord {
  const localHistory = isRecord(local.lingua_daily_history) ? local.lingua_daily_history : {};
  const cloudHistory = isRecord(cloud.lingua_daily_history) ? cloud.lingua_daily_history : {};
  const localBucket = localVersions.lingua_daily_history || {};
  const cloudBucket = cloudVersions.lingua_daily_history || {};
  const mergedBucket = ensureVersionBucket(mergedVersions, 'lingua_daily_history');
  const output: JsonRecord = {};

  for (const date of new Set([...Object.keys(localHistory), ...Object.keys(cloudHistory), ...Object.keys(localBucket), ...Object.keys(cloudBucket)])) {
    const side = chooseSide(localBucket[date], cloudBucket[date], localFallback, cloudFallback);
    const version = side === 'cloud' ? cloudBucket[date] : localBucket[date];
    mergedBucket[date] = version || { at: side === 'cloud' ? cloudFallback : localFallback };
    if (!mergedBucket[date].deleted) output[date] = side === 'cloud' ? cloudHistory[date] : localHistory[date];
  }
  return output;
}

function mergeStates(local: Record<string, unknown>, cloud: Record<string, unknown>, localFallback: string, cloudFallback: string): Record<string, unknown> {
  const localVersions = bootstrapVersions(local, localFallback);
  const cloudVersions = bootstrapVersions(cloud, cloudFallback);
  const mergedVersions: VersionMap = {};
  const merged: Record<string, unknown> = {};

  for (const key of ['lingua_prompts', 'lingua_items', 'lingua_fossilized'] as const) {
    merged[key] = mergeArrayKey(key, local, cloud, mergedVersions, localVersions, cloudVersions, localFallback, cloudFallback);
  }
  merged.lingua_daily_history = mergeHistory(local, cloud, mergedVersions, localVersions, cloudVersions, localFallback, cloudFallback);

  for (const key of ['lingua_dark_mode', 'lingua_auto_sync'] as const) {
    const localVersion = localVersions[key]?.__value;
    const cloudVersion = cloudVersions[key]?.__value;
    const side = chooseSide(localVersion, cloudVersion, localFallback, cloudFallback);
    const version = side === 'cloud' ? cloudVersion : localVersion;
    ensureVersionBucket(mergedVersions, key).__value = version || { at: side === 'cloud' ? cloudFallback : localFallback };
    const selected = side === 'cloud' ? cloud : local;
    if (!ensureVersionBucket(mergedVersions, key).__value.deleted && key in selected) merged[key] = selected[key];
  }

  merged[VERSION_KEY] = mergedVersions;
  return merged;
}

export function getLastSyncedAt(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(LAST_CLOUD_SYNC_MARKER);
}

export async function syncNow(): Promise<InitialResolution> {
  return reconcileWithCloud();
}

export function markLocalDataChanged(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_MUTATION_MARKER, nowIso());
}

export function persistSyncedLocalValue(key: SyncKey, value: unknown): void {
  const serialized = serialize(value);
  if (localStorage.getItem(key) === serialized) return;
  localStorage.setItem(key, serialized);
  markLocalDataChanged();
}

export function removeSyncedLocalValue(key: SyncKey): void {
  if (localStorage.getItem(key) === null) return;
  localStorage.removeItem(key);
  markLocalDataChanged();
}

async function requestCloudState(): Promise<CloudReadResult> {
  const session = await getValidSession();
  if (!session) return { kind: 'no-session' };

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?select=state,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
    });
  } catch {
    return { kind: 'network-error' };
  }

  if (response.status === 401 || response.status === 403) return { kind: 'unauthorized' };
  if (response.status === 429) return { kind: 'rate-limited' };
  // 404 bir okuma/konfigürasyon hatasıdır, "kayıt yok" değil; gerçek "kayıt
  // yok" durumu yalnızca başarılı 200 yanıtındaki boş dizidir (aşağıda).
  if (!response.ok) return { kind: 'server-error' };

  let rows: CloudStateRow[];
  try {
    rows = (await response.json()) as CloudStateRow[];
  } catch {
    return { kind: 'network-error' };
  }

  const row = rows[0];
  if (!row?.state) return { kind: 'not-found' };
  return { kind: 'found', state: row.state, updatedAt: row.updated_at };
}

async function uploadCloudState(state = readLocalState()): Promise<boolean> {
  const session = await getValidSession();
  if (!session) return false;
  const uploadedAt = nowIso();
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ user_id: session.user.id, state, updated_at: uploadedAt }),
    });
  } catch {
    return false;
  }
  if (!response.ok) return false;
  localStorage.setItem(LAST_CLOUD_SYNC_MARKER, uploadedAt);
  localStorage.setItem(LOCAL_MUTATION_MARKER, uploadedAt);
  return true;
}

type InitialResolution = 'merged' | 'uploaded' | 'unchanged' | 'no-session' | 'error';

async function reconcileWithCloud(): Promise<InitialResolution> {
  const cloudResult = await requestCloudState();

  if (cloudResult.kind === 'no-session') return 'no-session';
  // Okuma başarısız: hiçbir şey yükleme/silme, bir sonraki senkronizasyonda tekrar dene.
  if (cloudResult.kind !== 'found' && cloudResult.kind !== 'not-found') return 'error';

  const local = readLocalState();
  const localFallback = localStorage.getItem(LOCAL_MUTATION_MARKER) || localStorage.getItem(LAST_CLOUD_SYNC_MARKER) || nowIso();

  if (cloudResult.kind === 'not-found') {
    const initialized = { ...local, [VERSION_KEY]: bootstrapVersions(local, localFallback) };
    writeLocalState(initialized);
    return await uploadCloudState(initialized) ? 'uploaded' : 'error';
  }

  const merged = mergeStates(local, cloudResult.state, localFallback, cloudResult.updatedAt);
  const localChanged = stableSnapshot(merged) !== stableSnapshot(local);
  const cloudChanged = stableSnapshot(merged) !== stableSnapshot(cloudResult.state);
  if (localChanged) writeLocalState(merged);

  if (!cloudChanged) {
    if (!localChanged) return 'unchanged';
    localStorage.setItem(LAST_CLOUD_SYNC_MARKER, cloudResult.updatedAt);
    localStorage.setItem(LOCAL_MUTATION_MARKER, cloudResult.updatedAt);
    return 'merged';
  }

  if (await uploadCloudState(merged)) return localChanged ? 'merged' : 'uploaded';
  // Upload başarısız: birleşmiş veri yerelde korunur (yukarıda yazıldı ve
  // CLOUD_DATA_APPLIED_EVENT ile bildirildi), ama senkronizasyon zamanı
  // başarılıymış gibi güncellenmez; bir sonraki denemede buluta tekrar
  // yüklenmeye çalışılır.
  return localChanged ? 'merged' : 'error';
}

export async function startSupabaseDataSync(): Promise<() => void> {
  if (typeof window === 'undefined') return () => undefined;

  // Applies any cloud-side changes onto localStorage and notifies listeners
  // (see CLOUD_DATA_APPLIED_EVENT) instead of reloading the page — a reload
  // used to wipe in-memory session state (active tab, in-progress Üret
  // practice) any time this ran mid-session.
  await reconcileWithCloud();

  let previousData = readDataState();
  let lastSnapshot = stableSnapshot();
  let isSyncing = false;
  let debounceId: number | null = null;

  const syncIfChanged = async (force = false) => {
    if (isSyncing) return;
    const current = stableSnapshot();
    if (!force && current === lastSnapshot) return;
    isSyncing = true;
    try {
      await reconcileWithCloud();
      lastSnapshot = stableSnapshot();
      previousData = readDataState();
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

  let warmupAttempts = 0;
  const intervalId = window.setInterval(() => {
    const currentData = readDataState();
    if (JSON.stringify(currentData) !== JSON.stringify(previousData)) {
      const state = readLocalState();
      const fallback = localStorage.getItem(LOCAL_MUTATION_MARKER) || nowIso();
      const versions = stampDataChanges(previousData, currentData, bootstrapVersions(state, fallback));
      localStorage.setItem(VERSION_KEY, JSON.stringify(versions));
      previousData = currentData;
      markLocalDataChanged();
      scheduleSync();
    }
    warmupAttempts += 1;
    if (warmupAttempts <= 6) void syncIfChanged(true);
  }, 2000);

  const onVisibility = () => { if (document.visibilityState === 'hidden') void syncIfChanged(true); };
  const onPageHide = () => void syncIfChanged(true);
  const onOnline = () => void syncIfChanged(true);
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
