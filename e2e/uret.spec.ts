// Üret (Pratik) tab — kritik kullanıcı testleri
import { test, expect, Page } from '@playwright/test';
import { login, getTestUser, goTab } from './helpers';

/** Almanca'ya geç ve Üret sekmesine git. */
async function goUretGerman(page: Page) {
  await login(page, getTestUser('de'));
  // Header'da dil değiştir: 🇩🇪 Almanca
  await page.getByRole('button', { name: /Almanca/i }).first().click();
  await goTab(page, 'uret');
  // Prompt yüklenene kadar bekle (data-turkish-prompt dolu olmalı)
  await expect(page.locator('[data-active-context-type="uret"]')).toHaveAttribute('data-turkish-prompt', /.+/, { timeout: 20_000 });
}

test.describe('Üret bölümü — Almanca', () => {
  test.beforeEach(async ({ page }) => {
    await goUretGerman(page);
  });

  test('Türkçe kaynak cümle görünür', async ({ page }) => {
    const turkishPrompt = await page.locator('[data-active-context-type="uret"]').getAttribute('data-turkish-prompt');
    expect(turkishPrompt).toBeTruthy();
    // Kaynak cümle ekranda görünür
    await expect(page.getByText(turkishPrompt!, { exact: false }).first()).toBeVisible();
  });

  test('cevap yazılıp gönderilebilir ve AI değerlendirme döner', async ({ page }) => {
    // Almanca modda olduğumuzu doğrula (coach guide Almanca olmalı)
    const guide = await page.getByRole('heading', { name: /Rehberi/i }).first().textContent();
    expect(guide).toContain('Almanca');

    // Cevap alanına hedef dilde (Almanca) makul bir cevap yaz — doğruluğu AI'ya bırak
    await page.getByPlaceholder(/Cümleni buraya yaz/i).fill('Ich lerne Deutsch jeden Tag.');
    await page.getByRole('button', { name: /Cevabı Gönder/i }).click();

    // Sonuç kartı görünür: verdict + rating + açıklama
    await expect(page.getByText(/Kusursuz Üretim|Doğal Varyasyon|Küçük Hata|Yanlış/i).first()).toBeVisible({ timeout: 90_000 });
    // Sonuç kartı data-evaluation-verdict ile de doğrulanabilir
    await expect(page.locator('[data-active-context-type="uret"]')).toHaveAttribute('data-evaluation-verdict', /correct|natural_variant|minor_issue|major_issue|incorrect/, { timeout: 90_000 });
  });

  test('rehber banner varsayılan kapalı, butonla açılır ve kapanır (sadeleştirme regresyonu)', async ({ page }) => {
    // Varsayılan kapalı: uzun tavsiye metni görünmemeli, buton görünür
    const bannerBtn = page.getByRole('button', { name: /rehberini aç veya kapat/i });
    await expect(bannerBtn).toBeVisible();
    await expect(bannerBtn).toHaveAttribute('aria-expanded', 'false');
    // Aç → tavsiye metni görünür (Almanca rehber: V2 kuralı/zihinsel yükü)
    await bannerBtn.click();
    await expect(bannerBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/V2 kuralı|zihinsel yükü|Özne \+ Fiil \+ Nesne|SVO|bağlaçsız/i).first()).toBeVisible();
    // Kapat → tekrar gizli
    await bannerBtn.click();
    await expect(bannerBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('ipucu varsayılan kapalı, kompakt butonla açılır, seviyeler artar', async ({ page }) => {
    // Kapalı: ipucu içeriği görünmemeli, buton görünür
    await expect(page.getByText(/Adım Adım Dil Koçu İpucu Rehberi/i)).not.toBeVisible();
    const hintButton = page.getByRole('button', { name: /İpucu Al/i });
    await expect(hintButton).toBeVisible();

    // Aç
    await hintButton.click();
    await expect(page.getByText(/İpucu Rehberi/i)).toBeVisible();
    // Başlangıç seviyesi 0: henüz ipucu istemediniz mesajı
    await expect(page.getByText(/Henüz ipucu istemediniz/i)).toBeVisible();

    // + Seviye 1 İpucu Aç → seviye 1 içeriği görünür
    await page.getByRole('button', { name: /\+ Seviye 1 İpucu Aç/i }).click();
    await expect(page.getByText(/1\. Cümle İskeleti/i)).toBeVisible({ timeout: 10_000 });

    // Küçült → tekrar kapalı
    await page.getByRole('button', { name: /Küçült/i }).click();
    await expect(page.getByText(/Adım Adım Dil Koçu İpucu Rehberi/i)).not.toBeVisible();
  });

  test('kelime yardımı hedef dilde açılır (InteractiveWordDictionary)', async ({ page }) => {
    // Kaynak cümledeki ilk tıklanabilir kelime butonuna tıkla
    const wordButtons = page.locator('button[title="Sözlükte Gör / LingQ Olarak Ekle"]');
    await expect(wordButtons.first()).toBeVisible();
    await wordButtons.first().click();
    // Dictionary modal açılmalı — hedef dil (Almanca) anlamı gösterilmeli
    await expect(page.getByText(/Anlam|Bedeutung|Značenje|Meaning/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('boş cevap gönderilemez (buton pasif)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Cevabı Gönder/i })).toBeDisabled();
  });
});
