# CLAUDE.md

Bu dosya, bu depoda çalışan Claude Code (veya başka bir ajan) için üst düzey
yönlendirme belgesidir. Ürünün tam tanımı ve teknik kararları burada değil,
`docs/` klasöründeki belgelerdedir. Bu dosya yalnızca "nereye bakmalıyım" ve
"nelere dikkat etmeliyim" sorularına hızlı cevap verir.

## Depo durumu (bu belgenin yazıldığı tarih itibarıyla)

- Depo, **yalnızca planlama ve dokümantasyon aşamasındadır**. Uygulama kodu
  henüz ürüne özgü hiçbir şey içermez; `apps/mobile` klasörü stock bir Expo
  Router + `expo-dev-client` başlangıç şablonudur (SDK 57).
- Android development build oluşturulmuş ve fiziksel cihazda açıldığı
  doğrulanmıştır. Bu, "development client kurulumu çalışıyor" anlamına gelir;
  ürün özellikleri henüz yoktur.
- Bağlı Supabase projesi (`nqmmlhrkhafwrfhwljdp`) **tamamen boştur**: tablo,
  migration, Edge Function yoktur.
- `docs/` altındaki tüm belgeler bu ilk planlama görevinde oluşturulmuştur ve
  henüz hiçbir kodla doğrulanmamış bir hedef mimariyi tarif eder. Kod
  yazılırken belgeyle kod çelişirse, **önce hangisinin güncel/doğru olduğunu
  netleştir**, sessizce birini yok saymak yerine `docs/DECISIONS_AND_OPEN_QUESTIONS.md`
  içine bir not düş.

## Depo yapısı

```
/                        (monorepo kökü; henüz bir workspace tooling'i yok)
  apps/mobile/           Expo React Native uygulaması (tek uygulama)
  docs/                  Ürün, mimari ve süreç belgeleri (bkz. aşağıdaki liste)
  .mcp.json              Supabase MCP sunucu bağlantısı (project_ref: nqmmlhrkhafwrfhwljdp)
```

Supabase tarafı (migrations, Edge Functions) için henüz bir `supabase/` klasörü
yoktur; bu, `docs/IMPLEMENTATION_ROADMAP.md` Aşama 2-3'te oluşturulacaktır.

## Önce oku

Herhangi bir kod değişikliğine başlamadan önce, ilgili belgeyi `docs/`
klasöründe oku. Özellikle:

- Genel ürün kapsamı ve kabul kriterleri belirsizse: `docs/PRD.md`
- Bir ekran/akış eklerken: `docs/SCREEN_AND_USER_FLOWS.md`
- Bir tablo/migration yazarken: `docs/DATA_MODEL.md`
- Bir Edge Function veya OpenAI çağrısı yazarken: `docs/AI_AND_EDGE_FUNCTION_CONTRACTS.md`
  ve `docs/SECURITY_AND_COST_CONTROLS.md`
- FSRS/tekrar mantığına dokunurken: `docs/LEARNING_ENGINE.md`
- Hikâye üretimiyle ilgili çalışırken: `docs/ADAPTIVE_STORIES.md`
- Persona/RAG ile ilgili çalışırken: `docs/PERSONA_AND_RAG_POLICY.md`
- Offline/senkron ile ilgili çalışırken: `docs/OFFLINE_AND_SYNC.md`
- İstatistik/uyarlama mantığıyla ilgili çalışırken: `docs/ANALYTICS_AND_ADAPTATION.md`
- Hangi aşamada olduğumuzu ve sırayı kontrol etmek için: `docs/IMPLEMENTATION_ROADMAP.md`
- Açık bir soru/varsayım varsa önce: `docs/DECISIONS_AND_OPEN_QUESTIONS.md`

## Sabit, asla ihlal edilmeyecek kurallar

Bu kurallar tüm belgelerde tekrar eder çünkü güvenlik açısından kritiktir:

1. **OpenAI API anahtarı yalnızca Supabase Edge Function secret'larında
   bulunur.** Mobil kodda, `app.json`/`eas.json` içinde, `EXPO_PUBLIC_*`
   ortam değişkenlerinde veya GitHub'da asla gizli anahtar olmaz.
2. **Tüm OpenAI çağrıları Supabase Edge Functions üzerinden geçer.** Mobil
   uygulama doğrudan OpenAI'a istek atmaz.
3. **Her kullanıcı verisi tablosunda Row Level Security açıktır.** RLS'siz
   migration merge edilmez.
4. **Public signup kapalıdır.** Uygulama tek kullanıcı (+ gelecekte 3-4
   whitelist'li hesaba kadar genişleyebilir) modunda çalışır.
5. **Yapay zekâ çıktıları her zaman yapılandırılmış JSON'dır ve Zod ile
   doğrulanır.** Serbest metin çıktısına güvenerek karar alan kod yazılmaz.
6. **Model isimleri ortam değişkeni/config üzerinden değiştirilebilir
   olmalıdır.** Doğrulanmamış/geçici model adları koda sabitlenmez.
7. **FSRS tekrar tarihini yalnızca `ts-fsrs` (deterministik motor) hesaplar.**
   Yapay zekâ yalnızca kalite sinyali ve önerilen rating üretir; nihai
   rating'i belirleyen kural tabanlı/deterministik bir fonksiyondur (bkz.
   `docs/LEARNING_ENGINE.md`).

## Çalışma tarzı beklentileri

- Özellikleri tek seferde değil, `docs/IMPLEMENTATION_ROADMAP.md`'deki
  aşamalara göre uçtan uca çalışan küçük adımlarla geliştir.
- Her aşama sonunda o aşamanın kabul kriterlerini ve manuel cihaz testini
  gerçekten çalıştır/doğrula; bir sonraki aşamaya belgede işaretlenmeden
  geçme.
- Yeni bir mimari karar gerektiren bir durumla karşılaşırsan, sessizce
  varsayımda bulunmak yerine `docs/DECISIONS_AND_OPEN_QUESTIONS.md`'ye ekle
  ve kullanıcıyla netleştir.
- Terminoloji için belgelerdeki sabit sözlüğe uy (ör. `mastery_state`,
  `confidence_level`, `error_severity`, ipucu seviyeleri 1-6). Yeni bir terim
  icat etmeden önce `docs/DATA_MODEL.md`'deki sözlüğü kontrol et.
