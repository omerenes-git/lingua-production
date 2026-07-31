# İstatistik, Hata Hafızası ve Uyarlanabilir Planlama

Durum: Taslak (ilk sürüm).
İlgili belgeler: [LEARNING_ENGINE.md](./LEARNING_ENGINE.md), [DATA_MODEL.md](./DATA_MODEL.md) §8, §10,
[OFFLINE_AND_SYNC.md](./OFFLINE_AND_SYNC.md) §6-7, [ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md) §3

## 1. İlke

Tüm sayısal istatistikler **append-only olay tablolarından SQL ile
hesaplanır** (bkz. OFFLINE_AND_SYNC.md §6); AI hiçbir sayıyı hesaplamaz,
yalnızca SQL sonucunu yorumlar (bkz. §5 Haftalık Rapor).

## 2. İstatistik ekranı — gösterilecek veriler

- Mevcut çalışma serisi, en uzun seri (bkz. §3 Seri Kuralı)
- Son 7/30/90 günlük çalışma
- Haftalık hedef (bkz. `daily_intensity`, PRD §5)
- Toplam çalışma süresi, dil başına çalışma süresi
- Tamamlanan üretim cümlesi sayısı
- Sohbet sayısı ve süresi
- Hikâye sayısı, okunan toplam kelime, dinleme süresi
- Sesli görev sayısı
- Yardımsız doğru cevap oranı, ilk denemede doğru oranı
- İpucu kullanma oranı (`hint_level` dağılımı)
- Güven düzeyi ile doğruluk ilişkisi (`confidence_level` × doğruluk
  çapraz tablosu — "emin+yanlış" oranı burada özellikle vurgulanır)
- FSRS hatırlama oranı (`review_events` içinde `again` olmayan / toplam)
- Transfer başarısı (bkz. LEARNING_ENGINE.md §6 — farklı bağlamda
  bağımsız üretim başarı oranı)
- İngilizce/Almanca/Sırpça **ayrı** sonuçlar (hiçbir toplam üç dili
  birleştirmez)
- Yazılı ve sözlü üretim **ayrı** sonuçlar (`modality`)
- Aktif ve pasif kelime gelişimi (bkz. LEARNING_ENGINE.md §8) — ayrı
  grafik
- Okuma hızı, anlama başarısı, yeniden anlatma performansı (hikâyelerden)
- En sık yapılan hata konuları, hataların zaman içindeki değişimi

Tüm bu metrikler dil ve modalite kırılımını **varsayılan olarak** gösterir;
"genel toplam" yalnızca ikincil/toplu bir görünüm olarak sunulur, birincil
görünüm değildir (çünkü üç dil çok farklı ilerleme hızında olabilir ve
birleştirme yanıltıcıdır).

## 3. Seri (streak) kuralı

Bir günlük seri **yalnızca uygulamanın açılmasıyla sayılmaz.** Minimum
anlamlı çalışma şartı (ör. en az N üretim cümlesi veya en az M dakika
aktif FSRS/sohbet/hikâye etkileşimi — kesin eşik kalibrasyon gerektirir,
bkz. §7 Açık Noktalar) sağlanmalıdır. Bir gün kaçırmak **cezalandırıcı**
olmamalıdır:

- Haftalık hedef mantığı: seri, "7/7 gün" yerine "haftalık N gün" hedefine
  göre de izlenebilir; bir günün kaçırılması tüm seriyi sıfırlamak yerine
  haftalık hedefin bir parçası olarak değerlendirilir.
- "Hafif gün" mantığı: `daily_intensity = quick` (5 dakika) bile seri için
  yeterli sayılır — seri kalınlığı değil sürekliliği ölçer.

Bu kural, PRD §5'teki "gereksiz oyunlaştırma eklenmeyecek" ilkesiyle
uyumludur: seri burada bir **motivasyon baskısı** değil, bir **süreklilik
göstergesi** olarak tasarlanır.

## 4. Dil bazlı hata kategorileri

### İngilizce
Zamanlar, edatlar, artikel, kelime sırası, phrasal verb, collocation,
doğal olmayan kelime tercihi, tekil-çoğul, soru yapısı, telaffuz/eksik
söylenen kelime.

### Almanca
Artikel, Akkusativ/Dativ/Genitiv, fiilin konumu, yan cümle, sıfat çekimi,
çoğul, ayrılabilen fiiller, fiil-edat yapıları, du/Sie, kelime sırası.

