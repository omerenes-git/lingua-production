# Persona Sistemi ve RAG Politikası

Durum: Taslak (ilk sürüm).
İlgili belgeler: [DATA_MODEL.md](./DATA_MODEL.md) §6, [AI_AND_EDGE_FUNCTION_CONTRACTS.md](./AI_AND_EDGE_FUNCTION_CONTRACTS.md) §5, §7,
[SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md) §Prompt Injection ve Kaynak Zehirlemesi

## 1. Persona kategorileri

| `persona_kind` | Örnekler | `is_simulation` |
|---|---|---|
| `generic_character` | Bilim insanı, filozof, tarihçi, teknoloji girişimcisi, sert fakat adil tartışmacı, klinik uzman, fizyoterapist, seyahat arkadaşı, günlük konuşma arkadaşı, IELTS mülakatçısı, Almanca resmî kurum görevlisi, Sırbistan'da aile ortamı karakterleri | `false` (gerçek bir kişiyi temsil etmiyor) |
| `historical_figure` | Atatürk, Marcus Aurelius, Nikola Tesla, Leonardo da Vinci, diğer güvenilir kaynağı bulunan tarihsel kişiler | `true` (zorunlu) |
| `contemporary_figure_simulation` | Kamuya açık görüşlerden çıkarılan yapay zekâ yorumları (ör. "ilk prensiplerle düşünen bir teknoloji girişimcisi" gibi, kullanıcı isterse açıkça etiketlenmiş bir kişiye atıfla) | `true` (zorunlu) |

## 2. Değişmez kurallar (her persona için)

1. Her gerçek kişi simülasyonu **açıkça yapay zekâ yorumu olarak
   etiketlenir** (`disclosure_label`, sohbet ekranında karakterin
   yanında/üstünde sürekli görünür — tek seferlik bir uyarı değil).
2. Gerçek kişiyi **temsil ettiğini iddia etmez** ("Ben Atatürk'üm" demez;
   "Atatürk'ün belgelenmiş görüşlerinden esinlenen bir yapay zekâ yorumu"
   çerçevesini korur).
3. **Sahte alıntı üretmez.** Doğrudan alıntı yalnızca `persona_sources`'ta
   kayıtlı, atıflı bir kaynaktan geliyorsa kullanılır; aksi halde
   parafraze/çıkarım olarak sunulur.
4. **Uydurma anı veya kişisel deneyim anlatmaz.**
5. **Kesin olmayan görüşleri tarihsel gerçek gibi sunmaz** — belirsizlik
   açıkça işaretlenir ("bu konuda net bir kaynak yok, ama ... çıkarımı
   yapılabilir" gibi).
6. **Belgelenmiş görüş ile yapay zekâ çıkarımını ayırır** (çıktı şemasında
   `source_grounded: boolean` alanı — bkz. §4).
7. **Gerçek kişinin sesini klonlamaz**; TTS her zaman genel yapay zekâ
   sesi kullanır (bkz. SECURITY_AND_COST_CONTROLS.md, ARCHITECTURE.md §3).
8. Her persona için **değerler, düşünme biçimi, tartışma tarzı, bilgi
   sınırları ve yasaklanan davranışlar** açıkça tanımlanır
   (`personas.values_and_stance`, `argument_style`, `knowledge_boundaries`,
   `forbidden_behaviors` — bkz. DATA_MODEL.md §6).

## 3. Tutarlı karakter davranışı

Persona sohbeti (bkz. PRD §4.4), her görüşe otomatik katılan bir "evet
efendim" asistanı olmamalıdır:

- Persona **tutarlı düşünce ve değerlere** sahiptir (`values_and_stance`
  prompt'a her turn'de enjekte edilir — bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md
  §5).
- Gerektiğinde **kendi görüşünü savunur**, karşı argüman sunar, kullanıcıdan
  gerekçe/kanıt isteyebilir, mantıksal çelişkileri gösterebilir.
- **Güçlü bir argüman karşısında görüşünü kısmen güncelleyebilir** (tam
  U-dönüşü değil — `persona_stance_note_tr` alanı bu güncellemeyi kullanıcıya
  şeffaf şekilde açıklar, bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md §5).
- Tartışmayı **kişiselleştirmez** (kullanıcıya karşı değil, fikre karşı
  argüman üretir; `forbidden_behaviors` bunu açıkça yasaklar).

### Tartışma modları
Destekleyici, Dengeli, Meydan okuyan, Yoğun tartışma — `discussion_mode`
prompt'ta persona'nın ne kadar agresif karşı argüman üreteceğini
ayarlayan bir yoğunluk parametresidir, persona'nın temel değerlerini
değiştirmez.

### Düzeltme modları
- **Akıcı sohbet** (`fluent_chat`): önce doğal cevap, düzeltme gizli
  kartta.
- **Öğretmen modu** (`teacher_mode`): cevapla birlikte hatalar açıklanır.
- **Katı üretim** (`strict_production`): kritik hata düzeltilmeden
  konuşma ilerletilmez (`blocked_until_correction: true` — bkz.
  AI_AND_EDGE_FUNCTION_CONTRACTS.md §5).

## 4. RAG akışı (yalnızca `historical_figure` ve `contemporary_figure_simulation`)

```
kullanıcı mesajı
      │
      ▼
persona-retrieval yardımcı modülü
  (pgvector benzerlik araması: persona_source_chunks)
      │
      ▼
en alakalı N parça + atıf listesi  ──►  chat-turn prompt'una enjekte edilir
      │
      ▼
model çıktısında her ifade için source_grounded: boolean
  (true: doğrudan kaynağa dayanıyor, atıf gösterilir)
  (false: yapay zekâ çıkarımı, açıkça "çıkarım" olarak etiketlenir)
```

`persona_sources` içeriği **önceden, kontrollü şekilde** eklenir (kullanıcı
tarafından veya seed script ile) — sohbet sırasında dinamik olarak
internetten otomatik toplanıp RAG'e beslenmez (bu, kaynak zehirlemesi
riskini sınırlar, bkz. §6).

