# Implementation Roadmap

Durum: Taslak (ilk sürüm). Hiçbir aşama henüz başlamamıştır.
İlgili belgeler: tüm diğer `docs/` dosyaları; her aşama ilgili belgelere
atıf yapar. Genel kabul şablonu: [TEST_AND_ACCEPTANCE_PLAN.md](./TEST_AND_ACCEPTANCE_PLAN.md) §6.

## Nasıl okunmalı

Her aşama **uçtan uca çalışan** bir artımdır — yarım bırakılmış bir
özellik olarak değil, kendi başına test edilip cihazda görülebilen bir
sonuç olarak tamamlanır. Aşamalar sırayla yapılır; bir aşama
tamamlanmadan (kabul kriterleri işaretlenmeden) bir sonrakine geçilmez.
"Geri dönüş noktası" her aşamada, bir önceki aşamanın commit'ine
`git revert` ile dönülebileceğini varsayar (feature branch + PR akışı
önerilir, ama bu belge git iş akışını dikte etmez).

---

## Aşama 1 — Temel mimari ve tasarım sistemi

**Amaç:** Kod tabanını, ürüne özgü geliştirmeye hazır hâle getirmek
(monorepo yapısı, tasarım token'ları, temel layout) — henüz hiçbir
öğrenme özelliği yok.

**Kullanıcıya görünen sonuç:** Uygulama hâlâ boş/iskelet ama artık
"Lingua Coach" kimliğiyle açılıyor, ana navigasyon iskeleti (Bugün, Üret,
Sohbet, Hikâyeler, Nasıl Söylerim?, İlerleme) sekmeleri görünüyor
(içerikleri "yakında" placeholder'ı).

**Değiştirilecek modüller:** `apps/mobile/src/app/*` (mevcut Expo starter
ekranları kaldırılır/yeniden düzenlenir), `apps/mobile/src/constants/theme.ts`
genişletilir, `apps/mobile/src/components/app-tabs.tsx` yeni
sekme yapısına uyarlanır.

**Veritabanı değişiklikleri:** Yok.

**Edge Function değişiklikleri:** Yok.

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- 6 ana sekme gerçek Android cihazda görünüyor ve gezilebiliyor.
- Açık/koyu tema çalışıyor.
- Placeholder ekranlarda loading/empty durum bileşenleri kullanılabiliyor
  (bkz. SCREEN_AND_USER_FLOWS.md §14, en azından `empty` durumu).

**Birim testleri:** Tema token yardımcı fonksiyonları (varsa).
**Entegrasyon testleri:** Yok (henüz backend yok).
**Güvenlik kontrolü:** Yeni secret/erişim yok — kontrol listesi N/A.
**Maliyet kontrolü:** N/A (AI çağrısı yok).
**Manuel cihaz testi:** APK yeniden build edilip fiziksel cihazda 6
sekme arası geçiş.
**Geri dönüş noktası:** Bu aşamanın tek commit'i; revert edilirse starter
şablona döner.
**Commit önerisi:** `feat(mobile): add app navigation shell and design tokens`

---

## Aşama 2 — Supabase Auth ve tek kullanıcı erişimi

**Amaç:** Kullanıcının kendi hesabıyla giriş yapabilmesi, whitelist dışı
erişimin engellenmesi.

**Kullanıcıya görünen sonuç:** Uygulama açılışta giriş ekranı gösterir;
whitelist'teki e-posta ile giriş yapılabilir, oturum cihazlar arası
kalıcıdır.

**Değiştirilecek modüller:** `apps/mobile/src/app/` içine auth akışı
(giriş ekranı, oturum durumu provider'ı), Supabase client kurulumu
(`@supabase/supabase-js`).

**Veritabanı değişiklikleri:** `supabase/` klasörü oluşturulur (bkz.
ARCHITECTURE.md §2). İlk migration: `allowed_users`, `profiles` (bkz.
DATA_MODEL.md §2). RLS bu iki tabloda da açılır.

**Edge Function değişiklikleri:** Profil oluşturma kontrolü (whitelist
doğrulaması) — ya bir Postgres trigger (`auth.users` insert sonrası) ya
da basit bir Edge Function; tercih implementasyon sırasında yapılır
(bkz. DECISIONS_AND_OPEN_QUESTIONS.md).

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- Whitelist dışı bir e-posta ile giriş denemesi reddediliyor.
- Whitelist'teki e-posta ile giriş başarılı, `profiles` satırı oluşuyor.
- Public signup kapalı (Supabase Auth ayarı doğrulandı).
- Oturum uygulama yeniden başlatıldığında korunuyor.

**Birim testleri:** Auth state yardımcı fonksiyonları.
**Entegrasyon testleri:** Whitelist dışı kullanıcı reddi, RLS'in
`profiles`/`allowed_users` üzerinde çalıştığı.
**Güvenlik kontrolü:** `get_advisors` (security) çalıştırıldı, RLS
uyarısı yok; public signup gerçekten kapalı olduğu manuel doğrulandı.
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** Gerçek cihazda giriş/çıkış, uygulama yeniden
başlatma sonrası oturum kontrolü.
**Geri dönüş noktası:** Migration + auth kodu tek commit grubu; revert
`supabase/` migration geri alma ile birlikte yapılır.
**Commit önerisi:** `feat: add Supabase auth with invite-only whitelist`

---

## Aşama 3 — Veritabanı, RLS ve TypeScript tipleri

**Amaç:** DATA_MODEL.md'deki tüm çekirdek tabloları oluşturmak (içerik
tabloları hariç, onlar ilgili aşamalarda eklenir) ve tip güvenliğini
sağlamak.

**Kullanıcıya görünen sonuç:** Doğrudan görünür bir değişiklik yok
(altyapı aşaması), ama bir sonraki aşamalardan itibaren her özellik
üzerine bu şemayı inşa eder.

**Değiştirilecek modüller:** `apps/mobile/src/lib/supabase-types.ts`
(üretilen tipler).

**Veritabanı değişiklikleri:** `learning_items`, `learning_item_states`,
`fsrs_cards`, `review_events`, `devices` (bkz. DATA_MODEL.md §2-3).
Diğer içerik tabloları (production, chat, story, persona, vb.) kendi
özellik aşamalarında eklenir — hepsini burada önceden açmak "tek seferde
kodlama" ilkesine aykırı olur (bkz. PRD §"Belge Kalitesi").

**Edge Function değişiklikleri:** Yok (henüz).

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- `mcp__supabase__list_tables` ile tüm tablolar görünüyor, `verbose:true`
  ile kolon/FK'ler doğru.
- `mcp__supabase__generate_typescript_types` ile tipler üretiliyor ve
  mobil tarafta import edilebiliyor.
- Her tabloda RLS açık, en az bir select/insert policy testi geçiyor.

**Birim testleri:** Yok (şema, davranış değil).
**Entegrasyon testleri:** Her yeni tablo için RLS izolasyon testi (bkz.
TEST_AND_ACCEPTANCE_PLAN.md §2.2).
**Güvenlik kontrolü:** `get_advisors` (security) — RLS eksikliği uyarısı
sıfır olmalı.
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** N/A (backend-only), ama Supabase Studio/psql'den
tabloların göründüğü doğrulanır.
**Geri dönüş noktası:** Migration dosyası tek commit; revert migration
geri alma ile.
**Commit önerisi:** `feat(db): add core learning schema with RLS`

---

## Aşama 4 — Yerel SQLite ve senkronizasyon temeli

**Amaç:** Offline-first temel altyapı — outbox deseni, idempotent yazma.

**Kullanıcıya görünen sonuç:** Doğrudan görünür bir özellik yok ama
uygulama artık uçuş modunda açılıp kapanabiliyor, önceki oturum verisi
kayboluyor değil.

**Değiştirilecek modüller:** `apps/mobile/src/lib/local-db.ts` (Expo
SQLite kurulumu), `apps/mobile/src/lib/sync-outbox.ts`.

**Veritabanı değişiklikleri:** Yok (sunucu tarafı Aşama 3'te hazır);
Expo SQLite şeması (cihaz içi) burada tanımlanır.

**Edge Function değişiklikleri:** Genel bir `sync` Edge Function'ı ya da
doğrudan Supabase client insert'leri (`ON CONFLICT DO NOTHING` ile) —
karar implementasyon sırasında netleştirilir (bkz.
DECISIONS_AND_OPEN_QUESTIONS.md).

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- Uçak modunda bir test yazma işlemi (dummy tablo/alan üzerinden) yerel
  SQLite'a düşüyor, outbox'a ekleniyor.
- Bağlantı geldiğinde outbox otomatik boşalıyor.
- Aynı outbox kaydı iki kez gönderilirse sunucuda çift satır oluşmuyor
  (idempotency testi).

**Birim testleri:** Outbox sıra/idempotency mantığı (bkz.
OFFLINE_AND_SYNC.md §4-5).
**Entegrasyon testleri:** İki simüle "cihaz" oturumunun aynı
`client_generated_id` ile insert denemesi.
**Güvenlik kontrolü:** N/A yeni tablo yok.
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** Gerçek cihazda uçak modu açıp bir işlem yapma,
modu kapatıp senkron olduğunu gözlemleme.
**Geri dönüş noktası:** Tek commit; revert ile.
**Commit önerisi:** `feat(mobile): add offline outbox and idempotent sync`

---

## Aşama 5 — FSRS öğrenme motoru

**Amaç:** `ts-fsrs` entegrasyonu + `decideFinalRating` deterministik
fonksiyonu (henüz gerçek AI değerlendirmesi olmadan, sabit/test
verisiyle).

**Kullanıcıya görünen sonuç:** Basit bir "kart çalış" test ekranı (ör.
sabit birkaç kelime kartıyla) — Again/Hard/Good/Easy ile tekrar
zamanlaması çalışıyor.

**Değiştirilecek modüller:** `apps/mobile/src/lib/fsrs.ts`,
`apps/mobile/src/lib/decide-final-rating.ts` (paylaşılan, ileride Edge
Function ile de paylaşılacak saf fonksiyon).

**Veritabanı değişiklikleri:** Yok (Aşama 3'te hazır).

**Edge Function değişiklikleri:** Yok (bu aşamada FSRS istemci tarafında
da çalışır; sunucu tarafı fold Aşama 6'da gerçek review_events ile
devreye girer).

**Kullanılacak AI sözleşmeleri:** Yok (bu aşamada henüz AI çağrısı yok,
`decideFinalRating` sabit test girdileriyle doğrulanır).

**Kabul kriterleri:**
- `ts-fsrs` doğru versiyon/parametrelerle entegre, birkaç test kartı
  üzerinde beklenen `due` tarihleri üretiyor.
- `decideFinalRating` karar tablosunun (LEARNING_ENGINE.md §3) her satırı
  test ediliyor.

**Birim testleri:** LEARNING_ENGINE.md §3 karar tablosu tam kapsama,
hakimiyet geçiş kuralları (§7).
**Entegrasyon testleri:** Yok henüz (gerçek review_events akışı Aşama
6'da).
**Güvenlik kontrolü:** N/A.
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** Test ekranında birkaç kartı Again/Hard/Good/Easy
ile çalışıp `due` tarihlerinin mantıklı ilerlediğini gözlemleme.
**Geri dönüş noktası:** Tek commit; revert ile.
**Commit önerisi:** `feat(mobile): integrate ts-fsrs and rating decision logic`

---

## Aşama 6 — Türkçeden hedef dile üretim

**Amaç:** İlk gerçek AI özelliği — Üret modülünün uçtan uca çalışması.

**Kullanıcıya görünen sonuç:** Kullanıcı gerçekten bir TR cümle görüp
İngilizce/Almanca/Sırpça cevap yazabiliyor/söyleyebiliyor, gerçek AI
değerlendirmesi + ipucu merdiveni + güven kaydı + FSRS tekrar planlaması
alıyor.

**Değiştirilecek modüller:** `apps/mobile/src/app/(tabs)/produce.tsx`
(veya ilgili route), ilgili bileşenler (bkz. SCREEN_AND_USER_FLOWS.md §3).

**Veritabanı değişiklikleri:** `production_prompts`,
`production_attempts`, `production_attempt_hints` (bkz. DATA_MODEL.md
§4). RLS açılır.

**Edge Function değişiklikleri:** `production-feedback` (ilk gerçek Edge
Function) — `_shared/usage-guard.ts`, `_shared/ai-response-cache.ts`,
`_shared/zod-schemas/production-feedback.ts` da bu aşamada kurulur
(ortak altyapı olarak).

**Kullanılacak AI sözleşmeleri:** [AI_AND_EDGE_FUNCTION_CONTRACTS.md](./AI_AND_EDGE_FUNCTION_CONTRACTS.md) §3.

**Kabul kriterleri:**
- Gerçek cihazda bir TR cümleye EN/DE/SR yazılı cevap verilip
  değerlendirme alınabiliyor.
- Birden fazla doğru çeviri kabul ediliyor (manuel örnekleme, bkz.
  TEST_AND_ACCEPTANCE_PLAN.md §2.4).
- İpucu merdiveni 1→6 sırayla açılıyor, her talep kaydediliyor.
- Güven seviyesi cevap gönderilmeden önce isteniyor.
- Nihai rating `decideFinalRating`'ten geliyor, AI önerisinden değil.
- `fsrs_cards`/`learning_item_states` gerçek `review_events`'ten
  güncelleniyor.

**Birim testleri:** Aşama 5 testleri + yeni Zod şema testleri.
**Entegrasyon testleri:** `production-feedback` mock OpenAI ile şema
uyumu, usage-guard kota reddi, cache hit senaryosu.
**Güvenlik kontrolü:** Yeni tablolarda RLS, `get_advisors` temiz,
secret sızıntısı yok (Edge Function loglarında API key aranmadı
doğrulaması).
**Maliyet kontrolü:** `ai_usage_events` doğru loglanıyor,
`ai_usage_quotas` kontrolü çalışıyor.
**Manuel cihaz testi:** En az 10 farklı TR cümle ile gerçek OpenAI
çağrısı, ipucu merdiveni, güven kaydı, ses girişiyle bir deneme.
**Geri dönüş noktası:** Feature tamamlandığında commit; revert ile Üret
sekmesi placeholder'a döner.
**Commit önerisi:** `feat: add Turkish-to-target production practice with FSRS`

---

## Aşama 7 — "Bunu nasıl söylerim?"

**Amaç:** İkinci modülün uçtan uca çalışması.

**Kullanıcıya görünen sonuç:** Serbest TR cümle girip 5 register çıktı,
kişisel cümle listesine/SRS'e ekleme.

**Değiştirilecek modüller:** `apps/mobile/src/app/(tabs)/how-to-say.tsx`.

**Veritabanı değişiklikleri:** `how_do_i_say_queries`,
`how_do_i_say_results`, `personal_sentences` (bkz. DATA_MODEL.md §5).

**Edge Function değişiklikleri:** `how-do-i-say` (bkz.
AI_AND_EDGE_FUNCTION_CONTRACTS.md §4), lazy TTS alt-uç.

**Kullanılacak AI sözleşmeleri:** §4.

**Kabul kriterleri:**
- 5 register de tutarlı ve birbirinden farklı üretiliyor.
- Kaydetme akışı `personal_sentences`'a doğru `sentence_tag` ile
  yazıyor.
- TTS yalnızca istenince üretiliyor (otomatik değil).

**Birim testleri:** Register seçim/kaydetme mantığı (varsa istemci
tarafı dönüşüm).
**Entegrasyon testleri:** Şema uyumu, cache hit (aynı sorgu iki kez).
**Güvenlik kontrolü:** RLS, get_advisors.
**Maliyet kontrolü:** Kota + cache doğrulaması.
**Manuel cihaz testi:** Klinik ve gündelik örnek cümlelerle gerçek
kullanım.
**Geri dönüş noktası:** Commit; revert ile.
**Commit önerisi:** `feat: add "how do I say this" multi-register generator`

---

## Aşama 8 — İstatistik ve hata hafızası

**Amaç:** İlerleme ekranı + Hatalarım ekranı gerçek verilerle.

**Kullanıcıya görünen sonuç:** Aşama 6-7'de üretilen gerçek veriden
istatistik ve hata listesi görülebiliyor.

**Değiştirilecek modüller:** `apps/mobile/src/app/(tabs)/progress.tsx`,
ilgili grafik bileşenleri.

**Veritabanı değişiklikleri:** `error_log` (bkz. DATA_MODEL.md §8).
İstatistik sorguları için gerekiyorsa Postgres view'ları (`sql` migration
içinde) — ham veri tablosu değil, salt-okunur view.

**Edge Function değişiklikleri:** Yok (istatistikler doğrudan Supabase
client sorgularıyla, RLS korumalı — Edge Function'a ihtiyaç yok çünkü AI
çağrısı yok).

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- ANALYTICS_AND_ADAPTATION.md §2'deki metriklerin en az çekirdek kümesi
  (seri, ipucu oranı, güven-doğruluk ilişkisi, dil bazlı ayrım) doğru
  hesaplanıyor.
- Seri kuralı (§3) — minimum anlamlı çalışma şartı uygulanıyor.
- Hiçbir istatistik çift sayılmıyor (Aşama 4'teki idempotent senkrondan
  faydalanılıyor).

**Birim testleri:** Seri hesaplama, dil bazlı gruplama fonksiyonları.
**Entegrasyon testleri:** SQL view'ların RLS altında doğru kullanıcıya
sınırlı sonuç döndürdüğü.
**Güvenlik kontrolü:** View'ların da RLS'e tabi olduğu (security definer
view riski kontrol edilir).
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** Birkaç gün gerçek kullanım sonrası istatistiklerin
mantıklı göründüğü gözlemi.
**Geri dönüş noktası:** Commit; revert ile.
**Commit önerisi:** `feat: add progress stats and error memory screens`

---

## Aşama 9 — Yazılı sohbet

**Amaç:** Sohbet modülü (persona'sız, tek "nötr" karakterle başlanabilir
veya Aşama 10 ile birleştirilebilir — burada iskelet: oturum, mesajlaşma,
düzeltme modları, yardım fonksiyonları).

**Kullanıcıya görünen sonuç:** Kullanıcı yazılı olarak hedef dilde
sohbet edebiliyor, düzeltme modları ve mesaj içi yardımlar çalışıyor.

**Değiştirilecek modüller:** `apps/mobile/src/app/(tabs)/chat.tsx`.

**Veritabanı değişiklikleri:** `chat_sessions`, `chat_messages`,
`chat_message_helpers`, `chat_extracted_candidates` (bkz. DATA_MODEL.md
§6, persona kısımları hariç — Aşama 10'da genişler).

**Edge Function değişiklikleri:** `chat-turn` (persona'sız/basit sistem
promptu ile), `chat-session-summary`.

**Kullanılacak AI sözleşmeleri:** §5-6 (persona enjeksiyonu olmadan
basitleştirilmiş).

**Kabul kriterleri:**
- 3 düzeltme modu (fluent_chat, teacher_mode, strict_production) doğru
  davranıyor.
- Mesaj içi 10 yardım fonksiyonu çalışıyor.
- Kelime/kalıba dokunma popover'ı çalışıyor.
- Sohbet sonu özeti + aday onay/red akışı çalışıyor.
- Uzun sohbette özetleme tetikleniyor (bkz.
  SECURITY_AND_COST_CONTROLS.md §6.5).

**Birim testleri:** Yardım fonksiyonu seçim mantığı, özetleme tetikleme
eşiği.
**Entegrasyon testleri:** `chat-turn`/`chat-session-summary` şema uyumu,
bağlam boyutu sınırlaması testi (tam geçmiş yerine özet+son N mesaj
gönderildiği).
**Güvenlik kontrolü:** Kullanıcı mesajı/sistem talimatı ayrımı (prompt
injection manuel testi, bkz. TEST_AND_ACCEPTANCE_PLAN.md §2.4).
**Maliyet kontrolü:** Kota, cache, özetleme maliyet azaltımı doğrulaması.
**Manuel cihaz testi:** 20+ mesajlık gerçek bir sohbet, tüm yardım
fonksiyonlarının denenmesi.
**Geri dönüş noktası:** Commit; revert ile.
**Commit önerisi:** `feat: add written chat with correction modes and inline help`

---

## Aşama 10 — Persona sistemi

**Amaç:** Aşama 9'daki sohbete gerçek persona kimliği, tutarlılık ve
(tarihsel/güncel figürler için) RAG eklemek.

**Kullanıcıya görünen sonuç:** Persona seçim ekranı, tutarlı karakterli
sohbet, tartışma modları, tarihsel/güncel figürlerde disclosure etiketi.

**Değiştirilecek modüller:** Persona seçim ekranı, `chat.tsx` genişletme.

**Veritabanı değişiklikleri:** `personas`, `persona_sources`,
`persona_source_chunks` (pgvector extension açılır — bkz. DATA_MODEL.md
§6).

**Edge Function değişiklikleri:** `chat-turn` güncellenir (persona
enjeksiyonu + tartışma modu), `_shared/persona-retrieval.ts` eklenir.

**Kullanılacak AI sözleşmeleri:** §5, §7; [PERSONA_AND_RAG_POLICY.md](./PERSONA_AND_RAG_POLICY.md) tamamı.

**Kabul kriterleri:**
- En az 3 genel karakter + 1 tarihsel figür (seed veri + kaynak) + 4
  tartışma modu çalışıyor.
- Tarihsel figürde disclosure_label her zaman görünür.
- RAG araması alakalı kaynak parçası döndürüyor, `source_grounded`
  alanı doğru işaretleniyor.
- Persona, zayıf bir argüman karşısında otomatik katılmıyor (manuel
  test, bkz. §3 rubriği).
- Prompt injection denemesi persona kurallarını geçersiz kılamıyor.

**Birim testleri:** Yok (bu aşamanın mantığı büyük ölçüde prompt +
retrieval, saf fonksiyon azınlıkta).
**Entegrasyon testleri:** pgvector arama sonucu doğruluğu (bilinen bir
sorgu için beklenen kaynağın dönmesi), persona RLS/erişim (system
content, `service_role` yazma kısıtı).
**Güvenlik kontrolü:** `persona_source_chunks` yalnızca service_role
yazabiliyor mu; prompt injection manuel testi (zorunlu, bkz.
PERSONA_AND_RAG_POLICY.md §6).
**Maliyet kontrolü:** RAG aramasının ek maliyeti (embedding çağrısı)
loglanıyor mu.
**Manuel cihaz testi:** Her persona kategorisinden en az bir tam sohbet.
**Geri dönüş noktası:** Commit; revert ile chat persona'sız hâle döner.
**Commit önerisi:** `feat: add persona system with RAG for historical figures`

---

## Aşama 11 — Adaptif hikâyeler

**Amaç:** Hikâye modülünün uçtan uca çalışması (üretim + kalite kontrolü
+ okuma arayüzü + sonrası görevler).

**Kullanıcıya görünen sonuç:** Kullanıcının kendi öğrenme verisine göre
üretilmiş, kalite kontrolünden geçmiş bir hikâyeyi okuyup/dinleyip sonu
görevleri yapabilmesi.

**Değiştirilecek modüller:** `apps/mobile/src/app/(tabs)/stories.tsx` ve
alt rotalar (okuma ekranı, görev ekranları).

**Veritabanı değişiklikleri:** `stories`, `story_segments`,
`story_targets`, `story_exercises`, `story_exercise_attempts` (bkz.
DATA_MODEL.md §7, ADAPTIVE_STORIES.md).

**Edge Function değişiklikleri:** `story-generate`, `story-quality-check`.

**Kullanılacak AI sözleşmeleri:** AI_AND_EDGE_FUNCTION_CONTRACTS.md §8-9;
ADAPTIVE_STORIES.md tamamı.

**Kabul kriterleri:**
- Üretilen hikâye §2'deki içerik seçim girdilerini gerçekten yansıtıyor
  (kullanılan hedef öğeler `used_learning_items` ile doğrulanabiliyor).
- i+1 oranı (~%85-92 bilinen) manuel örneklemede makul.
- Kalite kontrolü gerçekten çalışıyor: bilinçli olarak bozuk bir girdiyle
  (test amaçlı) `needs_regeneration`/`needs_minor_fix` tetiklenebiliyor.
- 2 başarısız denemeden sonra kullanıcıya net hata gösteriliyor,
  sessizce düşük kalite geçirilmiyor.
- En az 3 hikâye sonrası görev tipi çalışıyor.
- Devam eden seri (2 bölümlü test serisi) çalışıyor.

**Birim testleri:** İçerik seçim önceliklendirme mantığı (§2 girdi
skorlama, deterministik kısım).
**Entegrasyon testleri:** `story-generate`→`story-quality-check` akışı
(mock), retry sınırı (maks. 2).
**Güvenlik kontrolü:** RLS, get_advisors.
**Maliyet kontrolü:** Günlük hikâye üretim kotası + "yeniden üret" sınırı
çalışıyor mu.
**Manuel cihaz testi:** En az 3 farklı tür + 1 kullanıcı metni içe
aktarma ile tam okuma deneyimi.
**Geri dönüş noktası:** Commit; revert ile.
**Commit önerisi:** `feat: add adaptive story generation with QA pass`

---

## Aşama 12 — Metin içe aktarma

**Amaç:** Kullanıcının kendi metnini analiz ettirebilmesi (Aşama 11'in
okuma arayüzünü yeniden kullanarak).

**Kullanıcıya görünen sonuç:** "Metin Ekle" akışı; yapıştırılan/eklenen
metin işaretlenmiş olarak okunabiliyor, alıştırma önerisi alınabiliyor.

**Değiştirilecek modüller:** Hikâyeler sekmesi içine "Metin Ekle" girişi.

**Veritabanı değişiklikleri:** `stories.source_type = user_imported`
ayrımı (Aşama 11 şemasına küçük bir alan eklemesi).

**Edge Function değişiklikleri:** `content-import-analyze`.

**Kullanılacak AI sözleşmeleri:** AI_AND_EDGE_FUNCTION_CONTRACTS.md §10.

**Kabul kriterleri:**
- Uzun bir metin (girdi sınırını aşan) doğru bölünüyor ve kullanıcıya
  bilgi veriliyor.
- Bilinen/öğrenilmekte/yeni işaretleme, kullanıcının gerçek
  `learning_item_states` verisiyle tutarlı.
- Bu tür içerik kalite kontrolünden geçmiyor (beklenen davranış,
  ADAPTIVE_STORIES.md §10).

**Birim testleri:** Metin bölme mantığı.
**Entegrasyon testleri:** Şema uyumu.
**Güvenlik kontrolü:** Kullanıcı içeriğinin persona/sistem kaynaklarına
karışmadığı (bkz. SECURITY_AND_COST_CONTROLS.md §5).
**Maliyet kontrolü:** Girdi sınırı + kota.
**Manuel cihaz testi:** Kullanıcının gerçek bir klinik makalesi/e-postası
ile deneme.
**Geri dönüş noktası:** Commit; revert ile.
**Commit önerisi:** `feat: add personal text import and analysis`

---

## Aşama 13 — Bas-konuş ve transkripsiyon

**Amaç:** Sözlü üretimi mevcut modüllere (Üret, Sohbet) eklemek.

**Kullanıcıya görünen sonuç:** Üret ve Sohbet ekranlarında mikrofon ile
kayıt, düzenlenebilir transkript, transkript üzerinden değerlendirme.

**Değiştirilecek modüller:** Üret ve Sohbet ekranlarına ses kaydı
bileşeni, transkript düzenleme UI'ı.

**Veritabanı değişiklikleri:** `production_attempts.audio_url`,
`chat_messages.audio_url` (Aşama 6/9 şemasına zaten planlanmıştı, burada
gerçek kullanım başlıyor).

**Edge Function değişiklikleri:** `transcribe-audio`.

**Kullanılacak AI sözleşmeleri:** AI_AND_EDGE_FUNCTION_CONTRACTS.md §11.

**Kabul kriterleri:**
- Kayıt → transkript → düzenleme → değerlendirme akışı uçtan uca
  çalışıyor.
- Mikrofon izni reddedilirse yazılı moda düzgün düşülüyor (bkz.
  SCREEN_AND_USER_FLOWS.md §14).
- Ses dosyaları private Storage'da, imzalı URL ile erişiliyor.

**Birim testleri:** Yok (çoğunlukla UI + Storage entegrasyonu).
**Entegrasyon testleri:** Storage erişim izinleri (RLS benzeri bucket
policy), transkripsiyon şema uyumu.
**Güvenlik kontrolü:** Ses dosyası erişiminin gerçekten kullanıcıya özel
olduğu.
**Maliyet kontrolü:** Transkripsiyon ayrı kota grubu (`transcription`)
doğru çalışıyor.
**Manuel cihaz testi:** Gürültülü ortam dahil birkaç gerçek kayıt
denemesi.
**Geri dönüş noktası:** Commit; revert ile.
**Commit önerisi:** `feat: add push-to-talk recording and transcription`

---

## Aşama 14 — Gerçek zamanlı ses

**Amaç:** Persona sohbetine gerçek zamanlı sesli konuşma eklemek.

**Kullanıcıya görünen sonuç:** Kullanıcı bir persona ile canlı, kesintiye
açık (sözünü kesebildiği) sesli sohbet edebiliyor; oturum sonrası
öğretim özeti alıyor.

**Değiştirilecek modüller:** Sohbet ekranına "canlı sesli mod" girişi.

**Veritabanı değişiklikleri:** Yok (Aşama 6/10 şeması zaten
`modality: spoken`'ı destekliyor).

**Edge Function değişiklikleri:** `realtime-session-token` gerçek
kullanıma alınır (bkz. ARCHITECTURE.md §7 — ses akışı bu function'dan
geçmez, yalnızca token üretir).

**Kullanılacak AI sözleşmeleri:** AI_AND_EDGE_FUNCTION_CONTRACTS.md §12.

**Kabul kriterleri:**
- Canlı transkript gerçek zamanlı görünüyor.
- Kullanıcı asistanın sözünü kesebiliyor.
- Günlük canlı ses kotası çalışıyor, aşıldığında net bir mesajla
  engelleniyor.
- Oturum sonrası öğretim özeti (Aşama 9'daki sohbet sonu özetiyle aynı
  mekanizma) üretiliyor.

**Birim testleri:** Yok (büyük ölçüde platform/ağ entegrasyonu).
**Entegrasyon testleri:** Token üretim/süre sınırı mantığı.
**Güvenlik kontrolü:** Token'ın gerçekten kısa ömürlü ve tek kullanımlık
olduğu.
**Maliyet kontrolü:** `realtime_voice` kota grubu, saniye bazlı tavan.
**Manuel cihaz testi:** En az 3 gerçek canlı sesli oturum, farklı ağ
koşullarında (Wi-Fi/mobil veri) test.
**Geri dönüş noktası:** Commit; revert ile canlı sesli mod devre dışı
kalır, bas-konuş modu etkilenmez.
**Commit önerisi:** `feat: add realtime voice chat`

---

## Aşama 15 — Gelişmiş offline ve çoklu cihaz çakışma çözümü

**Amaç:** Aşama 4'teki temel senkronu, gerçek çoklu cihaz kullanımıyla
sertleştirmek (§OFFLINE_AND_SYNC.md §3 senaryosunu gerçek veriyle
doğrulamak).

**Kullanıcıya görünen sonuç:** 3-4 cihazda gerçekten paralel kullanım
sorunsuz; senkron geçmişi/çakışma günlüğü ekranı görülebiliyor.

**Değiştirilecek modüller:** Ayarlar → Cihazlar/Senkron geçmişi ekranı.

**Veritabanı değişiklikleri:** Gerekirse `sync_conflicts` benzeri bir
görünürlük tablosu/view (bkz. DATA_MODEL.md §14 açık nokta).

**Edge Function değişiklikleri:** Senkron mantığında olay sıralama
algoritmasının (bkz. OFFLINE_AND_SYNC.md §3) üretim kalitesinde
sertleştirilmesi.

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- Gerçek 3+ Android cihazda, kasıtlı olarak aynı kartın çevrimdışı iki
  cihazda çalışıldığı bir test senaryosu doğru uzlaştırılıyor.
- Senkron geçmişi ekranı, uzlaştırılan olayı gösterebiliyor.
- İstatistik hiçbir senaryoda çift sayılmıyor (bkz. Aşama 8 testlerinin
  çoklu cihazla tekrarı).

**Birim testleri:** Olay sıralama algoritmasının sertleştirilmiş sürümü.
**Entegrasyon testleri:** 3+ simüle cihazla eşzamanlı yazma testi.
**Güvenlik kontrolü:** N/A (yeni erişim yüzeyi yok).
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** Gerçek 3-4 cihazla bir hafta boyunca paralel
kullanım.
**Geri dönüş noktası:** Commit; revert ile Aşama 4 seviyesine döner.
**Commit önerisi:** `feat: harden multi-device sync conflict resolution`

---

## Aşama 16 — Veri dışa aktarma ve silme

**Amaç:** Veri sahipliği modülünün tamamı.

**Kullanıcıya görünen sonuç:** Veri Yönetimi ekranından JSON/CSV/Anki
dışa aktarma, seçerek/topluca silme, hesap silme çalışıyor.

**Değiştirilecek modüller:** `apps/mobile/src/app/settings/data-management.tsx`.

**Veritabanı değişiklikleri:** `exports` (bkz. DATA_MODEL.md §12).

**Edge Function değişiklikleri:** Export üretim function'ı (dosya
oluşturup Storage'a yazan, imzalı URL döndüren); hesap silme için
cascade/toplu silme fonksiyonu.

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- Her dışa aktarma formatı gerçek veriyle doğru üretiliyor (Anki formatı
  gerçek Anki'ye içe aktarılabiliyor — manuel doğrulama).
- Seçerek silme yalnızca seçilen kaydı siliyor, ilişkili istatistikleri
  bozmuyor.
- Hesap silme onay diyaloğu sonrası **geri alınamaz** şekilde tüm veriyi
  siliyor (test ortamında doğrulanır, gerçek hesapta dikkatli test
  edilir).

**Birim testleri:** Export format dönüştürücüleri (JSON/CSV/Anki).
**Entegrasyon testleri:** Cascade silme sırası, RLS altında yalnızca
kendi verisinin silinebildiği.
**Güvenlik kontrolü:** İmzalı URL'lerin süresi doluyor mu, private
bucket erişimi doğru mu.
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** Gerçek bir export indirme + Anki'ye içe aktarma
denemesi.
**Geri dönüş noktası:** Commit; revert ile.
**Commit önerisi:** `feat: add data export and account deletion`

---

## Aşama 17 — Güvenlik, maliyet ve performans denetimi

**Amaç:** Önceki 16 aşamada biriken teknik borcu kapatmak, kapsamlı bir
denetim yapmak.

**Kullanıcıya görünen sonuç:** Doğrudan görünür değişiklik yok (sertleşme
aşaması), ama uygulama artık günlük kişisel kullanım için "production"
kalitesinde.

**Değiştirilecek modüller:** Denetimde bulunan sorunlara göre değişir.

**Veritabanı değişiklikleri:** `get_advisors` (security + performance)
bulgularına göre düzeltme migration'ları.

**Edge Function değişiklikleri:** Kota/cache/prompt versiyonlama
tutarlılık denetimi; her function'ın §1 (AI_AND_EDGE_FUNCTION_CONTRACTS.md)
ortak kurallarına uyduğu tek tek doğrulanır.

**Kullanılacak AI sözleşmeleri:** Tümü (denetim amaçlı).

**Kabul kriterleri:**
- `get_advisors` (security) sıfır kritik/yüksek uyarı.
- `get_advisors` (performance) gözden geçirilmiş, gerekçesiz büyük
  uyarı yok.
- Tüm Edge Function'larda usage-guard + logging + Zod doğrulama var
  (checklist, bkz. TEST_AND_ACCEPTANCE_PLAN.md §4-5).
- Aylık tahmini maliyet, kullanıcının belirlediği bütçe içinde (bkz.
  PRD §7 Kısıtlar).

**Birim testleri:** Eksik kalan test boşluklarının kapatılması.
**Entegrasyon testleri:** Aynı.
**Güvenlik kontrolü:** Tam denetim (bu aşamanın kendisi).
**Maliyet kontrolü:** Tam denetim (bu aşamanın kendisi).
**Manuel cihaz testi:** Uçtan uca tam bir kullanıcı günü simülasyonu (tüm
modüller).
**Geri dönüş noktası:** Denetim düzeltmeleri küçük, ayrı commit'ler
hâlinde; her biri tek başına revert edilebilir.
**Commit önerisi:** `chore: security and cost audit fixes` (birden fazla
commit olabilir).

---

## Aşama 18 — Kişisel production APK

**Amaç:** 3-4 cihaza kalıcı olarak kurulacak son APK'yı üretmek.

**Kullanıcıya görünen sonuç:** İmzalı, `eas.json` `production` profiliyle
üretilmiş APK; internal dağıtım, Play Store'a gönderilmez.

**Değiştirilecek modüller:** `apps/mobile/eas.json` (gerekirse `production`
profilinde `distribution: internal` netleştirilir — mevcut haliyle
`autoIncrement: true` zaten var), sürüm numarası politikası.

**Veritabanı değişiklikleri:** Yok (üretim ortamı zaten kullanılıyor
olmalı — ayrı bir "prod" Supabase projesi bu ölçekte gerekli değildir,
bkz. ARCHITECTURE.md §6).

**Edge Function değişiklikleri:** Yok.

**Kullanılacak AI sözleşmeleri:** Yok.

**Kabul kriterleri:**
- EAS build ile production APK başarıyla üretiliyor.
- APK, 3-4 hedef Android cihaza kuruluyor ve açılıyor.
- Tüm modüller gerçek cihazlarda son bir kez uçtan uca test ediliyor.

**Birim testleri:** N/A (build aşaması).
**Entegrasyon testleri:** N/A.
**Güvenlik kontrolü:** APK'da secret olmadığı son kez doğrulanır (bkz.
SECURITY_AND_COST_CONTROLS.md §1 — build çıktısı içinde string arama).
**Maliyet kontrolü:** N/A.
**Manuel cihaz testi:** Tüm 3-4 cihazda kurulum + tam kullanım testi.
**Geri dönüş noktası:** Önceki internal/development build'e dönülebilir.
**Commit önerisi:** `build: cut personal production release`

## Genel notlar

- Her aşamadaki "birim/entegrasyon testleri" satırları
  [TEST_AND_ACCEPTANCE_PLAN.md](./TEST_AND_ACCEPTANCE_PLAN.md)'deki genel
  stratejiyle tutarlıdır; bu belge yalnızca o aşamaya özgü ek testleri
  vurgular.
- Bir aşama sırasında yeni bir mimari karar gerekirse, aşamayı
  durdurmadan önce [DECISIONS_AND_OPEN_QUESTIONS.md](./DECISIONS_AND_OPEN_QUESTIONS.md)'ye
  eklenir.