### Sırpça
Hâl kullanımı, edat-hâl ilişkisi, fiil görünüşü, cinsiyet uyumu, fiil
çekimi, kelime sırası, Latin/Kiril tercihi, standart ve bölgesel kullanım
farkları.

Bu kategoriler `error_log.error_category` enum değerleridir (dil bazlı
ayrı enum kümeleri — İngilizce bir hata kategorisi Almanca bir kayıtta
kullanılmaz). AI değerlendirme çıktısı (`production-feedback`,
`chat-turn`) bu sabit kategori listesinden seçim yapar, serbest metin
kategori üretmez (bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md §3).

## 5. Her hata kaydı için gösterilecek bilgi

Kullanıcının cevabı, düzeltilmiş cevap, hata türü, şiddeti, kısa açıklama,
son tekrar tarihi, benzer yeni alıştırmalar (bkz. LEARNING_ENGINE.md §6
bağlam çeşitliliği), zaman içindeki gelişim (aynı `error_category` için
`recurrence_count` trendi).

## 6. Haftalık öğretmen raporu (`weekly-report`)

**SQL agregasyonu (deterministik) + AI yorumu (metin)** ikili yapısı:

1. Edge Function önce SQL ile ham veriyi toplar: hangi kategori
   iyileşti/kötüleşti, hangi öğeler pasif kaldı, hangi hatalar
   kalıcılaşıyor (`recurrence_count` yüksek ve son N tekrarda tekrar eden).
2. AI, bu **sayısal, doğrulanmış** veriyi girdi alarak TR bir anlatı
   üretir: "Nelerde gelişti? Nelerde zorlandı? Hangi yapıları pasif
   biliyor? Hangi hatalar kalıcılaşıyor? Sonraki hafta planı nasıl
   değişmeli?"
3. AI **hiçbir sayıyı kendisi hesaplamaz/değiştirmez**, yalnızca SQL
   sonucunu yorumlar — bu, halüsinasyon riskini rapor doğruluğundan
   ayırır (bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md §13).

## 7. Aylık bağımsız seviye ve transfer testi (`monthly-assessment`)

Hazırlıksız yazılı üretim, sesli anlatım, dinlediğini anlama, yeni
senaryoda konuşma, önceden çalışılan yapıların yeni bağlamda kullanımı.
Bu test **FSRS tekrar akışından bağımsız** bir değerlendirmedir — amacı
"gerçekten ne kadarını bağımsız kullanabiliyor" sorusuna kanıt tabanlı
cevap vermektir. Sonuç, CEFR seviye tahminini günceller ve hikâye
üretimindeki `cefr_level_estimate` girdisini besler (bkz.
ADAPTIVE_STORIES.md §2).

## 8. Günlük görev dengesi (uyarlama kuralları)

Günlük görevler şu havuzlar arasında dengelenir: FSRS tekrarları, zayıf
konular, transfer testleri, hikâyeler, sohbetler, yeni içerik, güçlü
konuları koruyucu tekrarlar. Dengeleme kuralı (deterministik, AI değil):

- FSRS `due` sayısı gün başına belirlenen bir tavana kadar önceliklidir
  (unutmayı önlemek üzeri en yüksek öncelik).
- Zayıf konular (`error_log` yüksek `recurrence_count`) FSRS tavanı
  doluysa bir sonraki önceliktir.
- Kalan süre (`daily_intensity`e göre) yeni içerik/hikâye/sohbet arasında,
  son 7 günün modalite/tip dağılımına göre **en az kullanılan tipe** ağırlık
  vererek dağıtılır (tekdüzeliği önlemek için).
- Her görevde **"Bu görev neden karşıma çıktı?"** açıklaması gösterilir —
  bu açıklama, yukarıdaki kuralın çıktısından doğrudan türetilen bir
  şablon metindir (AI üretimi değil, deterministik açıklama), böylece
  şeffaflık için ek bir AI çağrısı gerekmez.

## 9. Uyarlama kuralları — hikâye oranları

Bkz. [ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md) §3. Bu belge yalnızca
girdi sinyallerini (anlama başarısı, TR açma sıklığı) tanımlar; kesin
oran değişim formülü implementasyon sırasında kalibre edilir.

## 10. Açık noktalar

- Seri için minimum "anlamlı çalışma" eşiği (dakika/cümle sayısı) kesin
  değeri.
- FSRS `due` günlük tavan sayısı.
- Hikâye oranı uyarlama formülünün kesin katsayıları.
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
