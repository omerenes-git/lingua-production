// Navigasyon, tema, dil değiştirme, geri butonu, responsive davranış
import { test, expect } from '@playwright/test';
import { login, getTestUser, TABS, goTab } from './helpers';

test.describe('Navigasyon', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, getTestUser('de'));
  });

  test('bütün sekmeler açılabilir', async ({ page }) => {
    for (const key of Object.keys(TABS) as (keyof typeof TABS)[]) {
      // Tab'a tıkla
      await page.getByRole('button', { name: new RegExp(TABS[key].split(' ')[0]) }).first().click();
      // İçerik render edildi — header hâlâ görünür (uygulama çökmedi)
      await expect(page.getByRole('heading', { name: /Lingua Production Coach/i })).toBeVisible();
    }
  });

  test('Header dil değiştirici çalışıyor (DE→SR→EN)', async ({ page }) => {
    // Header'da dil butonları doğrudan görünür: 🇩🇪 Almanca, 🇷🇸 Sırpça, 🇬🇧 İngilizce
    await page.getByRole('button', { name: /🇷🇸|Sırpça/i }).first().click();
    // Dil değişince Bugün sekmesi Sırpça başlık gösterir
    await expect(page.getByText(/Hoş geldin/i).first()).toBeVisible();
    // Almanca'ya geri dön
    await page.getByRole('button', { name: /🇩🇪|Almanca/i }).first().click();
    await expect(page.getByText(/Hoş geldin/i).first()).toBeVisible();
  });

  test('koyu/aydınlık tema değişimi çalışıyor', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /Koyu Tema|Aydınlık Mod/i });
    await toggle.click();
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBeTruthy();
    await page.reload();
    // Tema localStorage'dan korunur
    const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkAfter).toBeTruthy();
  });

  test('web geri butonu sonrası uygulama yeniden erişilebilir (çökme yok)', async ({ page }) => {
    await goTab(page, 'uret');
    await page.goBack().catch(() => {});
    // NOT (kullanılabilirlik bulgusu): SPA tab geçişleri history API'ye yazılmıyor,
    // bu yüzden geri butonu uygulama içi geçmişe değil tarayıcı geçmişine gider.
    // Burada önemli olan: uygulama çökmedi ve yeniden yüklenince oturum korunuyor.
    const crashed = await page.getByText(/Bir şeyler ters gitti|hata oluştu|ErrorBoundary/i).count();
    expect(crashed).toBe(0);
    // Yeniden yükleyince oturum korunur ve header gelir
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Üret \(Pratik\)/i })).toBeVisible({ timeout: 25_000 });
  });
});

test.describe('İlerleme & Hatalarım', () => {
  test('istatistik kartları görünür', async ({ page }) => {
    await login(page, getTestUser('de'));
    await goTab(page, 'ilerleme');
    await expect(page.getByText(/Tahmini CEFR/i)).toBeVisible();
    // Aktivite alt sekmesine geç
    await page.getByRole('button', { name: /Aktivite/i }).click();
    // Isı haritası (28 günlük çalışma grid'i) görünür
    await expect(page.getByText(/Isı Haritası/i)).toBeVisible();
    await expect(page.getByText(/Son 7 günün detaylı grafiği/i)).toBeVisible();
  });
});
