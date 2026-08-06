# Otonom QA Sistemi

Bu belge Lingua Production Coach repo'sundaki otonom kalite kontrol sistemini açıklar.

## Genel bakış

| Katman | Ne yapar | Nerede çalışır | Zamanlama |
|--------|----------|----------------|-----------|
| Gece taraması | Backend/Pages/APK canlılık + dist güncelliği | VPS (cron) | Her gün 03:00 |
| Haftalık keşifçi QA | Playwright E2E + AI regresyon, hata bulursa düzeltir + PR | VPS (cron) | Pazartesi 04:00 |
| PR check | Maestro Android E2E (emülatör) | GitHub Actions | Her PR |
| APK build | İmzalı release APK üretir | GitHub Actions | main push |

## VPS kurulumu

- Hermes home: `/opt/data` (HERMES_HOME env — `~/.hermes` varsayan scriptlere geçir)
- Playwright: `PLAYWRIGHT_BROWSERS_PATH=/opt/data/.playwright-browsers` (varsayılan `/opt/hermes/.playwright` yazılamıyor)
- Test kullanıcıları: repo `.env` içinde `E2E_TEST_DE/SR/NEW_*` (gitignore'lı, asla commit etme)
- Web server: `NODE_ENV=production PORT=3100 node dist/server.mjs` (PORT env desteği server.ts'te)

## Playwright testleri

```bash
cd /opt/data/projects/lingua-production
PLAYWRIGHT_BROWSERS_PATH=/opt/data/.playwright-browsers npx playwright test e2e --project=desktop-chromium
PLAYWRIGHT_BROWSERS_PATH=/opt/data/.playwright-browsers npx playwright test e2e --project=mobile-chromium
PLAYWRIGHT_BROWSERS_PATH=/opt/data/.playwright-browsers npx playwright test e2e --project=tablet-chromium
```

- Testler: `e2e/` — auth, navigation, uret (AI değerlendirme), other-tabs (gramer koçu/nasıl/sohbet), sync, exploratory
- Seçiciler: accessibility-first (role/name/label); kırılgan CSS/XPath'ten kaçın
- Artifact'ler: `test-results/artifacts/` (screenshot, video, trace), `playwright-report/` (HTML), `test-results/junit.xml`
- Retry ile geçen test `flaky` işaretlenir, normal başarı sayılmaz

## Maestro ve EAS testleri

- KVM yok → VPS'te Android emülatörü ÇALIŞMAZ. Android testleri GitHub Actions'ta:
  `.github/workflows/android-maestro-tests.yml` (ubuntu-latest, KVM mevcut, API 34 emülatör)
- Flow'lar: `.maestro/login.yaml`, `.maestro/navigation-uret.yaml`
- Gereken repo secret'ları: `E2E_TEST_DE_EMAIL`, `E2E_TEST_DE_PASSWORD`
- EAS kullanılmıyor (Capacitor tabanlı); APK GitHub Actions `build-android-apk.yml` ile üretilir

## Test kullanıcıları

| Rol | Email | Açıklama |
|-----|-------|----------|
| DE test | `lingua-qa-de@test.lingua` | Almanca senaryoları |
| SR test | `lingua-qa-sr@test.lingua` | Sırpça senaryoları |
| NEW test | `lingua-qa-new@test.lingua` | Boş kullanıcı (kayıt/ilk kullanım) |

Oluşturma: Supabase admin API + `allowed_users` whitelist tablosuna email ekleme
(`handle_new_user()` trigger'ı whitelist kontrolü yapar). Şifreler yalnızca `.env`'de.

## AI değerlendirme regresyon testi

```bash
node scripts/ai-evaluate-regression.mjs [--repeat=N]
```

- Canlı Edge Function'a gerçek istek atar (mock yok)
- 11 senaryo: Türkçe cevap reddi, doğal varyant, karma dil, gramer, yazım, Sırpça
- Şema doğrulaması: overallVerdict/errorSeverity/suggestedRating enum'ları
- Çıktı: `test-results/ai-evaluate.json`

## Environment değişkenleri (repo .env — gitignore'lı)

| Değişken | Kullanım |
|----------|----------|
| `SUPABASE_ACCESS_TOKEN` | supabase CLI deploy |
| `E2E_TEST_DE/SR/NEW_EMAIL` | Playwright/AI test girişi |
| `E2E_TEST_DE/SR/NEW_PASSWORD` | Test kullanıcısı şifresi |
| `E2E_TEST_DE/SR/NEW_USER_ID` | Edge whitelist için kullanıcı ID'leri |

Supabase Edge Function secret'ları: `ALLOWED_USER_IDS` (virgülle ayrılmış whitelist,
varsayılan: Enes'in kullanıcı ID'si `DEFAULT_ALLOWED_USER_ID`).

## Claude Sonnet rolü

- Kök neden analizi, bağımsız kod incelemesi, pedagojik denetim (read-only)
- Komut: `claude -p "$(cat prompt.md)" --model sonnet --allowedTools "Read,Grep,Glob,Bash,Bash(git *)"`
- Prompt'u dosyaya yaz (Türkçe apostrof bash-quoting'i bozar)
- Claude ASLA kod düzeltmez — yalnızca analiz/rapor (Hermes uygular)

## Hermes onarım döngüsü

1. Hatayı yeniden üret (test/screenshot/video/trace/log)
2. Sınıflandır: uygulama kodu / UI / test / env / ağ / harici servis / AI kararsızlığı / pedagojik
3. Regresyon testi yaz → düzeltmeden önce BAŞARISIZ olduğunu doğrula
4. En küçük güvenli düzeltmeyi ayrı branch'te yap
5. Hedef test + ilgili testler + tam gate (typecheck, lint, vitest, build, Playwright)
6. Edge Function değiştiyse redeploy + canlı doğrula
7. Claude Sonnet'e bağımsız denetim yaptır
8. Kritik/yüksek açık kalmadıysa PR + APK

## Zamanlanmış görevler

| Job | Zaman | Görev |
|-----|-------|-------|
| `lingua-saglik-izleyici` | 08:00 günlük | Edge/Pages/APK canlılık, otonom düzeltme |
| `lingua-gece-qa` | 03:00 günlük | dist güncelliği + canlılık taraması |
| `lingua-haftalik-kesif-qa` | Pzt 04:00 | E2E + AI regresyon + keşif, hata→PR |

## Telegram raporlaması

Anlamlı durumlarda: kurulum tamamlandı, kritik hata bulundu/düzeltildi, PR açıldı,
APK hazır, build başarısız, gece taraması özeti. Branch, commit, test sayıları, PR/APK
bağlantısı belirtilir; secret asla yazılmaz.

## Hata artifact'leri

- Playwright: `test-results/artifacts/<test-adı>/` (screenshot + video + trace + error-context)
- AI: `test-results/ai-evaluate.json`
- Maestro: GitHub Actions artifact `maestro-report/`
- Trace görüntüleme: `npx playwright show-trace <trace.zip>`

## Manuel müdahale gereken durumlar

- Supabase dashboard girişi (tarayıcı login)
- Yeni API anahtarı (OpenAI/Anthropic — Hermes'te yok)
- Ücretli servis satın alma
- Ana branch'e merge onayı (PR'lar Enes tarafından merge edilir)
- Geri döndürülemez üretim verisi silme

## Sistemin yeniden başlatılması / kaldığı yerden devam

- Çalışma kaydı: `/opt/data/worklogs/lingua-qa-<tarih>.md` (repo dışında, VPS'te)
- Kayıt: aktif branch, son commit, tamamlananlar, başarısız testler, hipotezler, sonraki adım
- Web server'ı yeniden başlat: `cd /opt/data/projects/lingua-production && NODE_ENV=production PORT=3100 node dist/server.mjs`
- 3100 portunda yanlış repo server'ı varsa öldür: `ps aux | grep server.mjs` → eski process'i kill et

## Yeni özellik için test ekleme

1. Özellik haritasına ekle (docs/FEATURE_MAP.md)
2. E2E spec ekle (`e2e/<ozellik>.spec.ts`) — accessibility-first seçiciler
3. AI çıktısı varsa regresyon senaryosu ekle (`scripts/ai-evaluate-regression.mjs`)
4. Unit test (vitest) — mantık `src/lib/*.ts`'e taşınabilirse
5. Tam gate'i çalıştır (typecheck, lint, vitest, build, Playwright desktop+mobile+tablet)

## Güvenlik kuralları

- `.env`, API anahtarı, token commit etme (`.gitignore` korur)
- Edge Function secret'ları: `ALLOWED_USER_IDS` env'den, koda gömme
- Service role key'i asla çıktıya/loga yazma (yalnızca Python subprocess içinde kullan)
- Test kullanıcıları whitelist'e eklenir; üretim kullanıcı verisi testlerde değiştirilmez
- Prompt injection: `<user_data>` guard'ı Edge Function'da zorunlu
