# Mimari — Lingua Production Coach

Durum: Taslak (ilk sürüm), henüz koda yansıtılmamıştır.
İlgili belgeler: [DATA_MODEL.md](./DATA_MODEL.md), [AI_AND_EDGE_FUNCTION_CONTRACTS.md](./AI_AND_EDGE_FUNCTION_CONTRACTS.md),
[OFFLINE_AND_SYNC.md](./OFFLINE_AND_SYNC.md), [SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md)

## 1. Genel görünüm

```
┌─────────────────────────────┐
│  Android APK (3-4 cihaz)    │
│  Expo Router + expo-dev-    │
│  client (internal dist.)    │
│                              │
│  ┌────────────────────────┐ │
│  │ Expo SQLite (offline   │ │
│  │ önbellek + outbox)     │ │
│  └────────────────────────┘ │
│  TanStack Query (server     │
│  state cache + retry)       │
└──────────────┬───────────────┘
               │ HTTPS (Supabase client SDK)
               ▼
┌─────────────────────────────────────────┐
│ Supabase Projesi (nqmmlhrkhafwrfhwljdp)  │
│                                           │
│  Auth  ──►  Postgres (RLS, pgvector)     │
│                 ▲                        │
│                 │                        │
│  Edge Functions ┘ (secret: OPENAI_API_KEY)│
│      │                                   │
│      ▼                                   │
│  OpenAI API (Responses, Realtime,        │
│  Transcription, TTS)                     │
│                                           │
│  Storage (ses kayıtları, export dosyaları)│
└─────────────────────────────────────────┘
```

Kritik kural: **mobil uygulama hiçbir zaman OpenAI'a doğrudan istek atmaz.**
Tüm AI çağrıları Supabase Edge Function'ları arkasından geçer; bu hem gizli
anahtar sızıntısını hem de kota/önbellek kontrolünün atlanmasını engeller
(bkz. [SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md)).

## 2. Monorepo yapısı (hedef — kademeli oluşturulacak)

```
/
  apps/mobile/            Expo uygulaması (mevcut)
  supabase/               (Aşama 2'de oluşturulacak)
    migrations/           SQL migration dosyaları
    functions/             Edge Functions (Deno)
      _shared/             Ortak yardımcılar (usage-guard, zod şemaları, openai client)
      production-feedback/
      how-do-i-say/
      chat-turn/
      chat-session-summary/
      story-generate/
      story-quality-check/
      content-import-analyze/
      transcribe-audio/
      realtime-session-token/
      weekly-report/
      monthly-assessment/
    config.toml
  docs/                   Bu belgeler
```

Şu an root'ta bir npm workspace manifest'i (`package.json` + `workspaces`)
yoktur. Tek uygulama olduğu için bu **bilinçli olarak eklenmemiştir**;
`supabase/` klasörü eklendiğinde de bir workspace tooling'ine ihtiyaç yoktur
çünkü Supabase CLI kendi başına çalışır ve `apps/mobile` npm ile
bağımsızdır. İleride ikinci bir uygulama (ör. web) eklenirse workspace
kararı yeniden değerlendirilir (bkz. DECISIONS_AND_OPEN_QUESTIONS.md).

## 3. Mobil uygulama katmanları

- **Expo Router** — dosya tabanlı yönlendirme, `typedRoutes` açık.
- **TanStack Query** — sunucu durumu (Supabase sorguları), otomatik retry,
  arka planda yeniden doğrulama; offline'da `networkMode: 'offlineFirst'`.
- **Expo SQLite** — cihaz içi kalıcı önbellek + outbox kuyruğu (bkz.
  OFFLINE_AND_SYNC.md). FSRS kartlarının **çalışılabilir kopyası** burada
  tutulur ki tekrar ekranı internetsiz açılabilsin.
- **Zod** — hem Edge Function'lardan gelen AI çıktısı hem de yerel form
  girdileri için tek doğrulama katmanı; TypeScript tipleri Zod
  şemalarından türetilir (`z.infer`), iki kez tanımlama yapılmaz.
- **ts-fsrs** — istemci tarafında da çalışır (offline tekrar için); sunucu
  tarafında da aynı kütüphane/versiyon kullanılır ki iki taraf da aynı
  algoritmayı çalıştırsın (bkz. LEARNING_ENGINE.md §Determinizm).
- **Expo Audio / Expo Speech** — TTS oynatma, ses kaydı.
- **Expo Notifications** — günlük hatırlatma (yerel bildirim; sunucu push
  altyapısı ilk sürümde gerekli değildir, tek kullanıcı olduğundan yerel
  zamanlanmış bildirim yeterlidir).

## 4. Supabase katmanı

- **Auth** — invite-only: `allowed_users` whitelist + public signup kapalı
  (bkz. SECURITY_AND_COST_CONTROLS.md §Erişim Kontrolü).
- **Postgres + RLS** — tüm kullanıcı verisi (bkz. DATA_MODEL.md).
- **pgvector** — yalnızca `persona_source_chunks.embedding` için (RAG).
  Öğrenme/hikâye verisinde embedding **kullanılmaz** — kelime/kalıp eşleştirme
  deterministik (lemma bazlı) yapılır, gereksiz karmaşıklık eklenmez.
- **Edge Functions (Deno)** — tüm OpenAI çağrıları + iş mantığı (rating
  önerisi, hikâye kalite kontrolü, özet çıkarımı) burada çalışır.
- **Storage** — ses kayıtları (kullanıcı bas-konuş kayıtları, TTS çıktı
  önbelleği), export dosyaları. Bucket'lar private, imzalı URL ile erişim.

