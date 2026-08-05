# Kararlar ve Açık Sorular

Durum: Taslak (ilk sürüm). Bu belge, diğer tüm `docs/` dosyalarındaki
"Açık noktalar" bölümlerinin tek bir yerde toplanmış hâlidir + alınan
kritik mimari kararların gerekçeleridir. Yeni bir belirsizlikle
karşılaşıldığında buraya eklenir; kod yazılırken bu listeye bakılmadan
sessizce varsayımda bulunulmaz.

## 1. Alınmış kritik kararlar (gerekçeli)

| Karar | Gerekçe | İlgili belge |
|---|---|---|
| FSRS zamanlamasını yalnızca `ts-fsrs` belirler, AI yalnızca öneri üretir | AI'nın tutarsızlığının doğrudan tekrar takvimine sızmasını önlemek; test edilebilirlik | LEARNING_ENGINE.md §1 |
| Tüm kullanıcı olayları append-only, türetilmiş durum ayrı tablo | Çoklu cihaz senkronunda çift sayım/veri kaybını yapısal olarak önlemek | DATA_MODEL.md §1, OFFLINE_AND_SYNC.md §2 |
| pgvector yalnızca persona RAG için, öğrenme öğelerinde kullanılmıyor | Kelime/kalıp eşleştirme lemma bazlı deterministik olmalı; gereksiz karmaşıklık eklenmemeli | ARCHITECTURE.md §4-5 |
| Model isimleri hiçbir yerde sabit yazılmıyor, env değişkeninden okunuyor | Doğrulanmamış/geçici model adlarının koda sabitlenmemesi kuralı | ARCHITECTURE.md §8, CLAUDE.md |
| Gerçek zamanlı ses son aşamalara bırakıldı ama mimari en baştan buna uygun | Maliyet/karmaşıklık riski + şema değişikliği ihtiyacını önceden ortadan kaldırmak | ARCHITECTURE.md §7 |
| Oyunlaştırma (can/enerji/liderlik) bilinçli olarak eklenmiyor | Tek kullanıcı, odağı üretimden uzaklaştırır | PRD.md §5, §9 |
| Her tablo `user_id` taşıyor (tek kullanıcı olsa da) | 3-4 whitelist'li hesaba genişlemeyi şema değişikliği gerektirmeden desteklemek | DATA_MODEL.md §1 madde 5, ARCHITECTURE.md §6 |
| Persona kaynakları yalnızca `service_role` ile yazılabiliyor | Kaynak zehirlemesi ve prompt injection riskini yapısal olarak sınırlamak | PERSONA_AND_RAG_POLICY.md §6 |
| Hikâye kalite kontrolü ayrı bir Edge Function çağrısı (aynı çağrıda değil) | Aynı modelin aynı turda kendi hatasını gözden kaçırma riskini azaltmak | ADAPTIVE_STORIES.md §9 |
| SQL agregasyonu + AI yorumu ayrımı (haftalık/aylık rapor) | AI'nın sayı hesaplama halüsinasyonunu rapor doğruluğundan ayırmak | ANALYTICS_AND_ADAPTATION.md §6 |

## 2. Açık sorular — kalibrasyon gerektiren sabitler

Bunlar "yanlış" değil, **gerçek kullanım verisiyle ayarlanması gereken**
sabitlerdir. İlk sürümde makul varsayılan değerlerle başlanır, roadmap
Aşama 6-8 sonrası gözden geçirilir.

- [ ] `decideFinalRating` karar tablosu eşikleri (LEARNING_ENGINE.md §3) —
      özellikle "response_time_ms normal aralığı" tanımı.
- [ ] Bir yapının "gerçekten öğrenilmiş" sayılması için gereken farklı
      bağlam sayısı N (LEARNING_ENGINE.md §6) — başlangıç önerisi: 3.
- [ ] Seri için minimum "anlamlı çalışma" eşiği (dakika/cümle sayısı)
      (ANALYTICS_AND_ADAPTATION.md §3, §10).
- [ ] FSRS `due` günlük tavan sayısı (ANALYTICS_AND_ADAPTATION.md §8).
- [ ] Hikâye i+1 oranı uyarlama formülünün kesin katsayıları
      (ADAPTIVE_STORIES.md §3, ANALYTICS_AND_ADAPTATION.md §9).
- [ ] `content-import-analyze` girdi karakter/token sınırı
      (AI_AND_EDGE_FUNCTION_CONTRACTS.md §10).
