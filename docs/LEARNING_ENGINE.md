# Öğrenme Motoru — FSRS, Değerlendirme, Hakimiyet

Durum: Taslak (ilk sürüm).
İlgili belgeler: [DATA_MODEL.md](./DATA_MODEL.md) §0 Sözlük, §3-4,
[AI_AND_EDGE_FUNCTION_CONTRACTS.md](./AI_AND_EDGE_FUNCTION_CONTRACTS.md) §production-feedback,
[ANALYTICS_AND_ADAPTATION.md](./ANALYTICS_AND_ADAPTATION.md)

## 1. Temel ilke: AI değerlendirir, FSRS zamanlar

Bu ayrım üründe **sabittir ve ihlal edilmez**:

- Yapay zekâ: cevabın doğruluğunu/kalitesini yapılandırılmış JSON olarak
  değerlendirir ve bir **önerilen** `fsrs_rating` üretir.
- Deterministik kural fonksiyonu (`decideFinalRating`, TypeScript, hem
  istemci hem Edge Function'da aynı kod): AI'nın önerisini + diğer sinyalleri
  girdi alıp **nihai** `fsrs_rating`'i belirler.
- `ts-fsrs` motoru: yalnızca nihai rating'i girdi alır, sonraki tekrar
  tarihini/istikrar/zorluk değerlerini hesaplar. **AI, `ts-fsrs`'in hiçbir
  parametresine doğrudan dokunmaz.**

Bunun nedeni: AI'nın ürettiği bir sayısal değerin doğrudan zamanlamayı
belirlemesi, modelin tutarsızlığını (aynı cevaba farklı günlerde farklı
puan vermesi) doğrudan tekrar takvimine sızdırır. Deterministik bir ara
katman, bu gürültüyü kurallarla filtreler ve **tekrarlanabilir/test
edilebilir** kılar.

## 2. `decideFinalRating` girdileri

`docs/DATA_MODEL.md §4`'teki `production_attempts.ai_evaluation` ve
`review_events` alanlarından gelir:

1. Anlam doğruluğu (AI: `overall_verdict` — `correct|natural_variant|
   minor_issue|major_issue|incorrect`)
2. Dilbilgisi (AI: `errors[]` içinde dilbilgisi kategorili girişler var mı)
3. Doğallık (AI: üslup/doğallık skoru, `errors[]` içinde `style_only`
   girişler)
4. Hata şiddeti (`error_severity` — en yüksek şiddet belirleyicidir)
5. Kullanılan ipucu (`hint_level_used` — 5 veya 6 kullanıldıysa nihai
   rating asla `easy`/`good` olamaz, bkz. §3 kural tablosu)
6. Cevap süresi (`response_time_ms` — aşırı uzun süre + doğru cevap
   `easy` yerine `good`'a çeker)
7. Kullanıcının güven düzeyi (`confidence_level`)
8. Bağımsız üretim mi (ipucu yok, kendi başına) mı, yoksa yardımlı mı

## 3. Karar tablosu (ilk sürüm kuralları — ayarlanabilir sabitler)

Öncelik sırasıyla yukarıdan aşağıya değerlendirilir, ilk eşleşen kural
uygulanır:

| Koşul | Nihai rating |
|---|---|
| `error_severity = critical` VE `confidence_level = certain` | `again` (bkz. §4 "emin+yanlış" önceliklendirmesi) |
| `error_severity = critical` | `again` |
| `hint_level_used >= 5` (tam kelime/tam cevap verildi) | `again` |
| `error_severity = moderate` | `hard` |
| `hint_level_used` 3-4 (kısmi/kalıp ipucu) | `hard` |
| `error_severity = minor` VEYA `hint_level_used` 1-2 | `good` |
| `error_severity = style_only` VE bağımsız üretim VE `response_time_ms` normal aralıkta | AI önerisi `easy` ise `easy`, değilse `good` |
| Kusursuz, bağımsız, hızlı, ipucusuz | AI önerisini olduğu gibi kullan (`good` veya `easy`) |

Bu tablo, AI'nın önerisini **geçersiz kılabilen** bir güvenlik ağıdır; AI
önerisi yalnızca son satırda doğrudan kullanılır. Tablo sabitleri (eşik
değerleri, "normal aralık" tanımı) ilk kullanım verisiyle kalibre edilir
(bkz. DECISIONS_AND_OPEN_QUESTIONS.md).

## 4. "Emin + yanlış" önceliklendirmesi

Kullanıcı `confidence_level = certain` iken `error_severity = critical`
veya `moderate` bir hata yaparsa, bu **öğrenilmiş hata (fossilized error)**
olarak işaretlenir (`error_log.recurrence_count` ve ayrı bir
`is_high_confidence_error` bayrağı — bkz. DATA_MODEL.md §8 güncellemesi
gerekirse DECISIONS_AND_OPEN_QUESTIONS.md'de not edilir). Bu kayıtlar:

- Haftalık raporda ayrı bir bölümde vurgulanır (bkz.
  ANALYTICS_AND_ADAPTATION.md §Haftalık Rapor).
- FSRS zorluk (`difficulty`) değeri, normal `again` davranışına ek olarak
  bir sonraki karşılaşmada **ekstra bağlam çeşitliliği** tetikler (aynı
  cümle değil, farklı bağlamda yeniden test — bkz. §6).

## 5. İpucu merdiveni (hint ladder)

Sıra sabittir, atlanamaz (kullanıcı doğrudan 6. seviyeyi isteyebilir ama
sistem varsayılan olarak sırayla sunar):

1. Kelime türü (`part_of_speech`) — ör. "bu bir fiil"
2. İlk harf
3. Kelimenin bir kısmı (ör. ilk 2-3 harf veya hece)
4. İlgili kalıp/yapı (ör. "burada bir phrasal verb lazım")
5. Tam kelime (ama cümledeki yeri/çekimi kullanıcıya kalır)
6. Tam cevap

Her ipucu talebi `production_attempt_hints`'e append edilir; hiçbir ipucu
üzerine yazılmaz/silinmez. Kullanıcı önce **kendi hatasını bulma fırsatı**
bulur: sistem, cevap gönderildikten sonra doğrudan doğru cevabı göstermez,
önce "bu cevapta bir sorun olabilir, tekrar dener misin?" tipi bir
fırsat sunar (yapılandırılmış `self_correction_prompt` — AI evaluation
çıktısının bir alanı), yalnızca kullanıcı ipucu isterse merdiven başlar.

Düzeltilen cevap, kullanıcıya **yeniden ürettirilir** (kopyala-yapıştır
değil, yeniden yazma/söyleme) — bu, LEARNING_ENGINE'in "üretim, tanıma
değildir" ilkesinin somut uygulamasıdır.

## 6. Yakın varyasyon ve bağlam transferi

Bir `learning_item`, `mastery_state = mastered`'a geçmeden önce **en az N
farklı bağlamda** (ör. izole cümle + hikâye transferi + sohbet transferi —
kesin N değeri DECISIONS_AND_OPEN_QUESTIONS.md'de kalibrasyon gerektiren
bir sabit olarak işaretlenmiştir, başlangıç önerisi: 3) bağımsız
üretilmiş olmalıdır. Aynı kartın birebir aynı cümlede tekrar tekrar
gösterilmesi **yasaktır**; tekrar zamanı geldiğinde:

- Üretim modülü, aynı `learning_item`'i **farklı bir TR kaynak cümlede**
  sorar (yeni `production_prompts` satırı, AI tarafından üretilir).
- Hikâye/sohbet modülleri, FSRS'ten "bugün tekrar zamanı gelen" öğe
  listesini alır ve bu öğeleri **doğal bağlam içinde** kullanır (bkz.
  ADAPTIVE_STORIES.md §İçerik Seçimi, günlük görev dengesi §7).

## 7. Hakimiyet durumları — geçiş kuralları

`mastery_state` geçişleri tek yönlü değildir; **geri düşebilir**:

- `new` → `noticed`: kullanıcı kelimeyi bir metinde/sohbette gördü ve
  dokundu (anlamına baktı).
- `noticed` → `recognized_in_context`: kullanıcı bağlam içinde anlamını
  doğru tahmin etti/anladı (ör. hikâye anlama sorusunda doğru cevap).
- `recognized_in_context` → `hint_producible`: kullanıcı ipucuyla (herhangi
  bir seviyede) doğru üretti.
- `hint_producible` → `independently_producible`: ipucusuz, bağımsız,
  doğru üretim (izole veya bağlamda).
- `independently_producible` → `mastered`: §6'daki çoklu bağlam şartı
  sağlandı VE FSRS `state = review` VE son N tekrarda `again` yok.
- **Geri düşüş:** `mastered`/`independently_producible` iken `again` alınan
  bir üretim, durumu bir seviye geri düşürür (`hint_producible`'a). Bu,
  "bir kere doğru üretmek kalıcı öğrenme değildir" ilkesinin karşılığıdır.

**Bir kelimenin anlamına bakmak onu öğrenilmiş saymaz** — yalnızca
`noticed`/`recognized_in_context`'e taşır, asla `hint_producible` veya
üstüne otomatik geçiş yapmaz; bu geçiş yalnızca gerçek üretim olayıyla
(`review_events` veya `production_attempts`) tetiklenir.

## 8. Pasif/aktif kelime hazinesi ayrımı

`learning_item_states.is_active_vocabulary`:
- `false`: yalnızca `recognized_in_context` ve altı durumlar.
- `true`: `hint_producible` ve üstü.

İstatistik ekranı bu ikisini **ayrı grafik/sayı** olarak gösterir (bkz.
ANALYTICS_AND_ADAPTATION.md §İstatistik Ekranı) — tek bir "öğrenilen kelime
sayısı" gibi yanıltıcı bir toplam **gösterilmez**.

## 9. Kademeli TR desteği azaltma

Kullanıcının genel ilerleme seviyesine (dil bazlı ortalama CEFR tahmini +
aktif kelime oranı) göre, sohbet/hikâye arayüzünde TR yardım varsayılan
görünürlüğü kademeli azalır:

1. Başlangıç: tam çeviri varsayılan görünür.
2. Sonra: TR yalnızca dokununca gösterilir.
3. Sonra: yalnızca zor/nadir kelimelerin TR anlamı otomatik gösterilir.
4. Sonra: yalnızca basit hedef-dil açıklaması (TR yok, dokununca da).
5. İleri seviye: tamamen hedef dil (TR açıklama yalnızca özellikle
   istenirse).

Bu otomatik geçiş **tek yönlü zorlama değildir** — kullanıcı Ayarlar'dan
her zaman bir önceki seviyeye dönebilir (bkz. SCREEN_AND_USER_FLOWS.md
§Ayarlar).

## 10. Determinizm ve test edilebilirlik

`decideFinalRating` ve hakimiyet geçiş kuralları **saf fonksiyonlardır**
(yan etkisiz, girdi→çıktı), hem istemci (offline hesaplama için) hem
Edge Function'da aynı TypeScript kod paylaşılır (bkz. ARCHITECTURE.md §3).
Bu fonksiyonlar için birim testleri zorunludur (bkz.
[TEST_AND_ACCEPTANCE_PLAN.md](./TEST_AND_ACCEPTANCE_PLAN.md) §Öğrenme
Motoru Testleri) — AI çağrısı gerektirmeden, sabit girdi/çıktı
tablolarıyla test edilir.

## 11. Açık noktalar

- Bağlam çeşitliliği için kesin "N farklı bağlam" sayısı kalibrasyon
  gerektirir.
- Karar tablosu eşik sabitleri (§3) ilk gerçek kullanım verisiyle
  ayarlanacaktır; roadmap Aşama 6 sonrası bir gözden geçirme noktası
  içerir.
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