## 5. Neden bu seçimler

| Seçim | Neden |
|---|---|
| Supabase (Auth+DB+Functions+Storage tek yerde) | Tek geliştirici için ayrı backend işletmemek; RLS ile veri izolasyonu native destekleniyor. |
| Edge Functions Deno üzerinde | Supabase native entegrasyon, secret yönetimi yerleşik, cold-start düşük (kişisel kullanım trafiği için yeterli). |
| `ts-fsrs` | Aktif bakımlı, FSRS algoritmasının referans TS implementasyonu; kendi FSRS'imizi yazmak gereksiz risk. |
| Expo SQLite (Supabase yerel senkron SDK yerine) | Basit, öngörülebilir, offline mantığını biz kontrol ediyoruz — 3-4 cihazlık çakışma senaryosu Supabase'in genel senkron çözümlerinden daha basit kurallarla (event-sourcing) çözülebiliyor (bkz. OFFLINE_AND_SYNC.md). |
| Zod her yerde | Hem AI çıktısı hem form girdisi için tek doğrulama dili; tip güvenliği + çalışma zamanı doğrulaması aynı kaynaktan. |
| pgvector yalnızca persona RAG için | Öğrenme öğeleri için semantik arama gereksiz — lemma/dil bazlı tam eşleşme yeterli ve daha ucuz/deterministik. |

## 6. Ölçek kararı (bilinçli sınırlama)

Bu, **tek kullanıcı + 3-4 cihazlık kişisel bir uygulamadır.** Bu nedenle
bilinçli olarak **yapılmayacak** şeyler:

- Çok kiracılı (multi-tenant) organizasyon/takım modeli.
- Yatay ölçeklenen queue/worker altyapısı (ör. ayrı bir job runner); Edge
  Functions senkron çağrı yeterlidir, kuyruk gerekiyorsa (ör. hikâye
  üretimi uzun sürerse) Supabase'in kendi `pg_cron` / Edge Function
  içi retry mekanizması kullanılır.
- Mikroservis ayrımı; tüm Edge Function'lar tek Supabase projesinde kalır.
- CDN/önbellek katmanı (Redis vb.); `ai_response_cache` tablosu (Postgres)
  bu ölçekte yeterlidir.

Ancak mimari, **3-4 whitelist'li kullanıcıya genişlemeyi engellemeyecek**
şekilde tasarlanır: her tablo `user_id` taşır, her Edge Function
`auth.uid()` bağlamında çalışır (sabit/tekil kullanıcı ID'si koda
gömülmez). Bu, "genişlemeyi engellemeyen ama gereksiz kurumsal karmaşıklık
üretmeyen" ilkesinin somut karşılığıdır (bkz. PRD.md §7).

## 7. Gerçek zamanlı ses için mimari hazırlık

İlk sürümde gerçek zamanlı sesli sohbet **açık değildir** (bkz.
IMPLEMENTATION_ROADMAP.md Aşama 14), ama aşağıdaki kararlar en baştan
alınır ki sonradan yeniden mimarilenmesin:

- `realtime-session-token` Edge Function'ı en baştan tasarlanır (kısa ömürlü
  OpenAI Realtime session token üretir; istemci token'ı doğrudan OpenAI'a
  WebRTC/WebSocket ile bağlanmak için kullanır — ses akışının kendisi Edge
  Function üzerinden **geçmez**, yalnızca token orada üretilir).
  Bu, Edge Function'ın ses akışı için darboğaz olmasını engeller.
- `chat_sessions`/`chat_messages` şeması `modality: spoken` ve
  `audio_url`'i en baştan destekler; gerçek zamanlı sohbet açıldığında
  şema değişikliği gerekmez.
- Günlük canlı ses kotası (`ai_usage_quotas.feature_group = realtime_voice`)
  şemada en baştan vardır, yalnızca ilk sürümde kullanılmaz.

## 8. Ortam değişkenleri ve model isimleri

- Mobil tarafta yalnızca `EXPO_PUBLIC_SUPABASE_URL` ve
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key) bulunur — bunlar zaten
  public olacak şekilde tasarlanmış anahtarlardır, RLS güvenliği sağlar.
- OpenAI model isimleri (`OPENAI_TEXT_MODEL`, `OPENAI_TRANSCRIBE_MODEL`,
  `OPENAI_REALTIME_MODEL`, `OPENAI_TTS_VOICE`) Edge Function ortam
  değişkenleri olarak tutulur, koda sabitlenmez. **Bu belgede veya kodda,
  doğrulanmamış/varsayımsal model adı sabit yazılmaz** — Edge Function
  deploy edilirken güncel, doğrulanmış model adı ortam değişkenine
  girilir (bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md §Model Seçimi).

## 9. Gözlemlenebilirlik

- `ai_usage_events` her AI çağrısını token/maliyet ile loglar (bkz.
  DATA_MODEL.md §11).
- Supabase `get_logs` / `get_advisors` MCP araçları geliştirme sırasında
  düzenli çalıştırılır (özellikle her migration sonrası RLS/performans
  danışmanlığı için).
- Uygulama içi hata sınırları (error boundary) + yerel log dosyası
  (yalnızca geliştirme build'inde) — üretim/kişisel kullanım için harici
  bir crash-reporting SaaS'ı **eklenmez** (tek kullanıcı, gereksiz
  maliyet/karmaşıklık).

## 10. Açık noktalar

Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md):
npm workspace'e geçiş eşiği, hikâye üretiminin senkron mu yoksa
arka planda mı (polling) çalışacağı, Realtime ses için WebRTC/WebSocket
seçimi.