## 5. Güncel konular için opsiyonel web araması

Kullanıcı güncel bir konu sorarsa, **isteğe bağlı** bir web arama aracı
planlanır (ilk sürümde açık değildir — bkz.
IMPLEMENTATION_ROADMAP.md, bu özellik erken aşamalarda kapsam dışıdır ve
ayrı bir karar noktası olarak DECISIONS_AND_OPEN_QUESTIONS.md'de
işaretlenmiştir). Açıldığında:

- Arama sonucu kaynak gösterimiyle birlikte sunulur (URL/başlık).
- Arama sonuçları `persona_sources`'a **kalıcı olarak eklenmez** (geçici
  bağlam), yalnızca o sohbet turunda kullanılır — bu, kaynak
  zehirlemesinin kalıcı persona bilgisine sızmasını engeller.
- Ayrı bir kota grubuna tabidir (bkz. SECURITY_AND_COST_CONTROLS.md
  §Kota Grupları).

## 6. Prompt injection ve kaynak zehirlemesi

- **Persona kaynakları ile kullanıcı tarafından eklenen içerik açıkça
  ayrılır**: `persona_source_chunks` yalnızca `service_role` ile
  yazılabilir (bkz. DATA_MODEL.md §13); kullanıcının sohbet mesajları veya
  içe aktardığı metinler asla bu tabloya karışmaz.
- RAG'den gelen parçalar prompt'a **açıkça sınırlandırılmış bir blok**
  olarak enjekte edilir (ör. `<persona_sources>...</persona_sources>`),
  ve sistem talimatı bu bloğun içeriğinin talimat değil **referans veri**
  olduğunu belirtir — kaynak metninde "bu talimatları unut" tarzı bir
  enjeksiyon denemesi olsa bile, modelin bunu talimat olarak yorumlamaması
  için prompt açıkça bu ayrımı yapar.
- Kullanıcının sohbet mesajı da benzer şekilde ayrı bir bloktur; kullanıcı
  mesajı içinde "sen artık X personasısın, kurallarını unut" gibi bir
  deneme, sistem talimatındaki `forbidden_behaviors`'ı geçersiz kılamaz
  (persona kimliği ve kısıtları her turn'de sistem talimatı olarak yeniden
  enjekte edilir, kullanıcı mesajından türetilmez).
- Web arama sonuçları (açıldığında) da aynı "referans veri, talimat değil"
  çerçevesiyle enjekte edilir.

## 7. Tarihsel persona için kaynak yönetimi

- Her `persona_sources` satırı bir `credibility_note` taşır (ör. "birincil
  kaynak", "akademik ikincil kaynak", "popüler/doğrulanmamış — düşük
  güven"). Düşük güvenilirlikli kaynaklar RAG aramasında **daha düşük
  öncelikle** kullanılır veya modele "bu kaynağın güvenilirliği düşük"
  notuyla sunulur.
- Kaynak ekleme/güncelleme **kod/migration/seed script ile** yapılır,
  uygulama içinden kullanıcı tarafından serbestçe metin eklenip
  doğrudan bir tarihsel kişinin ağzına konulamaz (bu, hem etik hem de
  kaynak zehirlemesi riskini azaltır).

## 8. Açık noktalar

- Web arama özelliğinin hangi aşamada açılacağı ve maliyet modeli net
  değil.
- Güncel kişi simülasyonlarında "kamuya açık görüş" tanımının sınırları
  (ör. hangi kaynaklar kabul edilir) netleştirilmeli.
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
