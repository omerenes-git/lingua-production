# Adaptif Hikâyeler

Durum: Taslak (ilk sürüm).
İlgili belgeler: [LEARNING_ENGINE.md](./LEARNING_ENGINE.md), [DATA_MODEL.md](./DATA_MODEL.md) §7,
[AI_AND_EDGE_FUNCTION_CONTRACTS.md](./AI_AND_EDGE_FUNCTION_CONTRACTS.md) §8-9

## 1. Amaç

LingQ benzeri i+1 okuma/dinleme yaklaşımı, ancak içerik **tamamen
kullanıcının kendi öğrenme verisinden** üretilir — genel bir seviye
havuzundan değil.

## 2. İçerik seçimi girdileri

Hikâye üretim isteği hazırlanırken şu veriler toplanır (bkz.
DATA_MODEL.md §3, §8):

- Bilinmeyen kelimeler (`mastery_state = new`, kullanıcının ilgi
  alanlarıyla kesişen).
- Emin olunmayan kelimeler (`confidence_level` geçmişi düşük olanlar).
- Öğrenilmekte olan kalıplar (`hint_producible`).
- Sohbette Türkçesi açılan ifadeler (`chat_message_helpers.helper_type =
  show_tr`).
- FSRS tekrar zamanı gelen öğeler (`fsrs_cards.due <= today`).
- Sık yapılan dilbilgisi hataları (`error_log`, dil bazlı kategori
  frekansı).
- Pasif bilinip aktif üretilemeyen kelimeler (`is_active_vocabulary =
  false` ama `mastery_state >= recognized_in_context`).
- Zorlanılan cümle yapıları (`error_log.error_category` grammar_construct
  ağırlıklı).
- Kullanıcının ilgi alanları + klinik/gündelik ihtiyaçları (profil/etiket
  geçmişi — `sentence_tag` dağılımı).
- Seçilen dil ve o dildeki tahmini CEFR seviyesi.

## 3. Metin dağılımı (i+1)

Başlangıç oranı:
- %85-92 bilinen kelime/yapı
- %5-10 öğrenilmekte olan hedef
- En fazla %3-5 tamamen yeni unsur

**Bu oranlar sabit değildir.** Okuma performans sinyallerine göre uyarlanır:

- Anlama sorularında yüksek başarı + düşük "TR göster" kullanımı →
  yeni/öğrenilmekte oranı bir sonraki hikâyede artırılır.
- Anlama başarısı düşük veya sık TR açma → oran bir sonraki hikâyede
  bilinen içerik lehine geri çekilir.
- Bu uyarlama, `story-generate` çağrısına girdi olarak verilen
  `target_new_ratio`/`target_learning_ratio` parametrelerinin, son N
  hikâyenin performans özetine göre hesaplanmasıyla yapılır (deterministik
  kural, AI değil — bkz. ANALYTICS_AND_ADAPTATION.md §Uyarlama Kuralları).

## 4. Üretim sözleşmesi (`story-generate`)

**Girdi:**
```
{
  target_language, cefr_level_estimate,
  target_learning_items: LearningItemRef[],   // §2'den seçilmiş, öncelik sıralı
  target_new_ratio, target_learning_ratio,
  story_type,                                  // bkz. §5
  continuing_series_id?: string,               // devam eden seri ise
  user_interests: string[],
  context_needs: sentence_tag[],                // ör. clinical, ielts
}
```

**Çıktı:**
```
{
  title, story_type, target_language, cefr_level,
  segments: Array<{
    order, text,
    annotations: Array<{ span, kind: "new"|"noticed"|"learning_pattern"|"known"|"target_grammar", learning_item_id? }>,
  }>,
  target_grammar_structure: string,
  used_learning_items: LearningItemRef[],       // gerçekten metinde kullanılanlar (doğrulama için)
  audio_script: string,                          // TTS için, segment sınırlarıyla
}
```

Her `span` dokunulduğunda gösterilecek bilgi (TR anlam bu cümle bağlamında,
basit hedef-dil tanım, telaffuz, örnekler, ilgili kalıp, dilbilgisi bilgisi,
"öğreniyorum/biliyorum" seçeneği) ayrı, önbelleklenebilir bir alt-uçtan
(`_shared` içinde, `chat-turn` §5'teki kelime açıklama uç noktasıyla aynı
mekanizma) gelir — `story-generate` bunları önceden üretmez (maliyet).

## 5. Hikâye türleri

Günlük yaşam, klinik vaka, hastane ortamı, seyahat, diyalog, gizem, mizah,
bilim kurgu, tarihsel kurgu, iş ve kariyer, IELTS, haber benzeri açıklayıcı
metin, birinci şahıs günlük, aile ve sosyal yaşam.

**Devam eden seriler** (`stories.series_id`, `stories.series_order`):
aynı karakter/olay örgüsü farklı bölümlerde sürer; bu, sarmal tekrar
(spaced exposure to the same items across a narrative) için kullanılır —
bir önceki bölümde tanıtılan kelime/kalıp, sonraki bölümde FSRS tekrar
zamanı geldiğinde tekrar doğal olarak geçer.

