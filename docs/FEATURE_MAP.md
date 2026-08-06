# Özellik Haritası — Lingua Production Coach

Kod tabanından (2026-08-06) çıkarılmıştır. Kaynak: root `src/` (web + APK aynı bundle'dan üretilir; `apps/mobile/` stock şablon, ölü ağırlık).

## Genel mimari

- `main.tsx` → `ErrorBoundary` → `SupabaseAuthGate` (login) → `App` (6 sekme)
- State: localStorage (`lingua_prompts`, `lingua_items`, `lingua_fossilized`, `lingua_daily_history`, `lingua_session_seen`)
- AI: TÜM çağrılar Supabase Edge Function `lingua-web-api` üzerinden (`src/lib/linguaApi.ts` → `/functions/v1/lingua-web-api`)
- Senkronizasyon: `src/lib/supabaseDataSync.ts` (versiyon tabanlı merge, `CLOUD_DATA_APPLIED_EVENT` ile in-place güncelleme)
- FSRS: `src/lib/engine.ts` (deterministik zamanlama; AI yalnızca suggestedRating üretir)

## Sekmeler

| Sekme | Route id | Bileşen | Kritik akışlar |
|-------|----------|---------|----------------|
| Bugün | `bugun` | `BugunTab.tsx` | Günlük hedef, FSRS due kartlar, hızlı gezinme kartları |
| Üret (Pratik) | `uret` | `UretTab.tsx` | Türkçe kaynak cümle → hedef dilde cevap → AI değerlendirme → FSRS; ipucu merdiveni (6 seviye); kelime yardımı; ses |
| Gramer Koçu | `gramer_pratigi` | `GramerPratigiTab.tsx` | Hata profili + 2-3 dk mini ders + quiz; CEFR A1-C2 drill'ler + AI üretim |
| Nasıl Söylerim? | `nasil_soylerim` | `NasilSoylerimTab.tsx` | Türkçe → doğal/klinik/resmî seçenekler, öğrenme destesine ekle |
| Sohbet | `sohbet` | `SohbetTab.tsx` | Rol odaklı çok turlu sohbet (persona seçimi, AI yanıt, çeviri) |
| İlerleme & Hatalarım | `ilerleme` | `IlerlemeTab.tsx` | CEFR tahmini, aktivite, LingQ, hatalar, kelimeler, haftalık rapor, JSON yedek, veri temizleme |

## Kritik özellikler ve test durumu (2026-08-06)

| Özellik | Ekran | Beklenen | Test |
|---------|-------|----------|------|
| Kayıt/giriş | AuthGate | Yalnız giriş (kayıt kapalı), yanlış şifre reddi, oturum korunumu, çıkış | `e2e/auth.spec.ts` 7/7 |
| Oturum koruması | AuthGate | localStorage session, yenilemede açık, oturum kapatma | auth.spec |
| Üret: kaynak cümle | UretTab | Türkçe cümle render, tıklanabilir kelimeler | `uret.spec.ts` |
| Üret: cevap + değerlendirme | UretTab | AI değerlendirme sonucu + FSRS rating | uret.spec (canlı AI) |
| Üret: ipucu | UretTab | Varsayılan kapalı, butonla açılır, 6 seviye, küçültülebilir | uret.spec |
| Kelime yardımı | UretTab + VocabularyTooltip | Hedef dilde anlam, cache (dil+kelime anahtarlı) | uret.spec + vitest (VocabularyTooltip) |
| Gramer Koçu | GramerPratigiTab | Hata profili, mini ders, quiz, CEFR filtresi, AI drill/ipucu/değerlendirme | `other-tabs.spec.ts` 6/6 |
| Nasıl Söylerim? | NasilSoylerimTab | AI çeviri seçenekleri, deste ekleme | other-tabs |
| Sohbet | SohbetTab | Persona seçimi, mesaj gönderme, AI yanıt | other-tabs |
| İlerleme | IlerlemeTab | CEFR, istatistikler, alt sekmeler | navigation.spec |
| Dil değiştirme | Header | EN/DE/SR butonları | navigation.spec |
| Tema | Header | Koyu/aydınlık, localStorage korunumu | navigation.spec |
| Otomatik kayıt | App → localStorage | Cevap sonrası günlük sayaç + öğrenme kayıtları | `sync.spec.ts` |
| Bulut senkronizasyon | supabaseDataSync | Versiyonlu merge, CLOUD_DATA_APPLIED_EVENT | vitest 21 test + sync.spec |
| LingQ | IlerlemeTab (lingq) | Durum görüntüleme (canlı API anahtarı yoksa uyarı) | sync.spec |
| AI pedagojik doğruluk | Edge Function | Türkçe cevap reddi, karma dil, doğal varyant, yazım/gramer ayrımı | `scripts/ai-evaluate-regression.mjs` 11/11 |
| Responsive | tümü | Desktop 1440, mobile Pixel5, tablet 1024 | 3 Playwright projesi |
| Android | Capacitor bundle | Login + sekmeler + ipucu + gramer | `.maestro/` + CI workflow |

## AI action'ları (Edge Function `lingua-web-api`)

- `/api/evaluate` — cevap değerlendirme (CRITICAL LANGUAGE CHECK + doğal varyant kabulü + yazım/gramer ayrımı)
- `/api/how-do-i-say` — Nasıl Söylerim çeviri seçenekleri
- `/api/chat` — Sohbet yanıtı
- `/api/lookup-word` — kelime sözlüğü (hedef dilde anlam + Türkçe ikincil gloss)
- `/api/generate-grammar-drills` — CEFR'li drill üretimi (errorTopics'ten beslenir)
- `/api/generate-grammar-hint` — seviyeye göre ipucu
- `/api/generate-error-quiz` — kişisel hata quiz'i
- `/api/generate-production-prompts` — yeni üretim cümleleri (avoidSentences + errorTopics)
- `/api/assistant-chat` — FloatingAssistantChat eylemleri
- `/api/lingq/stats` — LingQ kart istatistikleri

## Bilinen sınırlamalar (2026-08-06)

- Android emülatörü VPS'te yok (KVM yok) — Maestro CI'da çalışır
- LingQ canlı API doğrulaması sunucuda `LINGQ_API_KEY` yokken yapılamadı
- Web geri butonu SPA tab geçişlerini history'ye yazmıyor (düşük öncelik)
- `apps/mobile/` stock Expo şablonu — APK root `src/` bundle'ından üretilir
