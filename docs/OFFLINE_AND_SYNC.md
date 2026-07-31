# Çevrimdışı Kullanım ve Çoklu Cihaz Senkronu

Durum: Taslak (ilk sürüm).
İlgili belgeler: [DATA_MODEL.md](./DATA_MODEL.md) §1, §3, [ARCHITECTURE.md](./ARCHITECTURE.md) §3

## 1. Senaryo

Aynı kişisel hesap 3-4 Android cihazda kullanılır. Cihazlar aynı anda
çevrimdışı olabilir, aynı kartı aynı gün farklı cihazlarda çalışmış
olabilir, ya da uzun süre senkron olmadan kullanılmış olabilir. Tasarımın
önceliği: **veri kaybı asla olmaz; çift sayım asla olmaz; çakışma
sessizce yok sayılmaz.**

## 2. Temel desen: event-sourcing + türetilmiş durum

Bkz. DATA_MODEL.md §1 madde 1. Bunun senkron açısından sonucu:

- **Append-only tablolar** (`review_events`, `production_attempts`,
  `production_attempt_hints`, `chat_messages`, `chat_message_helpers`,
  `story_exercise_attempts`, `ai_usage_events` vb.) senkronda yalnızca
  **eklenir**, hiçbir zaman üzerine yazılmaz. İki cihaz aynı anda farklı
  olaylar üretse bile, ikisi de sunucuya ulaşır — çakışma diye bir şey
  yoktur, sadece "sırayla ekleme" vardır.
- **Türetilmiş durum tabloları** (`fsrs_cards`, `learning_item_states`)
  asla doğrudan istemciden yazılmaz; yalnızca sunucu tarafında (Edge
  Function veya bir Postgres trigger/RPC), ilgili append-only olaylar
  eklendiğinde **yeniden hesaplanır** (fold/reduce). Bu, "iki cihaz aynı
  kartı aynı anda güncelledi" sınıfındaki tüm çakışmaları ortadan
  kaldırır çünkü hiçbir istemci `fsrs_cards` satırına doğrudan yazmaz.

## 3. Aynı kartın iki cihazda çevrimdışı çalışılması

Senaryo: Cihaz A çevrimdışı iken kart X'i çalışır (`again`), Cihaz B da
çevrimdışıyken aynı kart X'i çalışır (`good`), ikisi de daha sonra
senkronlanır.

Çözüm:
1. Her iki `review_events` satırı da (istemci `created_at` + sunucu
   `server_received_at` ile) sunucuya ulaşır, **hiçbiri kaybolmaz**.
