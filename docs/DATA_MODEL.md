# Veri Modeli — Lingua Production Coach

Durum: Taslak (ilk sürüm). Henüz hiçbir migration uygulanmamıştır — bu belge
Supabase projesinde (`nqmmlhrkhafwrfhwljdp`) oluşturulacak şemanın hedef
tasarımıdır. Uygulama sırası için [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)
Aşama 3'e bakın.

İlgili belgeler: [ARCHITECTURE.md](./ARCHITECTURE.md), [LEARNING_ENGINE.md](./LEARNING_ENGINE.md),
[OFFLINE_AND_SYNC.md](./OFFLINE_AND_SYNC.md), [SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md)

## 0. Sözlük (tüm belgelerde bağlayıcı terminoloji)

Bu bölüm **tek doğruluk kaynağıdır**. Kod veya başka bir belge bu isimlerden
farklı bir terim kullanıyorsa, bu belge güncellenmeden isim değiştirilmez.

| Kavram | Değerler | Notlar |
|---|---|---|
| `target_language` | `en`, `de`, `sr` | Hedef diller. Ana dil her zaman `tr`. |
| `modality` | `written`, `spoken` | Üretim biçimi; ayrı analiz edilir. |
| `learning_item_type` | `word`, `pattern`, `collocation`, `phrasal_verb`, `verb_preposition`, `grammar_construct`, `sentence_starter`, `connector`, `argument_pattern`, `clinical_phrase` | Tek kelime dışındaki tüm öğrenme birimlerini kapsar (bkz. PRD §4.7). |
| `mastery_state` | `new` → `noticed` → `recognized_in_context` → `hint_producible` → `independently_producible` → `mastered` | Sıralı ilerleme; geri düşebilir (bkz. LEARNING_ENGINE.md). Türkçe karşılıklar: Yeni, Fark edildi, Bağlamda tanınıyor, İpucuyla üretilebiliyor, Bağımsız üretilebiliyor, Kalıcı. |
| `confidence_level` | `certain`, `somewhat_certain`, `guessed`, `unknown` | Türkçe: Eminim, Biraz eminim, Tahmin ettim, Bilmiyordum. |
| `error_severity` | `critical`, `moderate`, `minor`, `style_only` | Türkçe: Kritik, Orta, Küçük, Üslup farkı. |
| `hint_level` | `1`..`6` | 1=kelime türü, 2=ilk harf, 3=kelimenin bir kısmı, 4=ilgili kalıp, 5=tam kelime, 6=tam cevap. |
| `fsrs_rating` | `again`, `hard`, `good`, `easy` | `ts-fsrs` native enum; değiştirilmez. |
| `discussion_mode` | `supportive`, `balanced`, `challenging`, `intense` | Türkçe: Destekleyici, Dengeli, Meydan okuyan, Yoğun tartışma. |
| `correction_mode` | `fluent_chat`, `teacher_mode`, `strict_production` | Türkçe: Akıcı sohbet, Öğretmen modu, Katı üretim. |
| `persona_kind` | `generic_character`, `historical_figure`, `contemporary_figure_simulation` | Her ikinci/üçüncü tür `is_simulation=true` zorunlu (bkz. PERSONA_AND_RAG_POLICY.md). |
| `sentence_tag` | `daily_life`, `clinical`, `travel`, `family`, `ielts`, `work`, `social` | Kişisel cümle etiketleri. |
| `daily_intensity` | `quick` (5dk), `standard` (20dk), `intense` (40dk) | Günlük görev süresi seçimi. |

## 1. Genel ilkeler

1. **Append-only olay tabloları + türetilmiş durum tabloları ayrımı.**
   Tekrarlar, üretim denemeleri, sohbet mesajları gibi "olmuş bitmiş"
   veriler asla güncellenmez/silinmez (yalnızca `deleted_at` ile
   yumuşak silinir); bunlardan türetilen durum (ör. `fsrs_cards`,
   `learning_item_states`) ayrı tablolarda tutulur ve olaylardan
   yeniden hesaplanabilir. Bu, çoklu cihaz senkronunda çift sayımı ve
   veri kaybını önlemek için zorunludur (bkz. [OFFLINE_AND_SYNC.md](./OFFLINE_AND_SYNC.md)).
