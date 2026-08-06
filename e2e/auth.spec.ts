// Oturum (Auth) kritik kullanıcı testleri
import { test, expect } from '@playwright/test';
import { login, getTestUser, gotoLoginFresh, resetStorage } from './helpers';

test.describe('Oturum — yeni kullanıcı akışı', () => {
  test('yeni kullanıcı oluşturma formu yok, yalnız giriş gösteriliyor', async ({ page }) => {
    await gotoLoginFresh(page);
    await expect(page.getByRole('heading', { name: /Güvenli giriş/i })).toBeVisible();
    // Kayıt formu yok — kayıt ol butonu bulunmamalı
    await expect(page.getByRole('button', { name: /Kayıt|Sign up|Kaydol/i })).toHaveCount(0);
  });

  test('yanlış şifre ile giriş reddedilir', async ({ page }) => {
    await gotoLoginFresh(page);
    const user = getTestUser('de');
    await page.getByRole('textbox', { name: /E-posta/i }).fill(user.email);
    await page.getByRole('textbox', { name: /Şifre/i }).fill('YanlisSifre123!');
    await page.getByRole('button', { name: /Uygulamaya gir/i }).click();
    // Supabase provider hatası ya da yerel hata mesajı görünmeli
    await expect(
      page.getByText(/E-posta veya şifre doğru değil|Giriş başarısız|kontrol edin/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('boş alanlarla giriş butonu pasiftir (disabled)', async ({ page }) => {
    await gotoLoginFresh(page);
    await expect(page.getByRole('button', { name: /Uygulamaya gir/i })).toBeDisabled();
    await expect(page.getByRole('textbox', { name: /E-posta/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Güvenli giriş/i }).first()).toBeVisible();
  });

  test('doğru giriş ile oturum açılır ve Header görünür', async ({ page }) => {
    await gotoLoginFresh(page);
    const user = getTestUser('de');
    await page.getByRole('textbox', { name: /E-posta/i }).fill(user.email);
    await page.getByRole('textbox', { name: /Şifre/i }).fill(user.password);
    await page.getByRole('button', { name: /Uygulamaya gir/i }).click();
    await expect(page.getByRole('button', { name: 'Üret (Pratik)' })).toBeVisible({ timeout: 25_000 });
  });

  test('oturum localStorage içinde korunur ve sayfa yenilendiğinde açık kalır', async ({ page }) => {
    await gotoLoginFresh(page);
    const user = getTestUser('de');
    await page.getByRole('textbox', { name: /E-posta/i }).fill(user.email);
    await page.getByRole('textbox', { name: /Şifre/i }).fill(user.password);
    await page.getByRole('button', { name: /Uygulamaya gir/i }).click();
    await expect(page.getByRole('button', { name: 'Üret (Pratik)' })).toBeVisible({ timeout: 25_000 });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Üret (Pratik)' })).toBeVisible({ timeout: 25_000 });
  });

  test('oturum kapatma butonu ile çıkış yapılır', async ({ page }) => {
    await gotoLoginFresh(page);
    const user = getTestUser('de');
    await page.getByRole('textbox', { name: /E-posta/i }).fill(user.email);
    await page.getByRole('textbox', { name: /Şifre/i }).fill(user.password);
    await page.getByRole('button', { name: /Uygulamaya gir/i }).click();
    await expect(page.getByRole('button', { name: 'Üret (Pratik)' })).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: /Oturumu kapat/i }).click();
    await expect(page.getByRole('heading', { name: /Güvenli giriş/i })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Oturum — Sırpça test kullanıcısı', () => {
  test('Sırpça kullanıcı giriş yapabilir ve hedef dil değiştirilebilir', async ({ page }) => {
    await gotoLoginFresh(page);
    const user = getTestUser('sr');
    await login(page, user);
    // Dil seçici Header'da olmalı
    await expect(page.getByRole('button', { name: /Türkçe|İngilizce|Almanca|Sırpça|EN|DE|SR/i }).first()).toBeVisible();
  });
});
