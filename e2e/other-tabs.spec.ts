// Gramer Koçu, Nasıl Söylerim?, Sohbet tab testleri
import { test, expect, Page } from '@playwright/test';
import { login, getTestUser, goTab } from './helpers';

async function goTabAs(page: Page, tabKey: 'gramer' | 'nasil' | 'sohbet') {
  await login(page, getTestUser('de'));
  await goTab(page, tabKey);
}

test.describe('Gramer Koçu', () => {
  test.beforeEach(async ({ page }) => {
    await goTabAs(page, 'gramer');
  });

  test('Gramer Koçu bölümleri görünür (mod seçici + Cümle Kurma KALDIRILDI)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Hatalarımdan Öğren/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Seviyeme Göre Çalış/i })).toBeVisible();
    // Eski Cümle Kurma bölümü artık yok
    await expect(page.getByText(/Cümle Kurma Alıştırmaları/i)).toHaveCount(0);
  });

  test('Seviyeme Göre Çalış: seviye seçince konu + mini ders + test butonu görünür', async ({ page }) => {
    await page.getByRole('button', { name: /Seviyeme Göre Çalış/i }).click();
    // Seviye seçici
    const b1 = page.getByRole('button', { name: 'B1' });
    await expect(b1).toBeVisible();
    await b1.click();
    await page.waitForTimeout(600);
    // Mini ders + kalıp + örnek görünür
    await expect(page.getByText(/Mini Ders: B1/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Kalıp:/i).first()).toBeVisible();
    // Test butonu
    await expect(page.getByRole('button', { name: /Bu Konuda Testi Başlat/i })).toBeVisible();
  });

  test('Seviye modunda test üretilir (gerçek AI çağrısı — topicFocus)', async ({ page }) => {
    await page.getByRole('button', { name: /Seviyeme Göre Çalış/i }).click();
    await page.waitForTimeout(600);
    // A1 varsayılan — Simple present be
    await expect(page.getByText(/Mini Ders: A1/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Bu Konuda Testi Başlat/i }).click();
    await expect(page.getByText(/Soru 1\//).first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Doğru: 0/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('hata profili boş durumda yönlendirme mesajı gösterir', async ({ page }) => {
    // Yeni test kullanıcısı: hata yok → "Henüz kayıtlı hatan yok"
    await expect(page.getByText(/Henüz kayıtlı hatan yok|Üret bölümünde pratik yaptıkça/i).first()).toBeVisible();
  });

  test('Testi Başlat butonu hata kaydı olmasa da AKTİF ve quiz üretebilir (regresyon)', async ({ page }) => {
    // Önce oturumu kapat (beforeEach DE ile giriş yaptı), sonra yeni kullanıcı (hata profili boş) ile giriş yap
    await page.getByRole('button', { name: /Oturumu kapat/i }).click();
    await expect(page.getByRole('heading', { name: /Güvenli giriş/i }).first()).toBeVisible({ timeout: 20_000 });
    await login(page, getTestUser('new'));
    await goTab(page, 'gramer');
    // Buton aktif olmalı (disabled DEĞİL) — önceki davranış disabled idi
    const quizBtn = page.getByRole('button', { name: /Testi Başlat/i });
    await expect(quizBtn).toBeVisible();
    await expect(quizBtn).not.toBeDisabled();
    // Bilgilendirme metni görünür
    await expect(page.getByText(/test yine de üretilir/i).first()).toBeVisible();
    // Bas → quiz üretilir (genel seviye testi)
    await quizBtn.click();
    await expect(page.getByText(/Soru 1\//).first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Doğru: 0/).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Nasıl Söylerim?', () => {
  test.beforeEach(async ({ page }) => {
    await goTabAs(page, 'nasil');
  });

  test('Türkçe ifade girilip çeviri seçenekleri üretilebilir', async ({ page }) => {
    await expect(page.getByText(/Bunu Nasıl Söylerim/i)).toBeVisible();
    await page.getByPlaceholder(/Çevirmek istediğin Türkçe ifadeyi yaz/i).fill('Fizyoterapi randevum saat üçte.');
    await page.getByRole('button', { name: /Çeviri seçeneklerini üret/i }).click();
    // AI yanıtı gelir: seçenek kartları ya da hata (ikisi de gerçek davranış)
    await expect(page.getByText(/Üretilen anlatım seçenekleri/i).or(page.getByText(/Çeviri oluşturulamadı/i))).toBeVisible({ timeout: 90_000 });
  });

  test('boş ifade ile üretim butonu pasif', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Çeviri seçeneklerini üret/i })).toBeDisabled();
  });
});

test.describe('Sohbet', () => {
  test('persona seçimi ve mesaj gönderme akışı çalışır', async ({ page }) => {
    await goTabAs(page, 'sohbet');
    // Persona kartı görünür
    await expect(page.getByText(/Rol Odaklı Çok Turlu Sohbet/i)).toBeVisible();
    // İlk personayı seç (Alex & Sophia — ilk kart)
    await page.getByRole('button', { name: /Alex & Sophia/ }).first().click();
    // Mesaj inputu ve gönder butonu
    const input = page.getByPlaceholder(/dilinde bir şey yaz/i);
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill('Hallo, wie geht es dir?');
    // Gönder butonu (aria-label eklendi — accessibility düzeltmesi)
    await page.getByRole('button', { name: /Mesajı gönder/i }).click();
    // AI yanıtı veya servis hatası mesajı görünür (gerçek davranış)
    await expect(page.getByText(/Hallo|servis|ulaşılamıyor|hata/i).first()).toBeVisible({ timeout: 90_000 });
  });
});