2. **Her tabloda RLS açıktır** ve politika `user_id = auth.uid()` (veya
   ilişkili tablo üzerinden dolaylı) şeklindedir. İstisnasız.
3. **Her satırda `client_generated_id` (uuid, cihazda üretilir) +
   `id` (sunucu tarafı, aynı değer) vardır**; bu, offline-first yazma ve
   idempotent senkron için gereklidir (bkz. OFFLINE_AND_SYNC.md §Idempotency).
4. **Dil (`target_language`) her öğrenme kaydında birinci sınıf bir
   alandır**; hiçbir öğrenme öğesi diller arası paylaşılmaz (İngilizce
   "run" ile Almanca "laufen" ayrı `learning_items` satırlarıdır).
5. Şu an tek kullanıcı olsa da, tüm tablolar `user_id` taşır (sabit
   tek satırlık `profiles` yerine) — böylece ileride 3-4 whitelist'li
   hesaba genişleme şema değişikliği gerektirmez (bkz. ARCHITECTURE.md
   §Ölçek Kararı).

## 2. Kimlik ve erişim

### `profiles`
Supabase `auth.users` ile 1:1. Uygulamaya özgü profil bilgisi (görünen ad,
arayüz teması, günlük hedef `daily_intensity`, aktif hedef diller listesi).

### `allowed_users`
E-posta bazlı whitelist. Public signup kapalı olduğundan, yeni bir Supabase
Auth kullanıcısı yalnızca burada bir satırı varsa profil oluşturabilir
(uygulama tarafında bir trigger/Edge Function ile kontrol edilir — bkz.
SECURITY_AND_COST_CONTROLS.md §Erişim Kontrolü).

### `devices`
`user_id`, `device_name`, `platform` (`android`), `last_seen_at`,
`app_version`. İstatistik ve senkron hata ayıklamasında "hangi cihaz"
sorusuna cevap verir; stat sayımı asla cihaz bazlı değil, olay bazlı
yapılır (bkz. OFFLINE_AND_SYNC.md).

## 3. Öğrenme öğeleri ve hâkimiyet

### `learning_items`
Tekil sözlük/kalıp birimi. Alanlar: `target_language`, `learning_item_type`,
`surface_form` (ör. "give up"), `lemma`, `translation_tr` (birincil TR
karşılık), `metadata` (jsonb — dilbilgisi bilgisi: Almanca artikel/hâl,
Sırpça edat-hâl birlikteliği, fiil görünüşü vb.), `source`
(`system_seed` | `ai_generated` | `user_content`).

### `learning_item_states`
`user_id` + `learning_item_id` başına tek satır (türetilmiş durum).
`mastery_state`, `is_active_vocabulary` (bool — aktif üretilebiliyor mu),
`first_seen_at`, `last_produced_at`, `times_recognized`, `times_produced`,
`times_produced_independently`. **Bu tablo `review_events`'ten yeniden
hesaplanabilir** — kaynak veri değil, önbellek/özet niteliğindedir.

### `fsrs_cards`
`ts-fsrs` durum alanları birebir: `due`, `stability`, `difficulty`,
`elapsed_days`, `scheduled_days`, `reps`, `lapses`, `state`
(`new|learning|review|relearning`), `last_review`. `learning_item_states`
ile 1:1. Nihai `fsrs_rating` yalnızca deterministik motor girdisi olarak
kullanılır (bkz. LEARNING_ENGINE.md §Rating Belirleme).

### `review_events` (append-only)
Her tekrarın olayı: `fsrs_card_id`, `modality`, `fsrs_rating`,
`ai_suggested_rating`, `ai_quality_signals` (jsonb — anlam doğruluğu,
dilbilgisi, doğallık, hata şiddeti), `hint_level_used` (nullable),
`confidence_level`, `response_time_ms`, `context_type`
(`isolated|sentence_review|story_transfer|chat_transfer|scenario`),
`created_at`. **FSRS durumu, bu tablodaki olayların sıralı fold'udur.**

## 4. Üretim (Türkçeden hedef dile)

### `production_prompts`
Kullanıcıya gösterilen TR kaynak cümleler (sistem üretimi veya AI üretimi),
`target_language`, `target_grammar_focus` (nullable), `difficulty_cefr`.

