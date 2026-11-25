# Istanbul 2027 — yılbaşı partisi kayıt sitesi

Tanıtım sayfası + kayıt formu + admin için kayıt listesi. Sitede bilet satışı, ödeme ve fiyat **yoktur**:
misafir adını, soyadını, telefonunu ve referans kişisini bırakır; gerisini organizatörler yürütür.

**Teknoloji:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Netlify (yayın + Netlify Blobs depolama)

**Canlı:** https://istanbul-2027.netlify.app

| Sayfa | Ne işe yarar |
|---|---|
| `/` | Tanıtım: geri sayım, "gece neler var" görselleri, mekan ve harita |
| `/register` | Kayıt formu: isim, soyad, telefon, referans kişisi |
| `/admin` | Kayıtlar (en yeni üstte), isme göre sıralı parti listesi, ödeme durumu (ödenmedi / nakit / IBAN), arama, filtre, silme, CSV, işlem kaydı |
| `/kvkk` | Aydınlatma metni |

> GitHub deposu eski adla (`p-pack-2027`) duruyor. Eski Vercel adresi (`p-pack-2027.vercel.app`) yeni adrese yönlenir.

---

## 1. Yerelde çalıştırma

```bash
npm install
cp .env.example .env.local
```

`.env.local` içine:

```bash
LOCAL_STORE=1
SESSION_SECRET=...   # openssl rand -hex 32
ADMIN_USERS=...      # npm run hash-password -- kaan "sifre"
```

```bash
npm run dev
```

`LOCAL_STORE=1` iken kayıtlar `.dev-data/store` klasöründe JSON dosyaları olarak tutulur; veritabanı kurmak gerekmez.

## 2. Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `SESSION_SECRET` | Admin oturum çerezinin imzası, en az 32 karakter. |
| `ADMIN_USERS` | `kullanici:bcrypt_hash,kullanici2:bcrypt_hash` |
| `NEXT_PUBLIC_SITE_URL` | Sitenin adresi, sonunda `/` olmadan (paylaşım önizlemeleri için). |
| `LOCAL_STORE` | Yalnızca kendi bilgisayarınızda `1`. **Netlify'da tanımlamayın.** |

Netlify'daki değerleri görmek / değiştirmek için: `netlify env:list`, `netlify env:set AD "değer"`.

## 3. Depolama (Netlify Blobs)

Kayıtlar Netlify'ın kendi deposunda, `party` adlı Blobs deposunda durur; ayrı bir veritabanı ya da şifre yoktur.

| Anahtar | İçerik |
|---|---|
| `reg/<telefon rakamları>` | Bir kayıt (isim, soyad, telefon, referans, ödeme durumu). Anahtar telefon olduğu için aynı numara iki kez kaydolamaz. |
| `log/<zaman>-<rastgele>` | İşlem kaydı (kim, ne zaman, ne yaptı) |
| `rl/<alan>/<pencere>/<ip özeti>` | Deneme sınırı sayaçları |

Depoya bakmak için: `netlify blobs:list party`. Yedek almak için admin panelinden CSV indirin.

## 4. Yayın (Netlify)

Site Netlify'da `istanbul-2027` projesi olarak yayınlanır. Yayın elle yapılır (GitHub'a push tek başına yayınlamaz):

```bash
mv .env.local .env.local.keep && netlify deploy --build --prod; mv .env.local.keep .env.local
```

`.env.local` derleme sırasında kenara alınır ki yerel ayarlar (`LOCAL_STORE=1`) canlı pakete karışmasın.
Yeni açılan Netlify sitelerinde ziyaretçi giriş koruması açık gelir; bu sitede kapatılmıştır.

## 5. İçerik değiştirme

Etkinlikle ilgili her şey tek dosyada: [`config/event.ts`](config/event.ts)

- **Referans kişileri:** `inviters` listesi. Formdaki seçenekler buradan gelir; listede olmayan bir isim sunucuda da reddedilir.
- **Mekan:** `venue.address`, `venue.mapsUrl`, `venue.mapsEmbedUrl`.
- **Tarih / saat:** `startsAt`, `countdownTo`.
- **Hedef kişi sayısı:** `capacity` (yalnızca admin panelinde gösterilir, kaydı sınırlamaz).
- **Metinler:** [`i18n/tr.ts`](i18n/tr.ts) ve [`i18n/en.ts`](i18n/en.ts).

**Hero videosu:** `public/video/` içine `hero.webm` ve `hero.mp4` koyup `public/poster.jpg` dosyasını değiştirin, sonra yeniden deploy edin.
Dosyalar yokken poster, kar, baloncuk ve havai fişek efektleri görünür.

## 6. Admin ekleme / şifre değiştirme

```bash
npm run hash-password -- ali "guclu-bir-sifre"
```

Çıkan `ali:$2b$12$...` değerini `ADMIN_USERS` içine virgülle ekleyin ve yeniden deploy edin.
`.env` dosyalarında hash içindeki her `$` işaretinin önüne `\` gerekir (betik hazır halini de yazdırır).

## 7. Nasıl çalışır

- **Kayıt:** Form sunucuda zod ile doğrulanır. Telefon tek biçime çevrilir (`+905321234567`); yurt dışı numaraları ülke koduyla yazılır.
- **Mükerrer kayıt:** Telefon numarası benzersizdir. Aynı numara ikinci kez kaydolursa yeni satır açılmaz, kişiye "zaten kayıtlısın" denir.
- **Spam koruması:** Honeypot alanı ve IP başına 10 dakikada 30 deneme sınırı (depo tabanlı).
- **Ödeme durumu:** Her kayıt "Ödenmedi" olarak açılır; adminler panelden Nakit ya da IBAN olarak işaretler. Ödeme siteden alınmaz, bu yalnızca takip içindir.
- **Admin:** Oturum httpOnly çerezdir; `/admin` ve `/api/admin/*` hem middleware'de hem rota içinde korunur. Silme, ödeme durumu değişikliği ve CSV indirme işlemleri kayda geçer.

## 8. Test

```bash
rm -rf .dev-data && npm run build && npm start -- -p 3100
```

```bash
npm run e2e
```

`npm run e2e` kayıt, doğrulama, mükerrer telefon, admin girişi, liste, ödeme durumu, CSV, silme ve hız sınırını baştan sona doğrular.
Test, `.env.local` içindeki `E2E_ADMIN_PASSWORD` değerini kullanır ve `LOCAL_STORE=1` ile çalışır.

## 9. Bilinmesi gerekenler

- Admin paneli yalnızca Türkçedir; ziyaretçinin gördüğü her şey TR + EN'dir.
- KVKK metni genel bir taslaktır; veri sorumlusu bilgilerini ekleyip bir hukukçuya göstermeniz önerilir.
- Netlify'ın Next.js çalışma ortamında, depoda olmayan bir anahtarı `store.get()` ile okumak yanıt vermeden takılıyor (Kasım 2026'da canlıda ölçüldü). `lib/store.ts` bu yüzden önce `getMetadata()` ile varlık sorgusu yapar; bu satırı sadeleştirmeyin.
- Bilet satışlı ilk sürüm ve Supabase/Vercel kurulumu git geçmişinde duruyor: `git log --oneline` ile bulunabilir.
