# Istanbul 2027 — bilet satış sitesi (eski adıyla P-PACK 2027)

Yılbaşı partisi için bilet satışı, Revolut ile ödeme bildirimi, admin onayı, QR/barkodlu bilet ve kapıda okutma.

**Teknoloji:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Supabase (Postgres + Storage) · Resend · `qrcode` · `bwip-js` · `html5-qrcode`

| Sayfa | Ne işe yarar |
|---|---|
| `/` | Tanıtım: video hero, geri sayım, line-up, fiyat dönemleri, mekan |
| `/tickets` | Bilet alma akışı (bilgiler → ödeme → bildirim) |
| `/order/IST27-XXXXX` | Sipariş durumu takibi |
| `/ticket/<id>` | Misafirin bileti (QR + Code128 barkod, PDF) |
| `/admin` | Admin paneli (onay, ret, isim değişikliği, davetli bileti, CSV, işlem kaydı) |
| `/checkin` | Kapıda bilet okutma (ayrı personel şifresi) |

---

## 1. Yerelde çalıştırma (Supabase hesabı gerekmez)

```bash
npm install
cp .env.example .env.local
```

`.env.local` içinde en az şunları doldurun:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
TICKET_SECRET=...        # openssl rand -hex 32
SESSION_SECRET=...       # openssl rand -hex 32
ADMIN_USERS=...          # npm run hash-password -- kaan "sifre"
CHECKIN_PASSWORD_HASH=...# npm run hash-password -- "kapi-sifresi"
LOCAL_DEV_MODE=1
```

İki ayrı terminalde:

```bash
npm run db:dev
```

```bash
npm run dev
```

`npm run db:dev`, Docker gerektirmeyen gömülü bir Postgres (PGlite) başlatır ve şemayı kurar; veriler `.dev-data/pglite` içinde kalır.
`RESEND_API_KEY` ve `SUPABASE_URL` boşken e-postalar `.dev-data/outbox/`, dekontlar `.dev-data/receipts/` klasörüne yazılır.

> Yerel veritabanı aynı anda tek bağlantı kabul eder: `npm run dev` çalışırken ona başka bir araçla bağlanmayın.

## 2. Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sitenin adresi, sonunda `/` olmadan. E-postalardaki linkler bunu kullanır. |
| `DATABASE_URL` | Supabase **Transaction pooler** bağlantı adresi (port 6543). |
| `SUPABASE_URL` | Supabase proje adresi (dekont Storage'ı için). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role anahtarı. **Gizli** — yalnızca sunucuda kullanılır. |
| `SUPABASE_RECEIPTS_BUCKET` | Dekont bucket'ı (varsayılan `receipts`). |
| `RESEND_API_KEY` | Resend API anahtarı. |
| `EMAIL_FROM` | Gönderen, ör. `P-PACK 2027 <tickets@alanadiniz.com>`. Alan adı Resend'de doğrulanmış olmalı. |
| `EMAIL_REPLY_TO` | Yanıt adresi. |
| `ADMIN_NOTIFY_EMAILS` | Yeni ödeme bildiriminde haber verilecek adresler (virgülle). |
| `TICKET_SECRET` | Bilet imzası (HMAC) anahtarı, en az 32 karakter. **Biletler gönderildikten sonra değiştirmeyin** — eski biletler geçersiz olur. |
| `SESSION_SECRET` | Oturum çerezi imzası, en az 32 karakter. |
| `ADMIN_USERS` | `kullanici:bcrypt_hash,kullanici2:bcrypt_hash` |
| `CHECKIN_PASSWORD_HASH` | Kapı personeli şifresinin bcrypt hash'i. |
| `LOCAL_DEV_MODE` | Yalnızca kendi bilgisayarınızda `1`. **Vercel'de tanımlamayın.** |

## 3. Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni proje açın (bölge: Frankfurt önerilir).
2. **SQL Editor**'e [`supabase/schema.sql`](supabase/schema.sql) dosyasının tamamını yapıştırıp çalıştırın. Bu; `orders`, `tickets`, `audit_log`, `rate_limits` tablolarını ve özel `receipts` bucket'ını oluşturur.
3. **Project Settings → Database → Connection string → Transaction pooler** adresini `DATABASE_URL` olarak kullanın.
4. **Project Settings → API** sayfasından `SUPABASE_URL` ve `service_role` anahtarını alın.

<details>
<summary>Şema özeti</summary>

```sql
orders   (id, reference, buyer_name, buyer_email, quantity, unit_price, currency TRY|EUR, total,
          price_tier, status PAYMENT_SUBMITTED|PAID|REJECTED, receipt_url, guests jsonb, locale,
          submitted_at, approved_at, approved_by, reject_reason)
