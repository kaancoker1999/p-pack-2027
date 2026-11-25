/**
 * Istanbul 2027 — etkinliğin TÜM ayarları bu dosyada.
 * Mekan, saat, kapasite, referans kişileri vb. değiştirmek için sadece burayı düzenleyin.
 *
 * Tarihler İstanbul saatiyle (+03:00) yazılır.
 */

export const event = {
  name: 'Istanbul 2027',
  /** Hero'daki büyük logo: üst satır (altın) ve alt satır (beyaz) */
  logo: { top: 'ISTANBUL', bottom: '2027' },
  /** Kapı açılışı */
  startsAt: '2026-12-31T22:00:00+03:00',
  /** Geri sayımın hedefi: 2027'nin ilk saniyesi */
  countdownTo: '2027-01-01T00:00:00+03:00',
  timeZone: 'Europe/Istanbul',

  venue: {
    name: 'Vaniköy Evleri',
    area: 'Vaniköy – İstanbul',
    address: 'Kandilli, Vaniköy Evleri Sokağı, 34684 Üsküdar/İstanbul, Türkiye',
    /** Adresin yanında gösterilen not */
    addressNote: { tr: 'Kulüp binası', en: 'Clubhouse' },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Vanik%C3%B6y+Evleri+Soka%C4%9F%C4%B1%2C+Kandilli%2C+34684+%C3%9Csk%C3%BCdar%2F%C4%B0stanbul',
    mapsEmbedUrl: 'https://www.google.com/maps?q=Vanik%C3%B6y+Evleri+Soka%C4%9F%C4%B1%2C+Kandilli%2C+34684+%C3%9Csk%C3%BCdar%2F%C4%B0stanbul&z=16&output=embed',
  },

  /** Hedef kişi sayısı (admin panelinde kayıt sayısının yanında gösterilir; kaydı sınırlamaz) */
  capacity: 250,
  /** Kayıt formundaki "Referans kişisi" seçenekleri (yalnızca organizatörler) */
  inviters: ['Metehan', 'Kaan', 'Derin', 'Elif', 'Doğa'],

  minAge: 18,
  dressCode: 'Elegant',

  /** İletişim adresi (örnek) */
  contactEmail: 'tickets@example.com',
} as const;

export type EventConfig = typeof event;
