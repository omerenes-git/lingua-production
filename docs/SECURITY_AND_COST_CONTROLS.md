# Güvenlik ve Maliyet Kontrolleri

Durum: Taslak (ilk sürüm).
İlgili belgeler: [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md) §11, §13,
[AI_AND_EDGE_FUNCTION_CONTRACTS.md](./AI_AND_EDGE_FUNCTION_CONTRACTS.md), [PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md) §6

## 1. Gizli anahtar yönetimi

- `OPENAI_API_KEY` yalnızca Supabase Edge Function secret'ında bulunur
  (`supabase secrets set`). Mobil kodda, `app.json`/`eas.json`'da, derlenmiş
  APK'da, GitHub'da veya `EXPO_PUBLIC_*` değişkenlerinde **hiçbir zaman**
  bulunmaz.
- Mobil tarafta yalnızca `EXPO_PUBLIC_SUPABASE_URL` ve
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key) vardır — bunlar RLS ile
  korunduğu için public olacak şekilde tasarlanmıştır, gizli değildir.
- CI/build sürecinde secret'ların loglara yazılmaması için EAS build
  secrets mekanizması kullanılır, `.env` dosyaları `.gitignore`'da kalır.

## 2. Erişim kontrolü (tek kullanıcı / whitelist)

- Public signup **kapalıdır** (Supabase Auth ayarında sign-up disabled
  veya invite-only akış).
- `allowed_users` tablosu (bkz. DATA_MODEL.md §2), yeni bir Auth
  kullanıcısının profil oluşturabilmesi için e-posta whitelist'inde
  olmasını zorunlu kılar; bu kontrol bir Postgres trigger veya profil
  oluşturma Edge Function'ında yapılır — istemci tarafında değil, sunucu
  tarafında zorlanır.
- Uygulama, 3-4 whitelist'li hesaba kadar genişlemeyi destekler ama
  varsayılan olarak tek kullanıcı için tasarlanır (bkz. ARCHITECTURE.md
  §6 Ölçek Kararı).
- RLS her tabloda zorunludur (bkz. DATA_MODEL.md §13); whitelist kontrolü
  RLS'in **yerine geçmez**, ona ek bir kayıt-öncesi kapıdır.

## 3. Yapılandırılmış çıktı ve doğrulama

- Tüm AI çıktıları OpenAI'ın yapılandırılmış çıktı (JSON schema) modu ile
  istenir.
- Edge Function, OpenAI'dan dönen JSON'u **Zod ile doğrular** önce
  istemciye döndürmeden; doğrulama başarısız olursa (model şemaya uymayan
  bir çıktı üretirse) yapılandırılmış bir hata döner, ham/bozuk veri asla
  istemciye geçmez.
- Zod şemaları hem girdi hem çıktı için tek kaynak — TypeScript tipleri
  `z.infer` ile türetilir.

## 4. Prompt versiyonlama

- Her Edge Function, kullandığı sistem promptunun bir `PROMPT_VERSION`
  sabitini taşır (kod içinde, ör. `production-feedback/prompt.ts` →
  `export const PROMPT_VERSION = "2026-07-24.1"`).
- Her `ai_usage_events` ve ilgili sonuç kaydı (`production_attempts.ai_evaluation`,
  `chat_messages` vb.) hangi `prompt_version` ile
  üretildiğini saklar.
- Prompt değiştiğinde versiyon artırılır; eski versiyonla üretilmiş
  kayıtlar **geriye dönük olarak yeniden yorumlanmaz** — geçmiş veri
  o anki promptun bir kaydı olarak kalır. Bu, "neden bu değerlendirme
  farklı" sorularının hata ayıklanabilir olmasını sağlar.

## 5. Prompt injection ve kaynak zehirlemesi riskleri

Genel değerlendirme, dile özgü olan detaylar için bkz.
[PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md) §6.

- **Kullanıcı girdisi her zaman ayrı bir bloktur**, sistem talimatı
  olarak yorumlanmaz. Bu, `production-feedback`, `chat-turn`,
  `content-import-analyze` gibi kullanıcı serbest metni alan tüm
  fonksiyonlar için geçerlidir.
- **Persona kaynakları (RAG) ile kullanıcı içeriği ayrıdır** (bkz.
  PERSONA_AND_RAG_POLICY.md §6) — `persona_source_chunks` yalnızca
  `service_role` ile yazılır.
- **Kullanıcının kendi içe aktardığı metin** (`content-import-analyze`)
  yalnızca analiz edilir, hiçbir zaman bir persona'nın veya sistemin
  "gerçek/otoriter" bilgi kaynağı olarak ele alınmaz.
- Model çıktısı, sonraki bir AI çağrısına ham olarak geri beslenirken
  (ör. `story-quality-check` girdisi `story-generate` çıktısıdır) bu veri
  de "referans veri" olarak işaretlenir, doğrudan talimat olarak
  yorumlanmaz.

## 6. Maliyet kontrolleri

