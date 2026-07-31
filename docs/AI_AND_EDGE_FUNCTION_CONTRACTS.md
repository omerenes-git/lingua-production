# AI ve Edge Function Sözleşmeleri

Durum: Taslak (ilk sürüm). Henüz hiçbir Edge Function deploy edilmemiştir.
İlgili belgeler: [ARCHITECTURE.md](./ARCHITECTURE.md) §4, [SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md),
[LEARNING_ENGINE.md](./LEARNING_ENGINE.md), [ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md), [PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md)

## 1. Ortak sözleşme kuralları (tüm Edge Function'lar için)

1. **Girdi ve çıktı Zod şemasıyla tanımlanır.** Şema
   `supabase/functions/_shared/schemas/<function-name>.ts` içinde tutulur; hem Edge Function
   hem mobil istemci **aynı şemayı** import eder (monorepo içi paylaşım —
   tam mekanizma ARCHITECTURE.md §2'de belirtilen `supabase/` klasörü
   oluşturulurken netleştirilir).
2. **OpenAI'dan yapılandırılmış çıktı istenir** (structured outputs / JSON
   schema modu); serbest metin parse edilerek karar alınmaz.
3. **Her çağrı `ai_usage_events`'e loglanır** (bkz. DATA_MODEL.md §11):
   model adı, prompt_version, token sayıları, tahmini maliyet, cache_hit.
4. **Her Edge Function bir `prompt_version` sabiti taşır**; prompt metni
   değiştiğinde versiyon artırılır, eski versiyonla üretilmiş kayıtlar
   (`review_events.ai_quality_signals` vb.) hangi prompt'la üretildiğini
   korur (bkz. SECURITY_AND_COST_CONTROLS.md §Prompt Versiyonlama).
5. **Çağrı öncesi `usage-guard` kontrolü** (paylaşılan `_shared/usage-guard.ts`):
   günlük/aylık kota aşıldıysa istek `429`/yapılandırılmış hata
   ile reddedilir, OpenAI'a gidilmez.
6. **Çağrı öncesi önbellek kontrolü**: girdi + `prompt_version` + model
   hash'i `ai_response_cache`'te varsa, OpenAI'a gidilmeden önbellekten
   dönülür (bkz. SECURITY_AND_COST_CONTROLS.md §Önbellekleme).
7. **Hata durumunda yapılandırılmış hata gövdesi** döner (`{error_code,
   user_message_tr, retriable}`); mobil taraf bunu doğrudan kullanıcıya
   TR mesaj olarak gösterebilir (bkz. SCREEN_AND_USER_FLOWS.md §Durum
   Matrisi).

## 2. Model seçimi

Model adları **koda sabitlenmez**, Edge Function ortam değişkenlerinden
okunur:

| Ortam değişkeni | Kullanım amacı |
|---|---|
| `OPENAI_TEXT_MODEL` | Değerlendirme, üretim, sohbet, hikâye, rapor metinleri |
| `OPENAI_TRANSCRIBE_MODEL` | Bas-konuş transkripsiyon |
| `OPENAI_REALTIME_MODEL` | Gerçek zamanlı sesli sohbet (Aşama 14) |
| `OPENAI_TTS_VOICE` | Genel yapay zekâ sesi (kişi sesi klonlama yok) |

Bu belgede **hiçbir spesifik model adı sabit önerilmez** çünkü model
kataloğu zamanla değişir; deploy anında güncel/doğrulanmış model adı
Supabase secret/env olarak girilir. Bu, kullanıcının "doğrulanmamış veya
geçici model isimleri sabitlenmeyecek" kuralının doğrudan uygulamasıdır
(bkz. CLAUDE.md §Sabit Kurallar).

## 3. `production-feedback`

**Amaç:** TR→hedef dil üretim denemesini değerlendirir.

**Girdi:** `{ target_language, prompt_text_tr, target_grammar_focus?,
user_response, modality, response_time_ms }`

**Çıktı (Zod şeması, özet):**
```
{
  overall_verdict: "correct" | "natural_variant" | "minor_issue" | "major_issue" | "incorrect",
  accepted_translations: string[],       // birden fazla doğru çeviri kabulü
  errors: Array<{
    span: string,
    severity: "critical" | "moderate" | "minor" | "style_only",
    category: string,                    // dil bazlı hata kategorisi, bkz. ANALYTICS_AND_ADAPTATION.md
    explanation_tr: string,
    corrected_span: string,
  }>,
  self_correction_prompt_tr: string,     // kullanıcıyı önce kendi bulmaya teşvik eden mesaj
  suggested_fsrs_rating: "again" | "hard" | "good" | "easy",
  quality_signals: {
    meaning_accuracy: number,            // 0-1
    grammar_accuracy: number,
    naturalness: number,
  },
}
```

