/**
 * Istanbul 2027 — etkinliğin TÜM ayarları bu dosyada.
 * Fiyat, DJ, kapasite, mekan, Revolut linki vb. değiştirmek için sadece burayı düzenleyin.
 *
 * Tarihler İstanbul saatiyle (+03:00) yazılır.
 */

export type Currency = 'TRY' | 'EUR';

export type PriceTier = {
  /** Veritabanına price_tier olarak yazılan kimlik */
  id: string;
  /** Sitede görünen dönem adı */
  label: string;
  /** Bu dönemin bittiği an (bu an DAHİL DEĞİL). İstanbul saati. */
  until: string;
  TRY: number;
  EUR: number;
};

export type Dj = {
  name: string;
  /** İsteğe bağlı kısa açıklama, ör. "House / Disco" */
  tag?: string;
};

export const event = {
  name: 'Istanbul 2027',
  /** Hero'daki büyük logo: üst satır (altın) ve alt satır (beyaz) */
  logo: { top: 'ISTANBUL', bottom: '2027' },
  /** Referans kodlarının ve QR içeriğinin ön eki */
  codePrefix: 'IST27',

  /** Kapı açılışı */
  startsAt: '2026-12-31T22:00:00+03:00',
  /** Geri sayımın hedefi: 2027'nin ilk saniyesi */
  countdownTo: '2027-01-01T00:00:00+03:00',
  timeZone: 'Europe/Istanbul',

  venue: {
    name: 'Vaniköy Evleri',
    area: 'Vaniköy – İstanbul',
    // TODO: açık adresi yazın
    address: 'Vaniköy, Üsküdar / İstanbul (açık adres eklenecek)',
    // TODO: Google Maps paylaşım linkini yapıştırın
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Vanik%C3%B6y+Evleri+%C4%B0stanbul',
    // TODO: Google Maps > Paylaş > Harita yerleştir linkini yapıştırın
    mapsEmbedUrl: 'https://www.google.com/maps?q=Vanik%C3%B6y%2C+%C3%9Csk%C3%BCdar%2C+%C4%B0stanbul&z=15&output=embed',
  },

  /** Toplam kapasite (onaylı biletler + onay bekleyen siparişler bu sayıyı aşamaz) */
  capacity: 250,
  minAge: 18,
  dressCode: 'Elegant',

  /** DJ listesi. Boş bırakılırsa sitede "Line-up yakında açıklanacak" yazar. */
  djs: [
    // { name: 'DJ Örnek', tag: 'House / Disco' },
  ] as Dj[],

  /** Fiyat dönemleri — sırayla. Son dönemin bitişi aynı zamanda satışın kapanışıdır. */
  priceTiers: [
    // Early Bird: 9 Aralık 23:59'a kadar · Mid Bird: 10–24 Aralık · Late Bird: 25–31 Aralık
    { id: 'early', label: 'Early Bird', until: '2026-12-10T00:00:00+03:00', TRY: 2000, EUR: 45 },
    { id: 'mid', label: 'Mid Bird', until: '2026-12-25T00:00:00+03:00', TRY: 2500, EUR: 55 },
    { id: 'late', label: 'Late Bird', until: '2027-01-01T00:00:00+03:00', TRY: 3000, EUR: 65 },
  ] as PriceTier[],

  /** Ödeme linki (örnek) */
  revolutUrl: 'https://revolut.me/ornekkullanici',
  /** Biletlerin gönderildiği / iletişim adresi (örnek) */
  ticketsEmail: 'tickets@example.com',

  /** Onay için söz verilen süre (saat). Aşan siparişler admin panelinde kırmızı görünür. */
  approvalWindowHours: 48,

  /** Dekont yükleme sınırı (MB). Vercel fonksiyon gövde limiti 4.5 MB olduğu için 4'ü aşmayın. */
  receiptMaxMb: 4,
} as const;

export type EventConfig = typeof event;