tickets  (id, order_id, guest_name, guest_email, guest_instagram, signature,
          status VALID|USED|CANCELLED, checked_in_at, replaced_by, locale, created_at)
audit_log(id, admin, action, target_id, details jsonb, created_at)
rate_limits(key, window_start, count)
```

Spesifikasyona ek sütunlar: `orders.guests` (onaya kadar misafir bilgileri burada durur), `orders.locale` / `tickets.locale` (e-posta dili), `audit_log.details`, `tickets.created_at`.
Tablolarda RLS açık ve policy yok: Supabase'in herkese açık API'sinden erişilemez, uygulama yalnızca sunucudan `DATABASE_URL` ile bağlanır.
</details>

## 4. Resend kurulumu

1. [resend.com](https://resend.com) → **Domains** → alan adınızı ekleyip DNS kayıtlarını doğrulayın.
2. **API Keys** → anahtar oluşturun → `RESEND_API_KEY`.
3. `EMAIL_FROM` adresi doğrulanmış alan adından olmalı.

## 5. GitHub + Vercel deploy

```bash
git remote add origin git@github.com:KULLANICI/p-pack-2027.git
```

```bash
git push -u origin main
```

1. [vercel.com/new](https://vercel.com/new) → GitHub deposunu seçin (framework: Next.js, ek ayar gerekmez).
2. **Environment Variables** bölümüne 2. bölümdeki değişkenleri girin (`LOCAL_DEV_MODE` hariç).
   `ADMIN_USERS` ve `CHECKIN_PASSWORD_HASH` değerlerini Vercel'e **`\` olmadan**, `$` işaretleriyle olduğu gibi yapıştırın.
3. Deploy edin. Alan adını bağladıktan sonra `NEXT_PUBLIC_SITE_URL` değerini gerçek adresle güncelleyip yeniden deploy edin.
4. Fonksiyon bölgesini Supabase'e yakın seçin (Settings → Functions → Region: Frankfurt `fra1`).

## 6. İçerik değiştirme

Etkinlikle ilgili her şey tek dosyada: [`config/event.ts`](config/event.ts)

- **Fiyat dönemleri:** `priceTiers`. Her dönemin `until` değeri o dönemin bittiği andır (İstanbul saati, `+03:00`). Son dönemin bitişi satışın kapanışıdır. Fiyat, sunucu saatiyle "Ödemeyi yaptım" anında hesaplanır.
- **DJ'ler:** `djs: [{ name: 'DJ Adı', tag: 'House' }]`. Liste boşsa "Line-up yakında açıklanacak" yazar.
- **Kapasite:** `capacity`.
- **Mekan:** `venue.address`, `venue.mapsUrl`, `venue.mapsEmbedUrl` (Google Maps → Paylaş → Harita yerleştir → `src` adresi).
- **Revolut linki / iletişim e-postası:** `revolutUrl`, `ticketsEmail`.
- **Metinler:** [`i18n/tr.ts`](i18n/tr.ts) ve [`i18n/en.ts`](i18n/en.ts).

### Hero videosu

`public/video/` klasörüne **`hero.webm`** ve **`hero.mp4`** dosyalarını koyun, `public/poster.jpg` dosyasını videonun bir karesiyle değiştirin, sonra yeniden deploy edin (dosyalar derleme sırasında algılanır).
Öneri: 1080p, sessiz, 8–15 sn'lik döngü, dosya başına 2–5 MB. Dosyalar yokken poster + hafif altın parıltı animasyonu görünür. "Hareketi azalt" ayarı açık olan ziyaretçilere video yüklenmez, yalnızca poster gösterilir.

## 7. Admin ekleme / şifre değiştirme

```bash
npm run hash-password -- ali "guclu-bir-sifre"
```

Çıkan `ali:$2b$12$...` değerini `ADMIN_USERS` içine virgülle ekleyin (`kaan:<hash>,ali:<hash>`) ve yeniden deploy edin.
Bir admini kaldırmak için değerini silin. Kapı şifresi için:

```bash
npm run hash-password -- "kapi-sifresi"
```

> `.env` dosyalarında hash içindeki her `$` işaretinin önüne `\` gerekir (betik hazır halini de yazdırır). Vercel ekranında gerekmez.

## 8. Nasıl çalışır

- **Sipariş:** Form gönderilince sunucu bir referans kodu (`IST27-7K3QX`, kriptografik rastgele) üretir ama **veritabanına hiçbir şey yazmaz**. Kayıt ancak "Ödemeyi yaptım" ile `PAYMENT_SUBMITTED` olarak açılır; sipariş sahibine ve adminlere e-posta gider.
- **Kapasite:** Kontrol, advisory lock altında tek transaction içinde yapılır. Onay bekleyen siparişler de kapasiteden düşer; reddedilenler geri açılır.
- **48 saat:** Süreyi aşan bekleyen siparişler admin panelinde kırmızı görünür; otomatik iptal yoktur.
- **Bilet:** Kimlik 128 bit rastgeledir ve `TICKET_SECRET` ile HMAC-SHA256 imzası taşır. QR içeriği `IST27.<kimlik>.<imza>`; barkod, kimliğin 40 haneli ondalık halidir (Code128).
- **İsim değişikliği:** Eski bilet `CANCELLED` olur, yeni kimlik + yeni QR ile yeni bilet gönderilir.
- **Check-in:** `UPDATE … WHERE status = 'VALID'` ile atomik; aynı bilet iki cihazda aynı anda okutulsa bile yalnızca biri kabul edilir.
- **Güvenlik:** Tüm API girdileri zod ile doğrulanır; formlarda Postgres tabanlı rate limit ve honeypot vardır; dekontun türü dosya içeriğinden kontrol edilir (JPG/PNG/WEBP/HEIC/PDF, en fazla 4 MB) ve özel bucket'ta saklanır; admin/check-in rotaları hem middleware'de hem rota içinde korunur; oturum httpOnly çerezdir.

## 9. Test

```bash
npm run db:dev -- --memory
```

```bash
npm run build && npm start -- -p 3100
```

```bash
npm run e2e
```

`npm run e2e` şunu baştan sona doğrular: 3 kişilik sipariş → ödeme bildirimi → admin e-postası → onay → 3 ayrı bilet e-postası → isim değişikliği → check-in → aynı biletin ikinci okutmada reddi (+ yetkisiz erişim, sahte imza, eşzamanlı okutma, kapasite, CSV).
Test, `.env.local` içindeki `E2E_ADMIN_PASSWORD` ve `E2E_CHECKIN_PASSWORD` değerlerini (hash'lerini `ADMIN_USERS` / `CHECKIN_PASSWORD_HASH` olarak girdiğiniz şifreler) kullanır.

## 10. Bilinmesi gerekenler

- Admin paneli ve kapı ekranı yalnızca Türkçedir; ziyaretçinin gördüğü her şey TR + EN'dir.
- Fiyat dönemi değişirken (ör. 30 Kasım 23:59) ödeme yapıp bildirimi gece yarısından sonra gönderen kişinin siparişi yeni fiyattan kaydedilir. Tutar admin panelinde görünür; onaylayıp onaylamamak size kalır.
- Vercel fonksiyonlarının gövde sınırı 4,5 MB olduğu için dekont sınırı 4 MB'dir.
- KVKK metni ([`i18n/tr.ts`](i18n/tr.ts) → `kvkk`) genel bir taslaktır; veri sorumlusu bilgilerini ekleyip bir hukukçuya göstermeniz önerilir.