### `production_attempts`
`prompt_id`, `user_id`, `modality`, `raw_response` (metin veya transkript),
`audio_url` (nullable, Supabase Storage), `ai_evaluation` (jsonb —
yapılandırılmış: `accepted_translations[]`, `errors[]` her biri
`{severity, category, explanation, corrected_span}`, `overall_verdict`),
`confidence_level`, `response_time_ms`, `final_fsrs_rating`,
`self_corrected` (kullanıcı kendi hatasını önce kendi buldu mu).

### `production_attempt_hints` (append-only)
`attempt_id`, `hint_level`, `hint_content`, `requested_at` — sıralı, birden
fazla satır olabilir (kullanıcı 6 seviyeye kadar ilerleyebilir).

## 5. "Bunu nasıl söylerim?"

### `how_do_i_say_queries`
`user_id`, `source_text_tr`, `target_language`.

### `how_do_i_say_results`
`query_id`, `register` (`natural|simpler|casual|formal|clinical`),
`output_text`, `key_vocabulary` (jsonb dizi → `learning_items` referansları),
`multi_word_patterns` (jsonb dizi), `short_tr_explanation`,
`example_usages` (jsonb dizi), `audio_url`.

### `personal_sentences`
Kullanıcının kaydettiği cümleler. `source_type`
(`how_do_i_say|chat|story|manual`), `source_id` (nullable, polymorphic —
bkz. not), `target_language`, `text`, `tags` (`sentence_tag[]`),
`linked_fsrs_card_id` (nullable, SRS'e eklendiyse).

> Not: `source_id` polymorphic referans yerine ayrı nullable FK alanları
> (`source_how_do_i_say_result_id`, `source_chat_message_id`,
> `source_story_segment_id`) kullanmak Postgres'te daha güvenlidir ve
> tercih edilir; burada kavramsal model gösterilmiştir, migration
> yazımında somut FK'ler kullanılacaktır.

## 6. Sohbet ve persona

### `personas`
`name`, `persona_kind`, `target_languages` (hangi dillerde konuşabilir),
`values_and_stance` (jsonb — tutarlı görüşler), `argument_style`,
`knowledge_boundaries`, `forbidden_behaviors`, `is_simulation` (bool,
`persona_kind != generic_character` için her zaman `true`),
`disclosure_label` (kullanıcıya gösterilen sabit metin, ör. "Bu, Atatürk'ün
belgelenmiş görüşlerinden esinlenen bir yapay zekâ yorumudur; gerçek kişiyi
temsil etmez.").

### `persona_sources` ve `persona_source_chunks`
RAG kaynak belgeleri (yalnızca `historical_figure` ve
`contemporary_figure_simulation` için). `persona_sources`: `citation`,
`url`, `retrieved_at`, `credibility_note`. `persona_source_chunks`:
`content`, `embedding` (pgvector), `source_id`. Detay:
[PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md).

### `chat_sessions`
`user_id`, `persona_id`, `target_language`, `discussion_mode`,
`correction_mode`, `started_at`, `summary` (nullable, uzun sohbetlerde
doldurulur — bkz. SECURITY_AND_COST_CONTROLS.md §Maliyet Kontrolleri).

### `chat_messages`
`session_id`, `role` (`user|assistant`), `content`, `modality`,
`audio_url` (nullable), `hidden_correction` (jsonb, nullable — `fluent_chat`
modunda gizli kart), `inline_errors` (jsonb, nullable — `teacher_mode`).

### `chat_message_helpers` (append-only)
Mesaj içi yardım kullanımı: `message_id`, `helper_type`
(`show_tr|listen|listen_slow|simplify|explain_words|why_phrased_this_way|
suggest_answer|sentence_starter|word_hint|add_to_worklist`),
`target_span` (nullable — dokunulan kelime/kalıp), `created_at`.

### `chat_extracted_candidates`
Sohbet sonu çıkarımı: `session_id`, `candidate_type`
(`new_pattern|user_error|tr_revealed_phrase|assisted_answer`),
`learning_item_id` (nullable), `payload` (jsonb), `selected_for_srs` (bool —
"her açılan kelime otomatik kart olmaz, en değerli adaylar seçilir").

## 7. Adaptif hikâyeler

### `stories`, `story_segments`, `story_targets`, `story_exercises`, `story_exercise_attempts`

Detaylı şema ve üretim/QA akışı için: [ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md) §Veri Modeli.
Burada yalnızca üst seviye ilişki: bir `story` N `story_segments` içerir,
her segment N `story_targets` (hedef kelime/kalıp/dilbilgisi işaretleri)
taşır; hikâye sonunda N `story_exercises` üretilir, her biri N
`story_exercise_attempts` alabilir.

## 8. Hata hafızası

### `error_log`
`user_id`, `target_language`, `error_category` (dil bazlı; bkz.
ANALYTICS_AND_ADAPTATION.md §Hata Kategorileri), `error_severity`,
`source_type` (`production|chat|story|scenario`), `source_id`,
`user_answer`, `corrected_answer`, `short_explanation`,
`last_reviewed_at`, `recurrence_count`.

## 9. Senaryolar

### `scenarios`
`title`, `target_language`, `context_tag` (`clinical|travel|ielts|
official_office|family|work|social`), `goal_description`,
`character_brief`.

### `scenario_sessions`, `scenario_turns`
Sohbetle aynı desene benzer ama `completion_status`
(`in_progress|completed|abandoned`), `outcome_report` (jsonb — tamamlanma
durumu, yapılan hatalar, kullanılan kalıplar, tekrar önerileri) taşır.

## 10. İstatistik, rapor ve değerlendirme

### `weekly_reports`, `monthly_assessments`
Üretilen rapor içeriği (jsonb, yapılandırılmış — bkz.
ANALYTICS_AND_ADAPTATION.md). Ham istatistikler bu tablolarda **tutulmaz**,
raporun üretildiği anki **anlık görüntüsü (snapshot)** olarak saklanır;
canlı istatistikler her zaman olay tablolarından (`review_events`,
`production_attempts`, `chat_messages`, `story_exercise_attempts` vb.)
hesaplanır.

## 11. Kullanım, maliyet ve önbellek

### `ai_usage_events` (append-only)
`user_id`, `edge_function_name`, `model_name`, `prompt_version`,
`input_tokens`, `output_tokens`, `estimated_cost_usd`, `cache_hit` (bool),
`created_at`.

### `ai_usage_quotas`
`user_id`, `period` (`daily|monthly`), `period_start`, `feature_group`
(`text_generation|transcription|realtime_voice`), `used_amount`,
`limit_amount`, `hard_stop` (bool).

### `ai_response_cache`
`request_hash` (girdi + prompt_version + model'in hash'i), `response`
(jsonb), `expires_at`. Aynı isteğin gereksiz yeniden analiz edilmesini
önler (bkz. SECURITY_AND_COST_CONTROLS.md §Önbellekleme).

## 12. Senkron ve dışa aktarma

### `sync_outbox` (yalnızca cihaz tarafı Expo SQLite'ta; sunucuya kopyalanmaz)
Detay: [OFFLINE_AND_SYNC.md](./OFFLINE_AND_SYNC.md) §Outbox Deseni.

### `exports`
`user_id`, `export_type` (`json|csv|anki|full_account`), `status`,
`file_url` (Storage, süreli imzalı URL), `requested_at`, `completed_at`.

## 13. RLS deseni (özet)

Her kullanıcı-verisi tablosunda:

```sql
alter table <table> enable row level security;

create policy "select own rows"
  on <table> for select
  using (user_id = auth.uid());

create policy "insert own rows"
  on <table> for insert
  with check (user_id = auth.uid());

-- update/delete: yalnızca append-only olmayan tablolarda,
-- ve yalnızca yumuşak silme (deleted_at) için.
```

`persona_sources`, `persona_source_chunks`, `learning_items` (sistem
seed'i), `scenarios` gibi "sistem içeriği" tabloları `user_id` taşımaz;
bunlarda RLS `select` herkese (yalnızca authenticated) açık, `insert/update/
delete` yalnızca `service_role` (Edge Function) ile yapılır — istemciden
asla yazılamaz.

## 14. Açık noktalar

Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md):
`personal_sentences.source_id` polymorphic modelleme kararı, `story_targets`
ile `learning_items` arasındaki çoklu-dil ilişkisi, `error_log` ile
`review_events` arasındaki olası tekilleştirme ihtiyacı.
