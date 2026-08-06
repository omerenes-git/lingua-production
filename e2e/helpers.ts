// E2E yardımcıları — login, tab gezinme, test kullanıcıları
import { Page, expect } from '@playwright/test';

export const TABS = {
  bugun: 'Bugün',
  uret: 'Üret (Pratik)',
  gramer: 'Gramer Koçu',
  nasil: 'Nasıl Söylerim?',
  sohbet: 'Sohbet',
  ilerleme: 'İlerleme & Hatalarım',
} as const;

export interface TestUser {
  email: string;
  password: string;
}

export function getTestUser(lang: 'de' | 'sr' | 'new'): TestUser {
  const key = lang.toUpperCase();
  const email = process.env[`E2E_TEST_${key}_EMAIL`];
  const password = process.env[`E2E_TEST_${key}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`E2E_TEST_${key}_EMAIL/PASSWORD .env içinde tanımlı değil`);
  }
  return { email, password };
}

/** Login ekranından giriş yap; başarılı oturumu bekle (Header görünür). */
export async function login(page: Page, user: TestUser) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Güvenli giriş/i }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('textbox', { name: /E-posta/i }).fill(user.email);
  await page.getByRole('textbox', { name: /Şifre/i }).fill(user.password);
  await page.getByRole('button', { name: /Uygulamaya gir/i }).click();
  await expect(page.getByText(TABS.bugun).first()).toBeVisible({ timeout: 25_000 });
}

/** Tab'a geç. (aria-current uygulamada kullanılmıyor; gezinme içerik varlığıyla doğrulanır.) */
export async function goTab(page: Page, tabKey: keyof typeof TABS) {
  await page.getByRole('button', { name: TABS[tabKey] }).first().click();
}

/** localStorage temizle + sayfayı yenile (izole test durumu). Sayfa önce yüklenmeli. */
export async function resetStorage(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    const keys = [
      'lingua_prompts', 'lingua_items', 'lingua_fossilized', 'lingua_daily_history',
      'lingua_session_seen', 'lingua_supabase_session_v1', 'lingua_dark_mode',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
}

/** Yanlış/boş giriş denemesi için login ekranına git (önce mevcut oturumu temizle). */
export async function gotoLoginFresh(page: Page) {
  await resetStorage(page);
  await expect(page.getByRole('textbox', { name: /E-posta/i })).toBeVisible({ timeout: 20_000 });
}