### 6.1 Kota grupları (`ai_usage_quotas.feature_group`)
`text_generation` (üretim/sohbet/hikâye/rapor), `transcription`,
`realtime_voice`, `web_search` (açıldığında) — her biri **ayrı** günlük
ve aylık limitlere tabidir. Bir grubun limiti dolması diğerini
etkilemez (ör. metin üretimi kotası dolsa bile transkripsiyon çalışmaya
devam eder).

### 6.2 Rate limiting (Edge Function düzeyinde)
`_shared/usage-guard.ts`, her çağrı öncesi:
1. `ai_usage_quotas`'ta ilgili `feature_group` için günlük/aylık kullanım
   kontrolü.
2. Limit aşıldıysa istek OpenAI'a **gitmeden** yapılandırılmış hata
   (`error_code: "quota_exceeded"`) döner.
3. Kısa süreli "istek fırtınası" koruması için basit bir sliding-window
   sayaç (ör. dakika başına N istek) — tek kullanıcı olduğundan bu
   büyük olasılıkla bir bug/döngü koruması amaçlıdır, kötüye kullanım
   koruması değil.

### 6.3 Canlı ses için ayrı günlük kota
`realtime_voice` grubu, saniye bazlı günlük bir tavana sahiptir (bkz.
ARCHITECTURE.md §7); bu, gerçek zamanlı ses açıldığında (Aşama 14)
maliyetin öngörülemez şekilde büyümesini engeller.

### 6.4 Önbellekleme
`ai_response_cache` (bkz. DATA_MODEL.md §11): girdi + `prompt_version` +
model adının hash'i aynıysa, OpenAI'a gidilmeden önbellekten yanıt
döner. Özellikle `how-do-i-say`, `content-import-analyze` gibi
deterministik/tekrar eden girdili çağrılarda etkilidir. TTS çıktıları da
(aynı metin + aynı ses) Storage'da önbelleklenir (bkz.
ADAPTIVE_STORIES.md §7).

### 6.5 Sohbet geçmişi yönetimi (bağlam yönetimi)
- **Sohbet geçmişinin tamamı her istekte yeniden gönderilmez.**
  `chat-turn` çağrısı, tam mesaj geçmişi yerine `chat_sessions.summary`
  (varsa) + son N mesajı gönderir.
- **Uzun konuşmalar özetlenir**: bir sohbet belirli bir mesaj sayısını
  aştığında `chat-session-summary` tetiklenir, `running_summary`
  güncellenir, bir sonraki `chat-turn` çağrısı bu özeti kullanır (tam
  geçmiş yerine).
- Bu, hem token maliyetini hem de model bağlam penceresi riskini
  sınırlar.

### 6.6 Girdi sınırları
`content-import-analyze` ve benzeri serbest metin alan fonksiyonlarda
karakter/token üst sınırı vardır; aşan girdi bölünerek işlenir ve
kullanıcıya bilgi verilir (bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md §10).

### 6.7 Token ve maliyet kaydı
Her çağrı `ai_usage_events`'e `input_tokens`, `output_tokens`,
`estimated_cost_usd` ile loglanır (bkz. DATA_MODEL.md §11). İlerleme/
Ayarlar altında kullanıcı toplam tahmini aylık maliyeti görebilir
(bkz. SCREEN_AND_USER_FLOWS.md §Ayarlar).

### 6.8 Aynı isteğin gereksiz yeniden analiz edilmemesi
Bkz. §6.4. Ayrıca `story-generate` gibi pahalı çağrılarda, kullanıcının
aynı gün içinde "yeniden üret" istekleri sınırlıdır (bkz.
ADAPTIVE_STORIES.md §11).

## 7. Veri koruması

- Ses kayıtları ve export dosyaları private Storage bucket'larında,
  yalnızca süreli imzalı URL ile erişilebilir.
- Kullanıcı verisi (bkz. veri sahipliği, PRD §4.12) dışa aktarılabilir
  ve silinebilir; silme istekleri (`exports.export_type = full_account`
  benzeri bir "hesap silme" akışı) tüm ilgili tablolarda cascade veya
  toplu silme ile gerçekleştirilir — RLS bu işlemleri yalnızca
  `auth.uid()`'nin kendi verisiyle sınırlar.
- Supabase yedekleme stratejisi: Supabase'in yerleşik otomatik
  yedekleme/point-in-time-recovery özelliği kullanılır (proje planına
  bağlı olarak); ek bir üçüncü taraf yedekleme sistemi tek kullanıcı
  ölçeğinde gerekli değildir.

## 8. Düzenli güvenlik denetimi

- Her migration sonrası `mcp__supabase__get_advisors` (security +
  performance) çalıştırılır; RLS eksikliği veya performans uyarısı
  görmezden gelinmez (bkz. IMPLEMENTATION_ROADMAP.md — her aşamada
  "güvenlik kontrolü" adımı).
- `get_logs` ile Edge Function hataları düzenli izlenir.

## 9. Açık noktalar

- Sliding-window rate limit eşik değerleri.
- Sohbet özetleme tetikleme eşiği (kaç mesajdan sonra).
- Hesap silme akışının tam cascade sırası (export önce mi zorunlu, yoksa
  doğrudan silme mi).
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