**Not:** `suggested_fsrs_rating` **öneridir**; nihai rating
`decideFinalRating` (bkz. LEARNING_ENGINE.md §2-3) tarafından belirlenir.

**İpucu üretimi ayrı bir alt-çağrıdır** (aynı function içinde, kullanıcı
ipucu istediğinde tetiklenir): `{ hint_level, target_answer_context }` →
`{ hint_content_tr_or_target }`. İpucu, tam cevabı seviye sınırının
ötesinde sızdırmayacak şekilde promptlanır (ör. seviye 3 istenirken model
yanlışlıkla tam kelimeyi vermemeli — bu, prompt testlerinde ayrıca
doğrulanır, bkz. TEST_AND_ACCEPTANCE_PLAN.md).

## 4. `how-do-i-say`

**Amaç:** Serbest TR girdiden çoklu register çıktı üretir.

**Girdi:** `{ source_text_tr, target_language }`

**Çıktı:**
```
{
  registers: {
    natural: string, simpler: string, casual: string,
    formal: string, clinical_or_contextual: string,
  },
  key_vocabulary: Array<{ surface_form, learning_item_type, translation_tr }>,
  multi_word_patterns: string[],
  short_explanation_tr: string,
  example_usages: string[],
}
```

Ses (TTS) çıktısı ayrı, önbelleklenebilir bir alt uçtan üretilir
(`registers` içindeki her metin için isteğe bağlı, kullanıcı dinlemek
istediğinde tetiklenir — her `how-do-i-say` çağrısında otomatik TTS
üretilmez, maliyet kontrolü için tembel/lazy üretim).

## 5. `chat-turn`

**Amaç:** Persona sohbetinde bir sonraki asistan mesajını üretir.

**Girdi:** `{ session_id, persona_id, discussion_mode, correction_mode,
target_language, conversation_context (özetlenmiş geçmiş + son N mesaj,
bkz. SECURITY_AND_COST_CONTROLS.md §Bağlam Yönetimi), user_message,
persona_rag_context? }`

**Çıktı:**
```
{
  assistant_message: string,
  hidden_correction: { errors: [...] } | null,      // fluent_chat modunda
  inline_errors: [...] | null,                       // teacher_mode'da
  blocked_until_correction: boolean,                 // strict_production'da kritik hata varsa true
  persona_stance_note_tr: string | null,              // persona neden bu görüşü savundu (şeffaflık)
}
```

Persona tutarlılığı (bkz. PERSONA_AND_RAG_POLICY.md) prompt içinde
`values_and_stance`/`argument_style`/`forbidden_behaviors` alanlarının
enjekte edilmesiyle sağlanır; bu function RAG kaynaklarını
`persona_rag_context` olarak **hazır enjekte edilmiş** alır — kendi
başına vektör araması yapmaz (arama ayrı, `_shared/persona-retrieval.ts`
yardımcısında, bkz. §7).

Mesaj içi yardım fonksiyonları (Türkçesini göster, dinle, yavaş dinle,
daha basit söyle, kelimeleri açıkla, neden böyle söylendi, cevap öner,
cümle başlangıcı ver, kelime ipucu ver) **ayrı, küçük, önbelleklenebilir
alt-uçlardır** — her biri tek bir mesaj + tek bir yardım türünü girdi
alır, tüm sohbet geçmişini yeniden göndermez.

## 6. `chat-session-summary`

**Amaç:** Sohbet sonu çıkarımı + uzun sohbet özetleme (maliyet kontrolü
için, bkz. SECURITY_AND_COST_CONTROLS.md §Bağlam Yönetimi).

**Girdi:** `{ session_id, full_message_history }`

**Çıktı:**
```
{
  running_summary: string,                    // sonraki turn'lerde conversation_context olarak kullanılır
  extracted_candidates: Array<{
    candidate_type: "new_pattern" | "user_error" | "tr_revealed_phrase" | "assisted_answer",
    value: string, target_language, suggested_for_srs: boolean,
  }>,
}
```

