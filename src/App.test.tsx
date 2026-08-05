import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { App } from './App';
import { CLOUD_DATA_APPLIED_EVENT } from './lib/supabaseDataSync';
import { getValidSession } from './lib/supabaseWeb';

const SESSION = vi.hoisted(() => ({
  access_token: 'token-123',
  refresh_token: 'refresh-123',
  token_type: 'bearer',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'user-1', email: 'test@example.com' },
}));

vi.mock('./lib/supabaseWeb', () => ({
  getValidSession: vi.fn().mockResolvedValue(SESSION),
  signOut: vi.fn().mockResolvedValue(undefined),
  AUTH_REQUIRED_EVENT: 'lingua:auth-required',
}));

function mockEvaluationFetch(overrides: Partial<Record<string, unknown>> = {}) {
  const evaluation = {
    overallVerdict: 'correct',
    suggestedRating: 'easy',
    errorSeverity: 'none',
    errors: [],
    naturalAlternatives: [],
    explanationTr: 'Harika, tam doğru.',
    ...overrides,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(evaluation), { status: 200, headers: { 'Content-Type': 'application/json' } })),
  );
  return evaluation;
}

async function goToUretTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Üret (Pratik)' }));
  await screen.findByPlaceholderText('Cümleni buraya yaz veya mikrofonla söyle...');
}

async function submitOneAnswer(user: ReturnType<typeof userEvent.setup>, text = 'My test sentence') {
  const textarea = screen.getByPlaceholderText('Cümleni buraya yaz veya mikrofonla söyle...');
  await user.clear(textarea);
  await user.type(textarea, text);
  await user.click(screen.getByRole('button', { name: /Cevabı Gönder/ }));
  await screen.findByRole('button', { name: 'Sonraki Karta Geç' });
}

function readDailyHistory(): Record<string, number> {
  return JSON.parse(localStorage.getItem('lingua_daily_history') || '{}');
}

function readSessionSeen(): Record<string, string[]> {
  return JSON.parse(localStorage.getItem('lingua_session_seen') || '{}');
}

function readPromptHistory(): Record<string, { shownCount: number; completedCount: number }> {
  return JSON.parse(localStorage.getItem('lingua_prompt_history') || '{}');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // vitest.config.ts sets restoreMocks: true, which resets vi.fn() mock
  // implementations (including mockResolvedValue) before every test — so the
  // session mock must be re-armed here rather than only in the vi.mock factory.
  vi.mocked(getValidSession).mockResolvedValue(SESSION as never);
  mockEvaluationFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Üret session flow (real component state + localStorage persistence)', () => {
  it('does not navigate away from Üret after a handful of submissions (no premature redirect to home)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);

    for (let i = 0; i < 3; i += 1) {
      await submitOneAnswer(user, `Sentence attempt ${i}`);
      await user.click(screen.getByRole('button', { name: 'Sonraki Karta Geç' }));
    }

    // Still on the Üret tab: its practice UI is present and the home welcome banner is not.
    expect(screen.getByPlaceholderText('Cümleni buraya yaz veya mikrofonla söyle...')).toBeInTheDocument();
    expect(screen.queryByText(/Hoş geldin!/)).not.toBeInTheDocument();
  });

  it('increments today\'s English count exactly once per successful submission, visible immediately in storage', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);

    await submitOneAnswer(user, 'First answer');
    const afterFirst = readDailyHistory();
    const key = Object.keys(afterFirst).find((k) => k.startsWith('en::'));
    expect(key).toBeDefined();
    expect(afterFirst[key!]).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Sonraki Karta Geç' }));
    await submitOneAnswer(user, 'Second answer');
    const afterSecond = readDailyHistory();
    expect(afterSecond[key!]).toBe(2);
  });

  it('locks a completed answer against duplicate submission and persists its exact-prompt history', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);

    await submitOneAnswer(user, 'Only once');
    const savedButton = screen.getByRole('button', { name: 'Bu Cevap Kaydedildi' });
    expect(savedButton).toBeDisabled();
    expect(Object.values(readDailyHistory())).toEqual([1]);

    const entries = Object.values(readPromptHistory());
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ shownCount: 1, completedCount: 1 });
  });

  it('does not repeat a prompt id within the same session across several submissions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);

    for (let i = 0; i < 4; i += 1) {
      await submitOneAnswer(user, `Answer ${i}`);
      if (i < 3) await user.click(screen.getByRole('button', { name: 'Sonraki Karta Geç' }));
    }

    const seen = readSessionSeen();
    expect(seen.en.length).toBe(4);
    expect(new Set(seen.en).size).toBe(4);
  });

  it('persists progress across an app restart (unmount + remount reading the same localStorage)', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await goToUretTab(user);
    await submitOneAnswer(user, 'Persisted answer');
    const beforeRestart = readDailyHistory();
    first.unmount();

    render(<App />);
    const afterRestart = readDailyHistory();
    expect(afterRestart).toEqual(beforeRestart);
  });

  it('keeps English and German daily progress fully isolated', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);
    await submitOneAnswer(user, 'English answer');

    await user.click(screen.getByRole('button', { name: /İngilizce/ }));
    await user.click(screen.getByRole('button', { name: /Almanca/ }));

    const history = readDailyHistory();
    const enKey = Object.keys(history).find((k) => k.startsWith('en::'))!;
    const deKey = Object.keys(history).find((k) => k.startsWith('de::'));
    expect(history[enKey]).toBe(1);
    expect(deKey).toBeUndefined();
  });
});