- [ ] Sliding-window rate limit eşik değerleri
      (SECURITY_AND_COST_CONTROLS.md §6.2, §9).
- [ ] Sohbet özetleme tetikleme eşiği — kaç mesajdan sonra
      (SECURITY_AND_COST_CONTROLS.md §6.5, §9).
- [ ] Günlük/aylık maliyet kota tutarları (dolar bazında) — kullanıcının
      kişisel bütçesine göre belirlenmeli, bu belgelerde varsayılan bir
      rakam **bilinçli olarak verilmemiştir**.

## 3. Açık sorular — mimari/tasarım kararı gerektiren

- [ ] **Profil oluşturma whitelist kontrolü**: Postgres trigger mı, yoksa
      ayrı bir Edge Function mı (IMPLEMENTATION_ROADMAP.md Aşama 2).
- [ ] **Senkron mekanizması**: genel bir `sync` Edge Function'ı mı, yoksa
      doğrudan Supabase client insert'leri (`ON CONFLICT DO NOTHING`) mi
      (IMPLEMENTATION_ROADMAP.md Aşama 4, OFFLINE_AND_SYNC.md §10).
- [ ] **Cihazlar arası olay sıralama**: `device_seq` + `server_received_at`
      birleşiminin kesin implementasyonu (OFFLINE_AND_SYNC.md §3, §10).
- [ ] **Zod şema paylaşımı mekanizması**: mobil ve Edge Function arasında
      şemaların nasıl paylaşılacağı — npm paketi, dosya kopyası, Deno
      import map (AI_AND_EDGE_FUNCTION_CONTRACTS.md §14, ARCHITECTURE.md
      §2).
- [ ] **`personal_sentences.source_id` polymorphic modelleme**: ayrı
      nullable FK'ler mi (önerilen), yoksa polymorphic tek alan mı
      (DATA_MODEL.md §5 not, §14).
- [ ] **`error_log` ile `review_events` arasındaki olası tekilleştirme**:
      aynı üretim denemesi hem review_event hem error_log'a mı yazılıyor,
      yoksa error_log review_events'ten mi türetiliyor (DATA_MODEL.md §14).
- [ ] **Web arama özelliğinin persona sohbetinde ne zaman açılacağı** ve
      maliyet modeli (PERSONA_AND_RAG_POLICY.md §5, §8).
- [ ] **E2E otomasyon aracı** (Maestro/Detox) kullanılacak mı, yoksa
      manuel cihaz testi yeterli mi (TEST_AND_ACCEPTANCE_PLAN.md §2.3, §7).
- [ ] **npm workspace'e geçiş eşiği**: ikinci bir uygulama (ör. web)
      eklendiğinde mi, yoksa `supabase/` klasörü eklenirken mi
      (ARCHITECTURE.md §2, §10).
- [ ] **Hikâye üretiminin senkron mu arka planda (polling) mi çalışacağı**
      — uzun üretim + kalite kontrolü süresi kullanıcı deneyimini
      etkileyebilir (ARCHITECTURE.md §10).
- [ ] **Realtime ses için WebRTC/WebSocket seçimi** (ARCHITECTURE.md §10,
      AI_AND_EDGE_FUNCTION_CONTRACTS.md §12).
- [ ] **Hesap silme akışının tam cascade sırası** — export önce zorunlu
      mu (SECURITY_AND_COST_CONTROLS.md §9, IMPLEMENTATION_ROADMAP.md
      Aşama 16).

## 4. Bilinçli olarak ertelenmiş / kapsam dışı bırakılmış özellikler

Bunlar unutulmuş değil, **bilinçli olarak** ilk sürüme dahil edilmemiştir
(bkz. PRD.md §9):

- Gerçek zamanlı ses (Aşama 14'e kadar).
- Güncel kişi persona'ları için web araması (açık uçlu, ayrı karar
  bekliyor).
- Google Play Store yayını, çok kullanıcılı public signup, oyunlaştırma.

## 5. Maliyetli veya güvenilirliği düşük özellikler (açıkça işaretli)

- **Gerçek zamanlı sesli sohbet**: hem OpenAI Realtime API maliyeti hem
  de mobil ağ koşullarında güvenilirlik riski taşır; bu yüzden ayrı,
  sıkı günlük kota ile ve en son aşamada açılır (ARCHITECTURE.md §7,
  SECURITY_AND_COST_CONTROLS.md §6.3).