`suggested_for_srs` yalnızca **en değerli** adaylar için `true` döner
(prompt açıkça "her açılan kelimeyi değil, en değerli 3-7 adayı seç" diye
yönlendirir) — kullanıcı arayüzde bunları onaylar/reddeder, otomatik kart
oluşmaz (bkz. SCREEN_AND_USER_FLOWS.md §Sohbet Sonu Özeti).

## 7. Persona RAG retrieval (`_shared/persona-retrieval.ts`)

Edge Function değil, paylaşılan bir yardımcı modül: `persona_id` +
kullanıcı mesajı alır, `persona_source_chunks.embedding` üzerinde pgvector
benzerlik araması yapar, en alakalı N parçayı + atıflarını döner. Yalnızca
`persona_kind IN (historical_figure, contemporary_figure_simulation)`
için çağrılır. Detay: [PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md) §RAG Akışı.

## 8. `story-generate`

**Amaç:** Kullanıcının öğrenme verisine göre adaptif hikâye üretir.

Girdi/çıktı sözleşmesi ve kalite kontrolü detaylı olarak
[ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md) §Üretim Sözleşmesi'nde
tanımlıdır (burada tekrar edilmez — tek doğruluk kaynağı orasıdır).

## 9. `story-quality-check`

**Amaç:** `story-generate` çıktısının ikinci geçiş QA'sı. Detay:
[ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md) §Kalite Kontrolü.

## 10. `content-import-analyze`

**Amaç:** Kullanıcının yapıştırdığı/eklediği kişisel metni analiz eder,
bilinen/bilinmeyen kelime ve kalıpları işaretler, alıştırma önerir.

**Girdi:** `{ target_language, raw_text, known_learning_item_ids[] }`

**Çıktı:**
```
{
  annotated_segments: Array<{ text, status: "known"|"learning"|"new", learning_item_id? }>,
  suggested_new_learning_items: Array<{ surface_form, learning_item_type, translation_tr }>,
  suggested_exercises: [...],   // bkz. ADAPTIVE_STORIES.md §Hikâye Sonrası Görevler ile aynı görev tipleri
}
```

Uzun metinler için girdi karakter sınırı vardır (bkz.
SECURITY_AND_COST_CONTROLS.md §Girdi Sınırları); sınırı aşan metin
bölünerek işlenir, kullanıcıya "metin bölündü" bilgisi verilir.

## 11. `transcribe-audio`

**Amaç:** Bas-konuş ses kaydını transkripte çevirir.

**Girdi:** Storage'a önce yüklenen ses dosyasının URL'i + `target_language`.
**Çıktı:** `{ transcript, confidence, duration_seconds }`.

Transkript kullanıcıya **düzenlenebilir** olarak gösterilir (kullanıcı
transkripti düzeltebilir); dil değerlendirmesi düzeltilmiş transkript
üzerinden `production-feedback`'e gönderilir.

## 12. `realtime-session-token`

**Amaç:** OpenAI Realtime API için kısa ömürlü, tek kullanımlık oturum
token'ı üretir. Ses akışının kendisi bu Edge Function'dan **geçmez**
(bkz. ARCHITECTURE.md §7). Aşama 14'e kadar kullanılmaz ama sözleşme en
baştan tanımlıdır ki şema kararlı kalsın.

**Girdi:** `{ target_language, persona_id }`
**Çıktı:** `{ session_token, expires_at, daily_quota_remaining_seconds }`

## 13. `weekly-report` / `monthly-assessment`

Detay: [ANALYTICS_AND_ADAPTATION.md](./ANALYTICS_AND_ADAPTATION.md)
§Haftalık Rapor ve §Aylık Değerlendirme. Bu iki function, ham istatistik
sorgularını (SQL, Edge Function içinde) + AI'nın yorumlayıcı metin
üretimini birleştirir; sayısal veriler AI tarafından **hesaplanmaz**,
yalnızca SQL sonucundan yorumlanır (AI'nın toplama/sayma hatası yapma
riskini ortadan kaldırmak için).

## 14. Açık noktalar

- Şema paylaşımının tam mekanizması (npm paket mi, dosya kopyası mı,
  Deno import map mi) `supabase/` klasörü oluşturulurken netleştirilir.
- `content-import-analyze` için karakter sınırı kesin sayısı kalibrasyon
  gerektirir.
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