describe('Daily goal completion modal', () => {
  it('shows the goal-reached modal after the 5th submission with Continue / End Session choices, and Continue keeps the session on Üret', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);

    for (let i = 0; i < 5; i += 1) {
      await submitOneAnswer(user, `Goal answer ${i}`);
      if (i < 4) await user.click(screen.getByRole('button', { name: 'Sonraki Karta Geç' }));
    }

    expect(await screen.findByText(/Günlük Hedef Tamamlandı/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Çalışmaya Devam Et' }));
    expect(screen.queryByText(/Günlük Hedef Tamamlandı/)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cümleni buraya yaz veya mikrofonla söyle...')).toBeInTheDocument();
  });

  it('"Oturumu Bitir" saves progress, clears the session-seen list, and returns to the home tab', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);

    for (let i = 0; i < 5; i += 1) {
      await submitOneAnswer(user, `End session answer ${i}`);
      if (i < 4) await user.click(screen.getByRole('button', { name: 'Sonraki Karta Geç' }));
    }

    await screen.findByText(/Günlük Hedef Tamamlandı/);
    await user.click(screen.getByRole('button', { name: 'Oturumu Bitir' }));

    expect(await screen.findByText(/Hoş geldin!/)).toBeInTheDocument();
    const history = readDailyHistory();
    const enKey = Object.keys(history).find((k) => k.startsWith('en::'))!;
    expect(history[enKey]).toBe(5);
    expect(readSessionSeen().en).toEqual([]);
  });
});

describe('Cloud sync merge applies without disrupting the active session', () => {
  it('a CLOUD_DATA_APPLIED_EVENT while on Üret updates data in place and does not navigate to home', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);

    window.dispatchEvent(
      new CustomEvent(CLOUD_DATA_APPLIED_EVENT, {
        detail: {
          lingua_items: [],
          lingua_daily_history: { 'en::2020-01-01': 9 },
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Cümleni buraya yaz veya mikrofonla söyle...')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Hoş geldin!/)).not.toBeInTheDocument();
  });
});

describe('Local data survives evaluation-service failures (offline-safe recording)', () => {
  it('does not record progress for an AI-service-unavailable evaluation, and a later real submission still succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const user = userEvent.setup();
    render(<App />);
    await goToUretTab(user);
    await submitOneAnswer(user, 'Offline attempt');

    expect(readDailyHistory()).toEqual({});

    mockEvaluationFetch();
    await user.click(screen.getByRole('button', { name: 'Sonraki Karta Geç' }));
    await submitOneAnswer(user, 'Back online attempt');
    const history = readDailyHistory();
    const enKey = Object.keys(history).find((k) => k.startsWith('en::'))!;
    expect(history[enKey]).toBe(1);
  });
});