- **Hikâye üretimi + kalite kontrolü**: iki AI çağrısı art arda,
  tek `production-feedback` çağrısından belirgin şekilde pahalıdır;
  günlük üretim sayısı ve "yeniden üret" sınırlıdır
  (ADAPTIVE_STORIES.md §11).
- **AI hata değerlendirmesinin tutarsızlığı**: aynı cevaba gün içinde
  farklı `overall_verdict` verme riski vardır; `decideFinalRating`'in var
  olma nedeni tam olarak bu riski FSRS zamanlamasından izole etmektir,
  ancak öğrenme öğesi kategorizasyonundaki (`error_category`) tutarsızlık
  riski tam olarak ortadan kalkmaz — bu, PRD.md §8'de bilinen bir risk
  olarak listelenmiştir.

## 6. Terminoloji değişiklik günlüğü

Bu belge ayrıca, DATA_MODEL.md §0 sözlüğünde bir terim değiştiğinde bunun
neden değiştiğini kaydetmek için kullanılır. Şu an (ilk sürüm) boş — ilk
terim değişikliğinde buraya eklenir.

## 7. `CLAUDE.md` "depo durumu" bölümü güncel değil (2026-08-03 tespiti)

`CLAUDE.md`, deponun "yalnızca planlama ve dokümantasyon aşamasında" olduğunu
ve `apps/mobile`'ın henüz ürüne özgü kod içermeyen stock bir Expo Router
şablonu olduğunu söylüyor. Bu artık doğru değil:

- Gerçek ürün, kökteki `src/` altında Vite + React ile yazılmış ve
  Capacitor ile Android APK'ya paketlenen ayrı bir uygulamadır
  (`.github/workflows/android-apk.yml`, `capacitor.config.json`). "Üret
  modu" (`UretTab.tsx`), gramer koçu, sohbet, hikâyeler, Supabase bulut
  senkronizasyonu (`supabaseDataSync.ts`) gibi özellikler zaten bu ağaçta
  üretimde çalışır durumda ve birçok PR ile geliştirilmiş.
- `apps/mobile` hâlâ ilk commit'teki (`c1f03aa`) stock Expo Router
  şablonudur ve gerçek uygulamayla hiçbir bağlantısı yoktur — kullanılmayan,
  terk edilmiş bir iskelet gibi görünüyor.

Bu çelişki, `claude/fix-production-mode-progression-sync-7sliby` dalındaki
"Üret modu cümle tekrarı / ilerleme / senkronizasyon" düzeltmeleri sırasında
fark edildi. Düzeltmeler, gerçekten üretimde olan `src/` ağacına yapıldı.
`CLAUDE.md`'nin "depo durumu" bölümünün güncellenmesi veya `apps/mobile`'ın
kapsam dışı bırakılıp bırakılmayacağının netleştirilmesi ayrı bir karar
gerektiriyor; burada sessizce göz ardı edilmedi.

## 8. Oturum listesi yerel; kalıcı cümle geçmişi senkronize

"Bu oturumda gösterilen cümle kimlikleri" (`lingua_session_seen`) yalnızca
cihazda tutulur; aktif kart akışını başka bir cihazın oturumu değiştirmez.
Buna karşılık `lingua_prompt_history` gerçek öğrenme/sunum verisidir ve
Supabase'e senkronize edilir: son gösterim, gösterim sayısı, tamamlanma sayısı
ve son FSRS puanı cihazlar arasında korunur. Tamamlanmış birebir cümle tekrar
"yeni kart" olarak sunulmaz; tekrar zamanı gelen kelime/kalıp AI üretimine
`reviewTargets` olarak verilir ve yeni bağlamda sorulur. Cevaplanmadan geçilen
kartlar da uygulama yeniden açılsa bile 24 saatlik sunum bekleme süresine
tabidir.

## 9. Günlük sayaç artık dile göre ad alanına ayrılıyor (`lingua_daily_history`)

