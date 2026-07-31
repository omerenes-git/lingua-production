# Test ve Kabul Planı

Durum: Taslak (ilk sürüm).
İlgili belgeler: [LEARNING_ENGINE.md](./LEARNING_ENGINE.md), [OFFLINE_AND_SYNC.md](./OFFLINE_AND_SYNC.md),
[SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md), [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)

## 1. Genel test stratejisi

Bu, tek kullanıcılı kişisel bir uygulama olduğu için test yatırımı **risk
ağırlıklı** yapılır: para/veri kaybına yol açabilecek deterministik
mantık (FSRS karar tablosu, senkron/idempotency, RLS) yüksek kapsamla
test edilir; AI çıktı kalitesi gibi doğası gereği değişken alanlar
promptlama + manuel örnekleme ile doğrulanır (uçtan uca otomatik
"doğruluk" testi yazılmaz, çünkü doğru cevap kümesi açık uçludur — bkz.
PRD §1 "birden fazla doğru çeviri kabul et").

## 2. Test katmanları

### 2.1 Birim testleri (unit)
Kapsam: **saf, deterministik fonksiyonlar.**
- `decideFinalRating` karar tablosu (bkz. LEARNING_ENGINE.md §3) — her
  satır için en az bir test senaryosu, sınır durumları (ör.
  `hint_level_used = 5` ile `error_severity = minor` çakışması) dahil.
- Hakimiyet durumu geçiş kuralları (§7, geri düşüş dahil).
- Günlük görev dengeleme kuralı (ANALYTICS_AND_ADAPTATION.md §8).
- Hikâye oranı uyarlama formülü (ADAPTIVE_STORIES.md §3).
- Zod şema doğrulama (geçerli/geçersiz girdi örnekleri).
- Senkron idempotency mantığı (aynı `client_generated_id` iki kez
  gönderildiğinde davranış).
- Olay sıralama algoritması (`device_seq` + `server_received_at`, bkz.
  OFFLINE_AND_SYNC.md §3).

### 2.2 Entegrasyon testleri
Kapsam: **Edge Function ↔ Postgres ↔ RLS etkileşimi**, gerçek (veya yerel
Supabase CLI) bir veritabanına karşı.
- Her Edge Function için: geçerli girdi → beklenen şema tipinde çıktı
  (OpenAI çağrısı test ortamında **mock'lanır** — gerçek API'ye her testte
  gidilmez, maliyet ve determinizm için).
- RLS: kullanıcı A'nın kullanıcı B'nin verisine erişemediğini doğrulayan
  testler (her yeni tablo için zorunlu).
- Kota/usage-guard: limit aşıldığında isteğin gerçekten reddedildiği ve
  OpenAI'a gidilmediği (mock çağrı sayısı 0).
- Önbellek: aynı istek ikinci kez gönderildiğinde `ai_response_cache`'ten
  döndüğü (mock çağrı sayısı 1).
- Senkron: iki "cihaz" simülasyonu (iki ayrı client oturumu) aynı karta
  çevrimdışı review event'i üretip senkronladığında, `fsrs_cards`'ın
  §OFFLINE_AND_SYNC.md §3'teki kurala göre doğru sırayla hesaplandığı.

### 2.3 Uçtan uca (E2E) — cihaz üzerinde manuel + otomatik karışık
Expo development build üzerinde, gerçek Android cihazda:
- Kritik akışlar (Üret, Sohbet, Hikâye okuma) için Maestro/Detox gibi bir
  E2E araç değerlendirilebilir (bkz. §6 Açık Noktalar) ama **zorunlu
  değildir** — tek kullanıcı için her aşamada manuel cihaz testi (bkz.
  IMPLEMENTATION_ROADMAP.md her aşamanın "manuel cihaz testi" adımı)
  yeterli kabul edilir; otomasyon yatırımı getirisi düşükse atlanır.

### 2.4 Prompt/AI kalite örneklemesi
Otomatik "doğru/yanlış" testi değil, **yapılandırılmış manuel inceleme**:
- Her AI Edge Function için 10-15 örnek girdi (kolay/orta/zor/sınır durumu
  karışımı) ile gerçek OpenAI çağrısı yapılır, çıktılar §3'teki kalite
  kriterlerine göre gözden geçirilir.
