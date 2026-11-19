/**
 * P-PACK 2027 — etkinliğin TÜM ayarları bu dosyada.
 * Fiyat, DJ, kapasite, mekan, Revolut linki vb. değiştirmek için sadece burayı düzenleyin.
 *
 * Tarihler İstanbul saatiyle (+03:00) yazılır.
 */

export type Currency = 'TRY' | 'EUR';

export type PriceTier = {
  /** Veritabanına price_tier olarak yazılan kimlik */
  id: string;
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
  name: 'P-PACK 2027',
  /** Referans kodlarının ve QR içeriğinin ön eki */
  codePrefix: 'PP27',

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

  /** DJ listesi. Boş bırakılırsa sitede "Line-up yakında açıklanacak" yazar. */
  djs: [
    // { name: 'DJ Örnek', tag: 'House / Disco' },
  ] as Dj[],

  /** Fiyat dönemleri — sırayla. Son dönemin bitişi aynı zamanda satışın kapanışıdır. */
  priceTiers: [
    { id: 'early', until: '2026-12-01T00:00:00+03:00', TRY: 2000, EUR: 45 },
    { id: 'regular', until: '2026-12-20T00:00:00+03:00', TRY: 2500, EUR: 55 },
    { id: 'late', until: '2027-01-01T00:00:00+03:00', TRY: 3000, EUR: 65 },
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
