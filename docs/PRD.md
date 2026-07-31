# PRD — Lingua Production Coach

Durum: Taslak (ilk sürüm). Kod tarafından henüz doğrulanmamıştır.
İlgili belgeler: [ARCHITECTURE.md](./ARCHITECTURE.md), [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md),
[DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md)

## 1. Ürün özeti

Lingua Production Coach, tek bir kullanıcı (fizyoterapist, ana dili Türkçe)
için geliştirilen, yapay zekâ destekli bir **dil üretim** koçudur. Google Play
Store'a yayımlanmaz; 3-4 kişisel Android cihaza özel/internal APK olarak
kurulur. Hedef diller İngilizce, Almanca ve Sırpçadır.

Ürünün temel felsefesi: **pasif kelime tanıma yerine aktif üretim.** Kullanıcı
bir kelimenin anlamına bakabilir, ama bu onu "öğrenilmiş" saymaz — aktif
hâkimiyet yalnızca yazılı veya sözlü üretimle kanıtlanır (bkz.
[LEARNING_ENGINE.md](./LEARNING_ENGINE.md) §Hakimiyet Durumları).

## 2. Hedef kullanıcı ve bağlam

- Tek kullanıcı, meslek: fizyoterapist.
- Öncelikli yaşam alanları: klinik iletişim (hasta ile anamnez, egzersiz
  anlatma, meslektaşla vaka tartışması), gündelik yaşam, seyahat, IELTS
  hazırlığı, sosyal sohbet/tartışma, aile ortamı (özellikle Sırpça için aile
  bağlamı).
- Kullanıcı 3-4 Android cihaz arasında geçiş yapar (ör. telefon + tablet +
  yedek cihaz); aynı hesapla senkron çalışması beklenir.
- Uygulama kişisel kullanım için tasarlanır; çok kullanıcılı ölçeklenme veya
  Play Store uyumluluğu **hedef değildir** (bkz. §9 Kapsam Dışı).

## 3. Ürün hedefleri (ölçülebilir)

1. Kullanıcı, her hedef dilde günlük olarak **kendi cümlelerini üretir**
   (çeviri kopyalamaz) ve bu üretimler dilbilgisi/anlam/doğallık açısından
   değerlendirilir.
2. Öğrenilen her kelime/kalıp, "yalnızca tanınıyor" durumundan "bağımsız
   üretilebiliyor" durumuna geçene kadar izlenir ve bu geçiş ölçülür.
3. FSRS tabanlı tekrar sistemi, tekrarları unutmadan önce zamanlar ve tekrar
   oranını (`recall rate`) izlenebilir kılar.
4. Kullanıcı, sohbet ve hikâye modüllerinde gerçek bağlamda (klinik, seyahat,
   IELTS vb.) üretim pratiği yapabilir.
5. Sistem, kullanıcının **emin olarak yaptığı yanlışları** (yüksek güven +
   yanlış cevap) özel olarak önceliklendirir çünkü bunlar en kalıcı hatalı
   öğrenmelerdir.
6. Uygulama 3-4 cihazda veri kaybı veya çift sayım olmadan çalışır.
7. OpenAI maliyeti günlük/aylık kotalarla kontrol altında tutulur ve
   izlenebilir olur.

## 4. Kapsam — modüller

Aşağıdaki modüllerin her biri ayrı bir belgede detaylandırılır; burada
yalnızca ürün açısından "ne" ve "neden" özetlenir.

### 4.1 Türkçeden hedef dile üretim
Kullanıcıya TR cümle gösterilir, EN/DE/SR yazılı veya sözlü cevap üretir.
Değerlendirme birebir metin eşleşmesi değil, anlam/dilbilgisi/doğallık/
bağlam/üslup temellidir; birden fazla doğru cevap kabul edilir. Kademeli
6 seviyeli ipucu sistemi, güven kaydı (4 seviye), süre kaydı ve hata
şiddeti sınıflandırması vardır. Detay: [LEARNING_ENGINE.md](./LEARNING_ENGINE.md).