2. Sunucu, o karta ait tüm `review_events`'i **olay zamanına
   (`created_at`) göre sıralı** olarak `ts-fsrs` fold fonksiyonundan
   geçirip `fsrs_cards` durumunu yeniden hesaplar (Cihaz A'nın olayı önce,
   Cihaz B'ninki sonra uygulanır, çünkü A'nın `created_at`'i daha erken).
3. Kullanıcıya senkron sonrası bir "uzlaştırıldı" bildirimi gösterilir
   (bkz. SCREEN_AND_USER_FLOWS.md §Durum Matrisi — `sync pending` /
   `senkronize edildi` durumları) eğer aynı kart gerçekten iki farklı
   cihazda aynı gün çalışıldıysa; veri sessizce birinin üzerine yazılmaz.
4. **Cihaz saatlerinin güvenilmezliği riski**: iki cihaz saatleri
   senkronsuzsa sıralama yanlış olabilir. Bu yüzden `created_at` yalnızca
   ikincil sıralama anahtarıdır; birincil anahtar her cihazda **monoton
   artan bir yerel sayaç + cihaz kimliği** (`(device_seq, device_id)`)
   olup, sunucu tarafında olaylar önce cihaz başına kendi sırasıyla,
   sonra `server_received_at` ile küresel olarak sıralanır. Kesin
   algoritma implementasyon sırasında netleştirilir (bkz.
   DECISIONS_AND_OPEN_QUESTIONS.md).

## 4. Idempotency (tekrar gönderme, mükerrer kayıt önleme)

- Her satırda cihazda üretilen bir `client_generated_id` (uuid) vardır
  (bkz. DATA_MODEL.md §1 madde 3); bu, tablonun birincil anahtarı
  olarak kullanılır.
- Senkron isteği başarısız olur ve **tekrar gönderilirse**, sunucu aynı
  `client_generated_id`'yi `ON CONFLICT DO NOTHING` ile ele alır — aynı
  olay iki kez sayılmaz.
- `sync_outbox` (yalnızca cihaz tarafı, Expo SQLite) her kayda bir
  `sync_status` (`pending|sent|acknowledged|failed`) taşır; sunucudan
  `acknowledged` yanıtı gelmeden outbox'tan silinmez.

## 5. Outbox deseni (cihaz tarafı)

```
kullanıcı eylemi (ör. bir kart çalıştı)
      │
      ▼
1) Expo SQLite'a hemen yazılır (optimistic, UI anında güncellenir)
2) sync_outbox'a bir "gönderilecek olay" satırı eklenir
      │
      ▼ (bağlantı varsa hemen, yoksa bağlantı geldiğinde)
3) Arka plan senkron işi outbox'ı sunucuya gönderir (batch, sıralı)
      │
      ▼
4) Sunucu onaylar → outbox satırı silinir
   Sunucu türetilmiş durumu (fsrs_cards vb.) yeniden hesaplar
      │
      ▼
5) İstemci güncel türetilmiş durumu çeker (TanStack Query invalidation)
   ve yerel SQLite önbelleğini tazeler
```

Gönderim sırası **her tablo için** cihaz içinde korunur (FIFO); farklı
cihazlar arası sıralama §3'teki kurala göre sunucuda çözülür.

## 6. İstatistiklerin çift sayılmaması

Tüm istatistikler (bkz. ANALYTICS_AND_ADAPTATION.md) **append-only olay
tablolarından SQL agregasyonu ile** hesaplanır, hiçbir yerde "sayaç alanı
+1 yap" mantığı yoktur. Bu, aynı olayın iki kez senkronlanması (idempotent
insert sayesinde) veya iki cihazın "aynı anda" istatistik güncellemesi
riskini yapısal olarak ortadan kaldırır — sayı her zaman satır sayısından
(`count(*)`) türetilir, artırılan bir sayaçtan değil.

## 7. Seri (streak) bilgisinin cihazlar arası tutarlılığı

Seri, "uygulamanın açılması" değil, **o gün için minimum anlamlı çalışma
şartının** (bkz. PRD §8, ANALYTICS_AND_ADAPTATION.md §Seri Kuralı)
sağlanıp sağlanmadığına bakılarak, günlük olarak sunucu tarafında
`review_events`/`production_attempts`/vb. üzerinden **hesaplanan bir
görünüm (view)**'dür; hiçbir cihazda yerel olarak "seri +1" yazılmaz. Bu
sayede hangi cihazdan çalışıldığı seri hesabını etkilemez.

## 8. Çakışma yönetimi — kullanıcıya görünürlük

Nadir durumlarda (aynı kart, aynı gün, iki cihaz, çelişen sonuç) sistem
veriyi **kaybetmez ama sessizce de birleştirmez**: senkron sonrası "bu
kart iki cihazda çalışıldı, son durum X cihazındaki en geç olaya göre
belirlendi" bilgisi, İlerleme/Ayarlar altında bir "senkron geçmişi" günlüğünde
görülebilir (ayrıntı seviyesi SCREEN_AND_USER_FLOWS.md'de belirlenir).
Bu, kullanıcıya şeffaflık sağlar ama günlük akışı kesintiye uğratmaz
(varsayılan olarak sessiz, yalnızca istenirse incelenir).

## 9. Telefon değiştirme / yeniden yükleme

Yeni cihazda giriş yapıldığında:
1. Supabase Auth ile giriş.
2. Tüm türetilmiş durum (`fsrs_cards`, `learning_item_states`, istatistik
   görünümleri) sunucudan indirilir (bunlar zaten sunucuda otoriter).
3. Expo SQLite yerel önbelleği bu veriyle doldurulur.
4. `devices` tablosuna yeni satır eklenir; eski cihaz kaldıysa
   kullanıcı Ayarlar'dan onu "kaldırıldı" olarak işaretleyebilir (yalnızca
   bilgi amaçlı, erişim iptali gerekmez çünkü tek kullanıcı hesabı zaten
   kişisel).

## 10. Açık noktalar

- Cihazlar arası olay sıralama algoritmasının kesin implementasyonu
  (`device_seq` + `server_received_at` birleşimi) netleştirilmeli.
- Senkron sıklığı (anlık push mı, periyodik pull mu, yoksa foreground/
  background event tetiklemeli mi) implementasyon sırasında
  belirlenecek.
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