## 6. İzlenen öğrenme öğesi türleri (tek kelime dışında)

Collocation, phrasal verb, fiil-edat yapıları, Almanca artikel ve hâl
yapıları, Sırpça edat-hâl birlikteliği, fiil görünüşleri, cümle
başlangıçları, bağlaç yapıları, fikir savunma kalıpları, klinik komut ve
açıklamalar — tümü `learning_item_type` enum'ında tanımlıdır (bkz.
DATA_MODEL.md §0).

## 7. Ses özellikleri

Normal hız, yavaş hız, cümle cümle dinleme, metinle birlikte dinleme,
önce yalnızca dinleme sonra metni açma, seçili cümleyi tekrar dinleme.
TTS, `audio_script` üzerinden segment bazlı üretilir ve Storage'da
önbelleklenir (aynı hikâye tekrar dinlendiğinde yeniden üretilmez).

## 8. Hikâye sonrası görevler

Anlama soruları, doğru-yanlış, boşluk doldurma, Türkçeden hedef dile
üretim (bu görev tipi doğrudan `production_attempts`'e yazar ve normal
FSRS/hata döngüsüne girer), yazılı yeniden anlatma, sesli yeniden
anlatma, alternatif son yazma, hikâye karakteriyle sohbet (bu,
`chat_sessions`'a `persona_id = null`, `story_id` bağlamlı özel bir
oturum olarak açılır), öğrenme adaylarını seçme (kullanıcı hangi
`annotations`'ın SRS'e ekleneceğini onaylar).

## 9. Kalite kontrolü (`story-quality-check`)

`story-generate` çıktısı kullanıcıya gösterilmeden önce **ikinci bir AI
geçişinden** zorunlu olarak geçer. Bu geçiş ayrı bir Edge Function'dır
(farklı/taze bir çağrı — aynı çağrıda "kendi kendini kontrol et" istemek
yerine ayrı bir değerlendirme turu, çünkü tek turda üretim+özeleştiri
aynı modelin aynı hatayı tekrar gözden kaçırma riskini taşır).

**Kontrol listesi (çıktı şeması alanları):**
```
{
  level_appropriate: boolean, level_issue_note?: string,
  reads_naturally: boolean, naturalness_issue_note?: string,
  targets_used_correctly: boolean, target_usage_issues?: string[],
  grammar_correct: boolean, grammar_issues?: string[],
  excessive_new_vocabulary: boolean, new_vocab_count: number,
  inflections_correct_de_sr: boolean, inflection_issues?: string[],
  story_coherent: boolean,
  target_phrases_actually_present: boolean, missing_targets?: string[],
  verdict: "approved" | "needs_regeneration" | "needs_minor_fix",
}
```

- `approved`: kullanıcıya gösterilir.
- `needs_minor_fix`: aynı Edge Function çağrısı, tespit edilen sorunları
  girdi olarak vererek `story-generate`'den **düzeltme** ister (tam
  yeniden üretim değil).
- `needs_regeneration`: `story-generate` sıfırdan tekrar çağrılır (maks.
  2 deneme; 2 denemede de başarısız olursa kullanıcıya "bu hikâye şu an
  üretilemedi" hatası + tekrar deneme seçeneği gösterilir, sessizce
  düşük kaliteli içerik gösterilmez).

## 10. Kullanıcı kendi metnini ekleme

Kullanıcı kendi metnini yapıştırabilir veya dosyadan ekleyebilir; bu
durumda `story-generate` değil, `content-import-analyze` (bkz.
AI_AND_EDGE_FUNCTION_CONTRACTS.md §10) kullanılır — üretim yoktur, yalnızca
analiz + işaretleme + alıştırma önerisi. Bu metinler `stories` tablosuna
`source_type = user_imported` olarak kaydedilebilir (aynı okuma arayüzünü
kullanmak için) ama `story-quality-check`'ten geçmez (kullanıcının kendi
metni "düzeltilecek" bir şey değildir).

## 11. Maliyet notu

Hikâye üretimi + kalite kontrolü, tek bir `production-feedback` çağrısından
çok daha pahalıdır (uzun çıktı + ikinci geçiş). Bu yüzden:

- Günlük hikâye üretim sayısı ayrı bir kota grubudur (bkz.
  SECURITY_AND_COST_CONTROLS.md §Kota Grupları).
- Aynı gün içinde "yeniden üret" istekleri sınırlıdır (kullanıcı beğenmezse
  sınırsız yeniden üretim yapamaz — bu hem maliyet hem de "asla
  memnun olmayan sonsuz döngü" riskini azaltır).

## 12. Açık noktalar

- Bağlam çeşitliliği sayısı (§4 `target_learning_items` önceliklendirme
  ağırlıkları) kalibrasyon gerektirir.
- Kullanıcı kendi metnini eklediğinde üretilen alıştırmaların kalite
  kontrolüne tabi olup olmayacağı netleştirilmeli.
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
