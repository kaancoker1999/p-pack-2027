# Istanbul 2027 — yılbaşı partisi kayıt sitesi

Tanıtım sayfası + kayıt formu + admin için kayıt listesi. Sitede bilet satışı, ödeme ve fiyat **yoktur**:
misafir adını, soyadını, telefonunu ve referans kişisini bırakır; gerisini organizatörler yürütür.

**Teknoloji:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Supabase Postgres

| Sayfa | Ne işe yarar |
|---|---|
| `/` | Tanıtım: geri sayım, "gece neler var" görselleri, mekan ve harita |
| `/register` | Kayıt formu: isim, soyad, telefon, referans kişisi |
| `/admin` | Kayıt listesi (arama, referansa göre filtre, silme, CSV, işlem kaydı) |
| `/kvkk` | Aydınlatma metni |

> Depo ve Vercel projesi eski adla (`p-pack-2027`) duruyor; sitedeki ad "Istanbul 2027".

---

## 1. Yerelde çalıştırma (Supabase hesabı gerekmez)

```bash
npm install
cp .env.example .env.local
```

`.env.local` içine:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
SESSION_SECRET=...   # openssl rand -hex 32
ADMIN_USERS=...      # npm run hash-password -- kaan "sifre"
```

İki ayrı terminalde:

```bash
npm run db:dev
```

```bash
npm run dev
```

`npm run db:dev`, Docker gerektirmeyen gömülü bir Postgres (PGlite) başlatır ve şemayı kurar; veriler `.dev-data/pglite` içinde kalır.
Bu veritabanı aynı anda tek bağlantı kabul eder.

## 2. Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** bağlantı adresi (port 6543). Yoksa site "önizleme" modunda açılır ve kayıt almaz. |
| `SESSION_SECRET` | Admin oturum çerezinin imzası, en az 32 karakter. |
| `ADMIN_USERS` | `kullanici:bcrypt_hash,kullanici2:bcrypt_hash` |
| `NEXT_PUBLIC_SITE_URL` | Sitenin adresi, sonunda `/` olmadan (paylaşım önizlemeleri için). |

## 3. Supabase kurulumu

1. Supabase projesinde **SQL Editor**'e [`supabase/schema.sql`](supabase/schema.sql) dosyasının tamamını yapıştırıp çalıştırın.
   `registrations`, `audit_log` ve `rate_limits` tablolarını oluşturur; tekrar çalıştırmak güvenlidir.
2. **Connect → Transaction pooler** adresini (şifrenizi yerine koyarak) `DATABASE_URL` olarak kullanın.

Tablolarda RLS açık ve policy yok: Supabase'in herkese açık API'sinden erişilemez, uygulama yalnızca sunucudan bağlanır.

## 4. Yayın (Vercel)

`main` dalına yapılan her push otomatik yayınlanır. Kayıtların açılması için Vercel → Project → Settings →
**Environment Variables** bölümüne 2. bölümdeki dört değişkeni girip yeniden deploy edin.
`ADMIN_USERS` değerini Vercel'e **`\` olmadan** yapıştırın.

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
- **Spam koruması:** Honeypot alanı ve IP başına 10 dakikada 30 deneme sınırı (Postgres tabanlı).
- **Admin:** Oturum httpOnly çerezdir; `/admin` ve `/api/admin/*` hem middleware'de hem rota içinde korunur. Silme ve CSV indirme işlemleri kayda geçer.

## 8. Test

```bash
npm run db:dev -- --memory
```

```bash
npm run build && npm start -- -p 3100
```

```bash
npm run e2e
```

`npm run e2e` kayıt, doğrulama, mükerrer telefon, admin girişi, liste, CSV, silme ve hız sınırını baştan sona doğrular.
Test, `.env.local` içindeki `E2E_ADMIN_PASSWORD` değerini (hash'ini `ADMIN_USERS` olarak girdiğiniz şifre) kullanır.

## 9. Bilinmesi gerekenler

- Admin paneli yalnızca Türkçedir; ziyaretçinin gördüğü her şey TR + EN'dir.
- KVKK metni genel bir taslaktır; veri sorumlusu bilgilerini ekleyip bir hukukçuya göstermeniz önerilir.
- Bilet satışlı ilk sürüm (ödeme bildirimi, QR bilet, kapıda okutma) git geçmişinde duruyor: `git log --oneline` ile bulunabilir.
