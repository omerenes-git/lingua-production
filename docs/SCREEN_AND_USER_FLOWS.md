# Ekranlar ve Kullanıcı Akışları

Durum: Taslak (ilk sürüm).
İlgili belgeler: [PRD.md](./PRD.md) §5, [LEARNING_ENGINE.md](./LEARNING_ENGINE.md),
[ADAPTIVE_STORIES.md](./ADAPTIVE_STORIES.md), [ANALYTICS_AND_ADAPTATION.md](./ANALYTICS_AND_ADAPTATION.md)

## 1. Navigasyon

**Ana navigasyon (alt sekme çubuğu):** Bugün, Üret, Sohbet, Hikâyeler,
Nasıl Söylerim?, İlerleme.

**İkincil bölümler (Bugün veya İlerleme'den erişilir, ayrı sekme değil):**
Cümlelerim, Kelimelerim ve Kalıplarım, Hatalarım, Haftalık Rapor, Ayarlar,
Veri Yönetimi.

Ana arayüz dili Türkçedir.

## 2. Bugün

Günün ana giriş noktası. İçerik:

- Günlük süre seçimi (Hızlı 5dk / Standart 20dk / Yoğun 40dk —
  `daily_intensity`).
- Bugünün karma görev listesi (bkz. ANALYTICS_AND_ADAPTATION.md §8 Günlük
  Görev Dengesi): FSRS tekrarları, zayıf konu alıştırmaları, transfer
  testleri, hikâye/sohbet önerisi.
- Her görev kartında **"Bu görev neden karşıma çıktı?"** açıklaması
  (dokununca açılır).
- Mevcut seri, bugünkü ilerleme özeti.

## 3. Üret (Türkçeden hedef dile üretim)

Akış:
1. TR cümle gösterilir (hedef dil seçili — kullanıcı önceden dil
   seçmiştir veya karma modda diller değişir).
2. Kullanıcı yazılı yanıt yazar **veya** mikrofon ile söyler.
3. Gönder → `production-feedback` çağrılır (yükleniyor durumu gösterilir).
4. Sonuç: `overall_verdict` + varsa `self_correction_prompt_tr` —
   kullanıcıya önce **kendi hatasını bulma fırsatı** sunulur (doğrudan
   doğru cevap gösterilmez).
5. Kullanıcı "İpucu al" derse, ipucu merdiveni sırayla açılır (1→6, bkz.
   LEARNING_ENGINE.md §5); her ipucu talebi ayrı gösterilir, önceki
   ipucular ekranda kalır.
6. Cevap güven düzeyi seçimi (Eminim / Biraz eminim / Tahmin ettim /
   Bilmiyordum) — cevap gönderilmeden **önce** sorulur (kullanıcı cevabı
   görmeden güvenini işaretler, aksi halde geri dönük yanlılık oluşur).
7. Düzeltilmiş cevap varsa, kullanıcıya **yeniden ürettirilir** (yazma/
   söyleme alanı tekrar açılır, kopyala-yapıştır değildir).
8. Sonuç ekranı: hata detayları (şiddet, açıklama), kullanılan ipucu
   özeti, nihai FSRS rating (kullanıcıya "bir sonraki tekrar: X gün sonra"
   olarak gösterilir).

## 4. Nasıl Söylerim?

Akış:
1. Serbest TR metin girilir (yazılı veya sesli).
2. Hedef dil seçilir.
3. `how-do-i-say` çağrılır → 5 register (doğal, basit, gündelik, resmî,
   klinik/bağlama özgü) + anahtar kelimeler + kalıplar + kısa TR açıklama +
   örnekler kartlar hâlinde gösterilir.
4. Her register kartında "Dinle" (lazy TTS) ve "Cümlelerime ekle" /
   "Çalışma listesine ekle" (SRS) butonları.
5. Kişisel cümle listesine eklerken etiket seçimi (`sentence_tag`:
   günlük, klinik, seyahat, aile, IELTS, iş, sosyal).

## 5. Sohbet

Akış:
1. Persona seçimi (kategori: genel karakter / tarihsel / güncel kişi
   simülasyonu — ikinci ve üçüncü kategoride `disclosure_label` sürekli
   görünür, bkz. PERSONA_AND_RAG_POLICY.md §2).
2. Hedef dil, tartışma modu, düzeltme modu seçimi.
3. Sohbet ekranı: yazılı mesajlaşma (ilk sürüm) veya bas-konuş kayıt.
4. Her asistan mesajında yardım menüsü: Türkçesini göster, Dinle, Yavaş
   dinle, Daha basit söyle, Kelimeleri açıkla, Neden böyle söylendi?,
   Cevap öner, Cümle başlangıcı ver, Bir kelime ipucu ver, Çalışma
   listesine ekle.
5. Mesaj içindeki tek kelime/kalıba dokununca: bağlama uygun TR anlam,
   basit hedef-dil açıklama, telaffuz, örnek cümle, dilbilgisi bilgisi,
   kaydetme seçeneği (küçük bir popover/bottom-sheet).
6. `strict_production` modunda kritik hata varsa, sohbet gönder butonu
   kilitli kalır, düzeltme istenir (bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md
   §5 `blocked_until_correction`).
7. Sohbet sonu: "Sohbet Sonu Özeti" ekranı — en değerli yeni kalıplar,
   yapılan hatalar, Türkçesi açılan ifadeler, yardım alınan cevap
   kalıpları, öğrenme sistemine eklenmesi önerilen adaylar. Kullanıcı her
   adayı **onaylar veya reddeder** (otomatik kart oluşmaz, bkz.
   AI_AND_EDGE_FUNCTION_CONTRACTS.md §6).

## 6. Hikâyeler

Akış:
1. Hikâye türü / devam eden seri seçimi (veya "bana öner").
2. Üretim + kalite kontrolü sürerken yükleniyor durumu (bkz.
   ADAPTIVE_STORIES.md §9 — 2 deneme başarısızsa hata + tekrar dene).
3. Okuma ekranı: metin üzerinde farklı renk/stil ile new/noticed/
   learning_pattern/known/target_grammar işaretleri.
4. Kelime/kalıba dokununca aynı popover (bkz. §5 madde 5).
5. Ses kontrolleri: normal/yavaş/cümle cümle/metinle birlikte/önce
   yalnızca dinle sonra metni aç/seçili cümleyi tekrar dinle.
6. Hikâye sonu görevler listesi: anlama soruları, doğru-yanlış, boşluk
   doldurma, TR→hedef üretim, yazılı/sesli yeniden anlatma, alternatif
   son yazma, karakterle sohbet, öğrenme adaylarını seçme.
7. Kullanıcı kendi metnini ekleme: ayrı bir "Metin Ekle" girişi (yapıştır
   veya dosyadan), aynı okuma arayüzü ama kalite kontrol rozetsiz (bkz.
   ADAPTIVE_STORIES.md §10).

## 7. İlerleme

Bkz. ANALYTICS_AND_ADAPTATION.md §2 için tam metrik listesi. Ekran
düzeni: dil seçici (EN/DE/SR sekmeleri) + üstte özet kartlar (seri,
haftalık hedef, toplam süre) + aşağıda detaylı grafikler (aktif/pasif
kelime, hata trendi, güven-doğruluk ilişkisi vb.).

## 8. Cümlelerim

Kişisel cümle listesi, etiket filtresi (`sentence_tag`), dil filtresi,
kaynak filtresi (Nasıl Söylerim / Sohbet / Hikâye / Manuel). Her cümle
için SRS durumu (eklendi mi, hangi `mastery_state`'te).

## 9. Kelimelerim ve Kalıplarım

`learning_item_type` bazlı filtreleme, `mastery_state` bazlı gruplama,
arama. Her öğe için: ilk görülme, son üretim, aktif/pasif durumu,
bağlı `error_log` kayıtları (varsa).

## 10. Hatalarım

`error_category` bazlı gruplama (dil seçili), her hata için detay (bkz.
ANALYTICS_AND_ADAPTATION.md §5). "Emin + yanlış" kayıtları ayrı bir
öncelikli bölümde vurgulanır.

## 11. Haftalık Rapor

`weekly-report` çıktısının okunabilir görünümü (bkz.
ANALYTICS_AND_ADAPTATION.md §6). Geçmiş raporlar arşivlenmiş liste olarak
görülebilir.

## 12. Ayarlar

- Tema (açık/koyu/otomatik), büyük yazı.
- Hedef dil listesi ve öncelik sırası.
- TR desteği seviyesi (manuel override — bkz. LEARNING_ENGINE.md §9,
  otomatik kademeli azalmanın bir önceki seviyesine dönme).
- Günlük hedef / `daily_intensity` varsayılanı.
- Mikrofon izinleri ve gizlilik açıklaması.
- Tahmini aylık AI maliyeti görünümü (bkz.
  SECURITY_AND_COST_CONTROLS.md §6.7).
- Cihazlar listesi (`devices`, bkz. OFFLINE_AND_SYNC.md §9).
- Senkron geçmişi/çakışma günlüğü (bkz. OFFLINE_AND_SYNC.md §8).

## 13. Veri Yönetimi

JSON dışa aktarma, CSV dışa aktarma, öğrenilen cümleleri dışa aktarma,
Anki uyumlu aktarım, sohbet geçmişini seçerek silme, hikâyeleri silme,
tüm kişisel verileri silme, hesap silme. Her silme işlemi **onay
diyaloğu** gerektirir (özellikle "hesap silme" — geri alınamaz olduğu
açıkça belirtilir).

## 14. Durum matrisi (her ekranda desteklenmesi gereken durumlar)

| Durum | Davranış |
|---|---|
| Loading | İskelet/spinner, mümkünse iskelet ekran |
| Empty | Boş durum illüstrasyonu/mesajı + ilk eylem çağrısı (ör. "İlk cümleni üret") |
| Error | TR hata mesajı (Edge Function'ın `user_message_tr` alanından, bkz. AI_AND_EDGE_FUNCTION_CONTRACTS.md §1) + tekrar dene |
| Offline | Çevrimdışı rozet, yalnızca offline çalışabilen özellikler (FSRS tekrar, yerel okuma) aktif kalır, AI gerektiren özellikler devre dışı + açıklama |
| Sync pending | Küçük bir gösterge (ör. üst bar ikonu), engelleyici değil |
| API limiti | "Bugünkü/bu ayki [özellik] kotan doldu, X saat/gün sonra sıfırlanır" |
| Mikrofon izni | İzin isteme diyaloğu + reddedilirse yazılı moda düşme |
| Bağlantı kesintisi (istek ortasında) | Otomatik yeniden deneme (outbox, bkz. OFFLINE_AND_SYNC.md §5) + kullanıcıya "gönderilecek" durumu |
| İçerik üretim hatası (ör. hikâye 2 denemede de başarısız) | Net hata mesajı + "tekrar dene" + sessizce düşük kaliteli içerik gösterilmez |

## 15. Erişilebilirlik ve tasarım

Sade, profesyonel, modern, uzun süreli kullanıma uygun. Açık/koyu tema,
büyük yazı seçeneği, erişilebilir dokunma alanları (min. 44x44dp).
**Gereksiz oyunlaştırma, reklam, sosyal sıralama, enerji/can sistemi
eklenmez** (bkz. PRD §5 — bilinçli, geri çekilmez bir tasarım kararı).

## 16. Açık noktalar

- İkincil bölümlere erişim yolu (ayrı sekme mi, "Daha fazla" menüsü mü,
  yoksa İlerleme ekranından mı) — düşük riskli bir UI kararı, ilk
  implementasyon sırasında netleştirilebilir.
- Senkron geçmişi ekranının detay seviyesi.
- Bkz. [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md).
