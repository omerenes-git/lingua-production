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
neden değiştiğini kaydetmek için kullanılır. Şu an (ilk sürüm) boş —
ilk terim değişikliğinde buraya eklenir.
