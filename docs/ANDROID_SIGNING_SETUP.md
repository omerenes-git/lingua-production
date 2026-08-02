# Android kalıcı imza kurulumu

Bu depo Android APK'larını kalıcı bir release anahtarıyla imzalamak üzere yapılandırılmıştır. Aynı `com.omerenes.linguacoach` paket adına sahip yeni APK'ların mevcut kurulumun üzerine güncelleme olarak kurulabilmesi için her build'de aynı keystore kullanılmalıdır.

## Gerekli GitHub Actions secrets

Repository `Settings > Secrets and variables > Actions` bölümünde aşağıdaki dört repository secret bulunmalıdır:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Keystore veya şifreler repoya commit edilmemelidir. Bu dosyaların kaybedilmesi, aynı imzayla gelecekte güncelleme üretilememesine neden olur.

## Build davranışı

`.github/workflows/android-apk.yml` şu işlemleri yapar:

1. Web uygulamasını Android için derler.
2. Capacitor Android projesini geçici olarak oluşturur.
3. Keystore'u GitHub Secrets içinden geri yükler.
4. `versionCode` değerini GitHub Actions run numarasına göre otomatik artırır.
5. Kalıcı anahtarla release APK üretir.
6. APK imzasını doğrular ve SHA-256 dosyasını oluşturur.
7. APK'yı doğrudan indirilebilir GitHub Release dosyası olarak yayımlar.

## İlk geçiş

Önceki APK debug anahtarıyla imzalandığı için ilk kalıcı imzalı APK mevcut debug sürümün üzerine kurulamaz. Mevcut debug uygulaması bir kez kaldırılmalı ve ilk kalıcı imzalı APK temiz kurulmalıdır.

Bundan sonraki kalıcı imzalı APK'lar aynı paket adı, aynı keystore ve daha yüksek `versionCode` kullandığı için uygulama verileri silinmeden güncelleme olarak kurulabilir.