### 4.2 "Bunu nasıl söylerim?"
Serbest TR girdiden hedef dilde çoklu register (doğal, basit, gündelik,
resmî, klinik/bağlama özgü) çıktı üretir; kişisel cümle listesine veya
SRS'e eklenebilir. Detay: [AI_AND_EDGE_FUNCTION_CONTRACTS.md](./AI_AND_EDGE_FUNCTION_CONTRACTS.md) §how-do-i-say.

### 4.3 Spaced repetition ve öğrenme motoru
`ts-fsrs` deterministik motor; AI yalnızca kalite sinyali üretir. Yakın
varyasyon ve bağlam transferi zorunludur. Detay: [LEARNING_ENGINE.md](./LEARNING_ENGINE.md).

### 4.4 Kişilik sahibi sohbet
Yazılı sohbet (ilk sürüm), bas-konuş, ileride gerçek zamanlı sesli sohbet.
Karakterin tutarlı görüşleri vardır, otomatik katılmaz. 4 tartışma modu, 3
düzeltme modu. Detay: [PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md).

### 4.5 Persona sistemi
Genel karakterler + tarihsel kişi perspektifleri (RAG destekli, açıkça
etiketlenmiş simülasyon) + güncel kişi perspektifleri (yalnızca kamuya açık
görüş çıkarımı, açık simülasyon etiketi). Detay:
[PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md).

### 4.6 Adaptif hikâyeler
Kullanıcının öğrenme verisine göre üretilen okuma/dinleme içeriği (LingQ
benzeri i+1 yaklaşımı, ~%85-92 bilinen içerik). Detay:
[ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md).

### 4.7 Kelime ve kalıp hâkimiyeti
6 durumlu hâkimiyet modeli, pasif/aktif ayrımı, kademeli TR desteği azaltma.
Detay: [LEARNING_ENGINE.md](./LEARNING_ENGINE.md) §Hakimiyet Durumları.

### 4.8 İstatistik ve uyarlanabilir planlama
Seri, haftalık/aylık istatistik, dil bazlı hata kategorileri, haftalık
öğretmen raporu, aylık bağımsız seviye testi. Detay:
[ANALYTICS_AND_ADAPTATION.md](./ANALYTICS_AND_ADAPTATION.md).

### 4.9 Gerçek yaşam senaryoları
Görev temelli, amaçlı, gerçekçi karakterli senaryolar (klinik, seyahat,
IELTS, resmî kurum, aile ortamı vb.).

### 4.10 Ses ve konuşma
TTS (normal/yavaş/cümle bazlı), bas-konuş kayıt + transkripsiyon, ileride
gerçek zamanlı sesli sohbet. Mimari en baştan gerçek zamanlı sese uygun
tasarlanır, ancak özellik kontrollü aşamalarda açılır (bkz.
[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) Aşama 13-14).

### 4.11 Çoklu cihaz ve çevrimdışı kullanım
3-4 Android cihaz, Expo SQLite + Supabase senkron, çakışma çözümü, çift
sayım önleme. Detay: [OFFLINE_AND_SYNC.md](./OFFLINE_AND_SYNC.md).

### 4.12 Veri sahipliği
JSON/CSV/Anki dışa aktarma, seçerek/topluca silme, hesap silme, yedekleme.

### 4.13 Güvenlik ve altyapı
Bkz. [SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md).

## 5. Kullanıcı deneyimi ilkeleri

- Ana arayüz dili Türkçe.
- Ana navigasyon: Bugün, Üret, Sohbet, Hikâyeler, Nasıl Söylerim?, İlerleme.
- İkincil: Cümlelerim, Kelimelerim ve Kalıplarım, Hatalarım, Haftalık Rapor,
  Ayarlar, Veri Yönetimi.
- Sade, profesyonel, modern, **uzun süreli** kullanım için tasarlanmış arayüz.
- **Gereksiz oyunlaştırma, reklam, sosyal sıralama, enerji/can sistemi
  eklenmeyecek.** Bu bilinçli bir üründeki geri çekilmez bir karardır —
  kullanıcı tek kişi olduğu için sosyal/rekabetçi mekanikler anlamsızdır ve
  odağı üretimden uzaklaştırır.
- Açık/koyu tema, büyük yazı, erişilebilir dokunma alanları desteklenir.
- Durum kapsamı: loading, empty, error, offline, sync pending, API limiti,
  mikrofon izni, bağlantı kesintisi, içerik üretim hatası (bkz.
  [SCREEN_AND_USER_FLOWS.md](./SCREEN_AND_USER_FLOWS.md) §Durum Matrisi).