Önceden `lingua_daily_history` tarih başına tek bir sayaç tutuyordu ve
İngilizce/Almanca/Sırpça ilerlemesi birbirine karışıyordu. Anahtarlar artık
`${dil}::${tarih}` biçiminde ad alanına ayrılmıştır (`src/lib/dailyProgress.ts`).
Eski ad alanı almayan tarih anahtarları **silinmedi** (CLAUDE.md kuralı:
mevcut kullanıcı verisi silinmez) ama artık hiçbir UI tarafından okunmuyor —
bu, geçiş sonrası günlük hedef/seri sayaçlarının dile göre sıfırdan
başlayacağı anlamına gelir. Eski karışık veriye dil atfetmenin güvenilir bir
yolu olmadığından bu, veri kaybı riskini "sessizce yanlış dile sayma"
riskine tercih eden bilinçli bir karardır.

## 10. Üret modu artık AI ile sınırsız cümle üretebiliyor; "Otomatik" seviye artık gerçekten otomatik

Kullanıcı geri bildirimi: Üret sekmesindeki `INITIAL_PROMPTS` sabit havuzu
dil başına yalnızca birkaç cümle içeriyordu (ör. İngilizce için 6); havuz
tükenince kullanıcı "hep aynı cümleleri görüyorum" izlenimine kapılıyordu.
Ayrıca "Yoğunluk Seviyesi: Tümü" seçeneği ekranda "Otomatik Seviye Ayarlı"
yazsa da aslında hiçbir filtreleme yapmıyordu — yeni bir kullanıcı ilk
kartında doğrudan İleri/IELTS içeriğiyle karşılaşabiliyordu.

İki değişiklik yapıldı:

- **`/api/generate-production-prompts`** (`supabase/functions/lingua-web-api/index.ts`):
  Gramer Pratiği sekmesindeki `/api/generate-grammar-drills` ile aynı
  desende, mevcut cümlelerle (`avoidSentences`) ve çözülmemiş hatalarla
  (`errorTopics`) birlikte AI'dan `ProductionPrompt` biçiminde yeni cümleler
  ister. `src/lib/generatedPrompts.ts` yanıtı doğrular, eksik alanlı
  adayları sessizce eler ve normalize edilmiş metne göre tekrarları
  temizler — "sınırsız" olması yalnızca tekrarların gerçekten süzülmesiyle
  bir anlam taşır. UretTab'da bu, hem tükenme ekranlarında hem de her an
  kullanılabilen kalıcı bir "AI ile Sınırsız Yeni Cümle Üret" butonuyla
  sunulur.
- **Otomatik seviye artık `src/lib/proficiency.ts`'teki gerçek CEFR
  tahminine bağlı** (İlerleme sekmesindeki "Tahmini CEFR" kartıyla aynı
  hesap, tek kaynaktan). Bu, `selectNextPrompt`'un var olan `intensity` sert
  filtresini **değiştirmez** — onun yerine yeni, isteğe bağlı bir
  `preferredIntensity` yumuşak tercihi eklendi: eşleşen bir cümle
  varsa önce o seçilir, yoksa mevcut uygun havuza sessizce geri döner.
  Böylece yeni bir öğrenci ilk kartında elinden geldiğince başlangıç seviyesi
  bir cümle görür. Tamamlanmış birebir cümleler yeni bağlam gerektiren ayrı
  bir duruma düşer; sert `intensity` filtresinin sözleşmesi değişmez.

## 11. Otomatik kayıt, tekrar deneme ve prototip ilerleme temizliği (2026-08-05)

- React durumundaki her değişiklik önce yerel depoya yazılır ve aynı anda
  `lingua:local-data-changed` olayıyla bulut senkronu tetiklenir. 2 saniyelik
  tarama yalnızca kaçırılmış/eski kod kaynaklı yazılar için güvenlik ağıdır.
- Ağ/5xx/oturum hatası başarısız bir değişikliği "işlenmiş" saymaz; artan
  aralıklı otomatik tekrar yapılır. Ayrıca 30 saniyede bir başka cihazdaki
  değişiklikler çekilir. Elle "Şimdi senkronize et" zorunlu değildir.
- İlk prototipte `item_1`–`item_5` kimlikleriyle gönderilen beş örnek kayıt
  gerçek kullanıcı üretimi olmadığı hâlde CEFR ve kelime sayılarına
  katılıyordu. Yeni hesaplar boş ilerlemeyle başlar; mevcut hesaplarda yalnız
  bilinen id + metin imzası eşleşen bu örnekler temizlenir. Gerçek içe
  aktarımlar korunur.
- Bir cevap değerlendirilip kaydedildikten sonra gönderme düğmesi kilitlenir;
  çift dokunma/yeniden gönderme günlük sayacı ve hakimiyet durumunu ikinci kez
  artıramaz.
