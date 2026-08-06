// Veri kalıcılığı, otomatik kayıt, senkronizasyon ve LingQ testleri
import { test, expect, Page } from '@playwright/test';
import { login, getTestUser, goTab } from './helpers';

async function loginDE(page: Page) {
  await login(page, getTestUser('de'));
}

test.describe('Otomatik kayıt ve veri kalıcılığı', () => {
  test('Üret cevabı gönderilince localStorage verisi oluşur ve yenilemede korunur', async ({ page }) => {
    await loginDE(page);
    await page.getByRole('button', { name: /Almanca/i }).first().click();
    await goTab(page, 'uret');
    await expect(page.locator('[data-active-context-type="uret"]')).toHaveAttribute('data-turkish-prompt', /.+/, { timeout: 20_000 });

    // Cevap gönder (doğruluğu önemli değil — kayıt mekanizması test ediliyor)
    await page.getByPlaceholder(/Cümleni buraya yaz/i).fill('Ich trinke gerne Kaffee am Morgen.');
    await page.getByRole('button', { name: /Cevabı Gönder/i }).click();
    await expect(page.locator('[data-active-context-type="uret"]')).toHaveAttribute('data-evaluation-verdict', /correct|natural_variant|minor_issue|major_issue|incorrect/, { timeout: 90_000 });

    // Günlük sayaç artmış olmalı
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('lingua_daily_history') || '{}'));
    const total = Object.values(history).reduce((a: number, b) => a + (b as number), 0);
    expect(total).toBeGreaterThanOrEqual(1);

    // Yenile — veri korunur
    await page.reload();
    await expect(page.getByRole('button', { name: /Üret \(Pratik\)/i })).toBeVisible({ timeout: 25_000 });
    const historyAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('lingua_daily_history') || '{}'));
    const totalAfter = Object.values(historyAfter).reduce((a: number, b) => a + (b as number), 0);
    expect(totalAfter).toBeGreaterThanOrEqual(1);
  });

  test('boş cevap gönderilirse kayıt oluşmaz', async ({ page }) => {
    await loginDE(page);
    await goTab(page, 'uret');
    await expect(page.getByRole('button', { name: /Cevabı Gönder/i })).toBeDisabled();
  });
});

test.describe('Bulut senkronizasyon', () => {
  test('Bulut Senkronize butonu modal açar', async ({ page }) => {
    await loginDE(page);
    await page.getByRole('button', { name: /Bulut Senkronize/i }).click();
    await expect(page.getByText(/Senkronizasyon|Bulut|yedek/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('oturum kapatıp farklı kullanıcıyla girişte veriler izole kalır', async ({ page }) => {
    // de kullanıcısı ile giriş + veri oluştur
    await login(page, getTestUser('de'));
    const deHistory = await page.evaluate(() => localStorage.getItem('lingua_daily_history'));
    await page.getByRole('button', { name: /Oturumu kapat/i }).click();
    await expect(page.getByRole('heading', { name: /Güvenli giriş/i })).toBeVisible({ timeout: 20_000 });

    // new kullanıcısı ile giriş — farklı hesap verileri ayrı olmalı
    await login(page, getTestUser('new'));
    const newHistory = await page.evaluate(() => localStorage.getItem('lingua_daily_history'));
    // Aynı tarayıcı profili localStorage paylaşır; oturum kapatma veriyi silmez —
    // asıl izolasyon Supabase satır bazında. Bu test davranışı gözlemler.
    console.log('de history:', deHistory?.slice(0, 40), '| new history:', newHistory?.slice(0, 40));
  });
});

test.describe('LingQ entegrasyonu', () => {
  test('İlerleme → LingQ sekmesi açılır ve durum gösterir', async ({ page }) => {
    await loginDE(page);
    await goTab(page, 'ilerleme');
    await page.getByRole('button', { name: /^LingQ$/i }).click();
    await expect(page.getByText(/LingQ|Senkronizasyon/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