## 6. Başarı ölçütleri (ürün düzeyinde)

Bunlar KPI değil, **ürünün kendi kendini değerlendirmesi** için tasarlanan iç
sinyallerdir (bkz. [ANALYTICS_AND_ADAPTATION.md](./ANALYTICS_AND_ADAPTATION.md)):

- Bağımsız üretilebilen kelime/kalıp sayısının zaman içindeki artışı.
- İpucu kullanım oranındaki düşüş eğilimi (aynı yapı için).
- "Emin + yanlış" oranındaki düşüş (kalıcı hatalı öğrenmenin azalması).
- Aylık transfer testinde yeni bağlamda doğru kullanım oranı.
- FSRS hatırlama oranının hedef aralıkta (genelde ~%85-90) kalması.

## 7. Kısıtlar

- Tek geliştirici/tek kullanıcı; kurumsal ölçek karmaşıklığı **bilinçli
  olarak eklenmez** (bkz. [ARCHITECTURE.md](./ARCHITECTURE.md) §Ölçek Kararı).
- Bütçe: OpenAI maliyeti kişisel kullanım bütçesiyle sınırlı; bu yüzden
  önbellek, özetleme ve kota zorunludur (bkz.
  [SECURITY_AND_COST_CONTROLS.md](./SECURITY_AND_COST_CONTROLS.md)).
- Google Play Store politika kısıtlamaları **geçerli değildir** (internal
  APK); ancak bu, güvenlik/gizlilik standartlarının gevşetilebileceği
  anlamına gelmez.
- Gerçek zamanlı ses özelliği maliyet ve karmaşıklık açısından risklidir;
  bu yüzden en son aşamalara bırakılmıştır (bkz.
  [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)).

## 8. Riskler (ürün düzeyinde — teknik riskler için ARCHITECTURE.md ve SECURITY_AND_COST_CONTROLS.md'ye bakın)

| Risk | Etki | Azaltma |
|---|---|---|
| AI değerlendirmesi tutarsız/yanlış hata etiketleyebilir | Yanlış öğrenme pekiştirmesi | Yapılandırılmış çıktı + kural tabanlı ikinci kontrol + kullanıcı itiraz/düzeltme mekanizması (bkz. DECISIONS_AND_OPEN_QUESTIONS.md) |
| Tarihsel/güncel kişi persona'ları yanlış izlenim verebilir | Güven/etik risk | Zorunlu simülasyon etiketi, kaynak ayrımı, uydurma alıntı yasağı (bkz. PERSONA_AND_RAG_POLICY.md) |
| Çoklu cihaz senkronu istatistik çift sayımına yol açabilir | Yanlış ilerleme verisi | Event-sourced senkron modeli (bkz. OFFLINE_AND_SYNC.md) |
| Gerçek zamanlı ses maliyeti kontrolsüz büyüyebilir | Bütçe aşımı | Ayrı günlük kota + en son aşamada, kontrollü açılış |
| Hikâye üretimi hedef yapıyı yanlış/doğal olmayan şekilde kullanabilir | Yanlış öğrenme girdisi | Zorunlu ikinci QA geçişi (bkz. ADAPTIVE_STORIES.md §Kalite Kontrolü) |

## 9. Kapsam dışı (bu ürün için bilinçli olarak yapılmayacaklar)

- Google Play Store / App Store yayını.
- Çok kullanıcılı public signup, sosyal özellikler, liderlik tablosu.
- Oyunlaştırma (can/enerji sistemi, rozet yarışı, reklam).
- Gerçek kişilerin sesini klonlama veya onlar adına gerçek alıntı üretme.
- Kurumsal çok kiracılı (multi-tenant) mimari.

## 10. Belgeler arası terminoloji sözleşmesi

Bu PRD'de geçen tüm terimler (`mastery_state`, `confidence_level`,
`error_severity`, ipucu seviyeleri, tartışma/düzeltme modları vb.) tüm diğer
belgelerde birebir aynı isimlerle kullanılır. Sabit sözlük:
[DATA_MODEL.md](./DATA_MODEL.md) §0 Sözlük.
