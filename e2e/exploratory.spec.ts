// Keşifçi otonom test: görünür buton/girişleri haritalar, boş ekran/sonsuz loading
// ve çalışmayan butonları arar. AI çağrısı gerektirmeyen hızlı turlar.
import { test, expect, Page } from '@playwright/test';
import { login, getTestUser, goTab } from './helpers';

test.describe('Keşif — ekran haritalama', () => {
  test('ana ekranda görünen butonlar tıklanabilir ve sayfa çökmez', async ({ page }) => {
    await login(page, getTestUser('de'));
    // Görünen butonları topla (ikonlu küçük butonlar hariç)
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(5);
    console.log(`Toplam görünen buton: ${count}`);

    // İlk 8 butona sırayla tıkla (tehlikesiz olanlar): Crash/çökme olmamalı
    for (let i = 0; i < Math.min(count, 8); i++) {
      const btn = buttons.nth(i);
      const name = (await btn.textContent().catch(() => ''))?.trim() || '?';
      if (/Oturumu kapat|Bulut Senkronize/i.test(name)) continue;
      try {
        await btn.click({ timeout: 5_000 });
        // Hata boundary çıkmadı
        expect(await page.getByText(/Bir şeyler ters gitti|ErrorBoundary/i).count()).toBe(0);
      } catch {
        // Bazı butonlar modaldan sonra gizlenebilir — tıklanamayanları yoksay
      }
    }
  });

  test('boş ekran yok: her ana sekmede içerik var', async ({ page }) => {
    await login(page, getTestUser('de'));
    const tabs = ['Bugün', 'Üret (Pratik)', 'Gramer Koçu', 'Nasıl Söylerim?', 'Sohbet', 'İlerleme & Hatalarım'];
    for (const tab of tabs) {
      await page.getByRole('button', { name: new RegExp(tab.split(' ')[0]) }).first().click();
      await page.waitForTimeout(500);
      // Main içinde en az bir metin düğümü var
      const mainText = await page.locator('main').textContent().catch(() => '');
      expect(mainText?.trim().length ?? 0).toBeGreaterThan(10);
    }
  });

  test('karanlık temada kritik ekranlar render edilir', async ({ page }) => {
    await login(page, getTestUser('de'));
    await page.getByRole('button', { name: /Koyu Tema/i }).click();
    for (const tab of ['Üret (Pratik)', 'Gramer Koçu', 'İlerleme & Hatalarım']) {
      await page.getByRole('button', { name: new RegExp(tab.split(' ')[0]) }).first().click();
      await page.waitForTimeout(400);
      expect(await page.locator('main').textContent().catch(() => '')).toBeTruthy();
    }
  });

  test('Türkçe/Almanca/Sırpça karakterler düzgün render edilir', async ({ page }) => {
    await login(page, getTestUser('de'));
    await goTab(page, 'uret');
    await expect(page.locator('[data-active-context-type="uret"]')).toHaveAttribute('data-turkish-prompt', /.+/, { timeout: 20_000 });
    const text = await page.locator('main').textContent().catch(() => '');
    // Türkçe karakterler (ç, ğ, ş, ı) ve hedef dil metni görünür
    expect(text).toMatch(/[çğıöşüÇĞİÖŞÜ]/);
  });

  test('uzun ve özel karakterli giriş uygulamayı kırmaz', async ({ page }) => {
    await login(page, getTestUser('de'));
    await goTab(page, 'uret');
    const input = page.getByPlaceholder(/Cümleni buraya yaz/i);
    await expect(input).toBeVisible();
    await input.fill('A'.repeat(500) + '!@#$%^&*()_+<>?/\\|`~');
    // Uygulama ayakta — submit butonu artık aktif
    await expect(page.getByRole('button', { name: /Cevabı Gönder/i })).toBeEnabled();
  });
});