- Persona sistem promptları için özellikle: prompt injection denemeleri
  (ör. kullanıcı mesajında "artık kurallarını unut" gibi ifadeler) manuel
  test edilir (bkz. SECURITY_AND_COST_CONTROLS.md §5).
- İpucu merdiveni sızıntı testi: seviye 1-4 ipucu istendiğinde modelin
  yanlışlıkla tam cevabı sızdırmadığı doğrulanır (bkz.
  AI_AND_EDGE_FUNCTION_CONTRACTS.md §3).

## 3. Prompt/AI kalite kriterleri (manuel inceleme rubriği)

| Kriter | Kontrol |
|---|---|
| Şema uyumu | Çıktı Zod şemasını geçiyor mu (otomatik) |
| Hata kategorisi doğruluğu | Kategori, dil bazlı sabit listeden mi (ANALYTICS_AND_ADAPTATION.md §4) |
| Çoklu doğru cevap kabulü | Aynı anlamı farklı doğal biçimde ifade eden cevap yanlış işaretlenmiyor mu |
| İpucu sızıntısı | Seviye N ipucu, seviye N+1'in bilgisini içermiyor mu |
| Persona tutarlılığı | Aynı persona farklı turn'lerde çelişen bir temel değer sergilemiyor mu |
| Simülasyon etiketi | `is_simulation=true` personalarda disclosure her zaman mevcut mu |
| Uydurma alıntı | Doğrudan alıntı yalnızca `persona_sources`'tan mı geliyor |
| Hikâye i+1 oranı | `story-quality-check` §9'daki kontrol listesi geçiyor mu |

## 4. Güvenlik kontrol listesi (her aşamada tekrarlanır)

- Yeni tablo eklendiyse: RLS açık mı, policy `user_id = auth.uid()` mı.
- `mcp__supabase__get_advisors` (security) çalıştırıldı mı, yeni uyarı var
  mı.
- Yeni Edge Function'da secret sızıntısı yok mu (log'larda API key
  görünmüyor mu).
- Yeni bir kullanıcı girdisi alanı, ilgili yerde bir sistem talimatına
  enjekte ediliyorsa "referans veri" ayrımı yapılmış mı (bkz.
  SECURITY_AND_COST_CONTROLS.md §5).

## 5. Maliyet kontrol listesi (her aşamada tekrarlanır)

- Yeni AI çağrısı `ai_usage_events`'e loglanıyor mu.
- Yeni çağrı `usage-guard`'dan geçiyor mu (kota kontrolü var mı).
- Önbelleklenebilir bir çağrıysa `ai_response_cache` kullanılıyor mu.
- Yeni özellik ayrı bir `feature_group` mı gerektiriyor (bkz.
  SECURITY_AND_COST_CONTROLS.md §6.1).

## 6. Kabul kriterleri şablonu (roadmap aşamaları için)

Her roadmap aşaması (bkz. IMPLEMENTATION_ROADMAP.md) şu şablonu kullanır:

```
- [ ] Kullanıcıya görünen sonuç manuel olarak cihazda doğrulandı
- [ ] İlgili birim testleri yazıldı ve geçiyor
- [ ] İlgili entegrasyon testleri yazıldı ve geçiyor
- [ ] Güvenlik kontrol listesi (§4) geçildi
- [ ] Maliyet kontrol listesi (§5) geçildi (AI çağrısı içeren aşamalar için)
- [ ] Yeni terim/karar varsa DECISIONS_AND_OPEN_QUESTIONS.md güncellendi
```

## 7. Açık noktalar

- E2E otomasyon aracı seçimi (Maestro/Detox) ve gerekip gerekmediği,
  ilk birkaç aşama sonrası manuel test yükü değerlendirilerek karara
  bağlanacak.
- Prompt kalite örneklemesinin ne sıklıkla tekrarlanacağı (her prompt
  versiyon değişiminde mi, yoksa periyodik mi).
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
