// Uçtan uca test: 3 kişilik sipariş → ödeme bildirimi → admin e-postası → onay → 3 bilet e-postası
// → isim değişikliği → check-in → aynı biletin ikinci okutmada reddi (+ güvenlik ve kapasite kontrolleri).
//
// Çalıştırma:  1) npm run db:dev -- --memory   2) npm run build && npm start -- -p 3100   3) npm run e2e
// Sunucu LOCAL_DEV_MODE=1 ile çalışmalı (e-postalar .dev-data/outbox'a yazılır).
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const OUTBOX = '.dev-data/outbox';
let passed = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failures.push(`${name} ${detail}`);
  console.log(`${cond ? '  ✓' : '  ✗'} ${name}${cond ? '' : `  ← ${detail}`}`);
};
const step = (s) => console.log(`\n${s}`);
const outbox = () => (existsSync(OUTBOX) ? readdirSync(OUTBOX).sort().map((f) => JSON.parse(readFileSync(`${OUTBOX}/${f}`, 'utf8'))) : []);
const mailsTo = (addr, tag) => outbox().filter((m) => [m.to].flat().includes(addr) && (!tag || m.tag === tag));

const post = (path, body, cookie) =>
  fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body ?? {}) });
const cookieOf = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0];

const guests = [
  { name: 'Kaan Çoker', email: 'kaan.test@example.com', instagram: '@kaan.test' },
  { name: 'Ayşe Yıldız', email: 'ayse.test@example.com', instagram: 'Ayse_Yildiz' },
  { name: 'Mehmet Öztürk', email: 'mehmet.test@example.com', instagram: 'mehmetozturk' },
];
const consents = { age: true, noRefund: true, kvkk: true };
const base = { guests, currency: 'TRY', locale: 'tr', consents, website: '' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

rmSync(OUTBOX, { recursive: true, force: true });

step('1. Form doğrulama, honeypot ve onay kutuları');
check('eksik onay reddedilir', (await post('/api/checkout/prepare', { ...base, consents: { ...consents, kvkk: false } })).status === 400);
check('honeypot dolu ise reddedilir', (await post('/api/checkout/prepare', { ...base, website: 'http://spam' })).status === 400);
check('geçersiz e-posta reddedilir', (await post('/api/checkout/prepare', { ...base, guests: [{ ...guests[0], email: 'x' }] })).status === 400);
const tooMany = await post('/api/checkout/prepare', { ...base, guests: Array.from({ length: 251 }, () => guests[0]) });
check('kapasiteyi aşan sipariş reddedilir', [400, 409].includes(tooMany.status), String(tooMany.status));

step('2. Ödeme ekranı: referans + tutar (veritabanına yazılmadan)');
const prep = await (await post('/api/checkout/prepare', base)).json();
check('referans biçimi PP27-XXXXX', /^PP27-[2-9A-HJKMNP-Z]{5}$/.test(prep.reference ?? ''), prep.reference);
check('toplam = 3 × güncel fiyat', prep.total === 3 * prep.unitPrice && prep.quantity === 3, JSON.stringify(prep));
console.log(`     referans ${prep.reference}, tutar ${prep.total} ${prep.currency} (${prep.tier})`);
const before = await (await fetch(`${BASE}/order/${prep.reference}`)).text();
check('bildirim gönderilmeden sipariş kaydı yok', before.includes('bulunamadı'));
check('bildirim gönderilmeden e-posta yok', outbox().length === 0);

step('3. "Ödemeyi yaptım" + dekont yükleme');
const submit = async (payload, file, type = 'image/png') => {
  const fd = new FormData();
  fd.set('payload', JSON.stringify(payload));
  if (file) fd.set('receipt', new Blob([file], { type }), 'dekont.png');
  return fetch(`${BASE}/api/orders`, { method: 'POST', body: fd });
};
const full = { ...base, reference: prep.reference, token: prep.token };
check('sahte referans jetonu reddedilir', (await submit({ ...full, reference: 'PP27-AAAAA' }, null)).status === 400);
check('resim olmayan dekont reddedilir', (await submit(full, Buffer.from('<script>alert(1)</script>'.repeat(4)))).status === 400);
check('4 MB üstü dekont reddedilir', (await submit(full, Buffer.concat([PNG, Buffer.alloc(4.2 * 1024 * 1024)]))).status === 400);
check('reddedilen denemeler sipariş oluşturmadı', (await (await fetch(`${BASE}/order/${prep.reference}`)).text()).includes('bulunamadı'));
const ok = await submit(full, PNG);
const order = await ok.json();
check('sipariş kaydedildi', ok.status === 200 && order.reference === prep.reference, JSON.stringify(order));
const dup = await submit(full, PNG);
check('çift gönderim ikinci sipariş açmaz', dup.status === 200 && (await dup.json()).reference === prep.reference);
const statusPage = await (await fetch(`${BASE}/order/${prep.reference}`)).text();
check('/order/[referans] "Onay bekliyor" gösterir', statusPage.includes('Onay bekliyor'));
check('durum sayfası soyadları maskeler', statusPage.includes('Kaan Ç.') && !statusPage.includes('Kaan Çoker'));

step('4. E-postalar: sipariş sahibi + admin bildirimi');
const received = mailsTo('kaan.test@example.com', 'order-received');
check('sipariş sahibine "bildirim alındı" e-postası (1 adet)', received.length === 1 && received[0].html.includes(prep.reference), String(received.length));
const adminMail = mailsTo('admin@example.com', 'admin-new-order');
check('admin bildirimi gitti (1 adet)', adminMail.length === 1, String(adminMail.length));
const am = adminMail[0]?.html ?? '';
check('admin e-postası: referans, isimler, kişi sayısı, tutar, para birimi', [prep.reference, 'Kaan Çoker', 'Ayşe Yıldız', 'Mehmet Öztürk', 'TRY', prep.total.toLocaleString('tr-TR')].every((x) => am.includes(x)));
check('admin e-postası: dekont linki + panele direkt link', am.includes('/api/admin/receipt/') && am.includes(`/admin?q=${prep.reference}`));
check('Instagram @ olmadan ve küçük harfle kaydedildi', am.includes('@kaan.test') && !am.includes('@@') && am.includes('@ayse_yildiz'));
const orderId = am.match(/\/api\/admin\/receipt\/([0-9a-f-]{36})/)?.[1];

step('5. Admin koruması ve giriş');
check('girişsiz /admin login sayfasına yönlenir', (await fetch(`${BASE}/admin`, { redirect: 'manual' })).status === 307);
check('girişsiz onay API → 401', (await post(`/api/admin/orders/${orderId}/approve`)).status === 401);
check('girişsiz dekont → 401', (await fetch(`${BASE}/api/admin/receipt/${orderId}`)).status === 401);
check('girişsiz CSV → 401', (await fetch(`${BASE}/api/admin/export`)).status === 401);
check('yanlış şifre → 401', (await post('/api/admin/login', { username: 'kaan', password: 'yanlis-sifre' })).status === 401);
const login = await post('/api/admin/login', { username: 'kaan', password: env.E2E_ADMIN_PASSWORD });
const admin = cookieOf(login);
check('admin girişi httpOnly cookie verir', login.status === 200 && /HttpOnly/i.test(login.headers.get('set-cookie') ?? ''));
const receipt = await fetch(`${BASE}/api/admin/receipt/${orderId}`, { headers: { cookie: admin } });
check('admin dekontu açabilir', receipt.status === 200 && receipt.headers.get('content-type') === 'image/png');
const panel = await (await fetch(`${BASE}/admin`, { headers: { cookie: admin } })).text();
check('admin paneli siparişi listeler', panel.includes(prep.reference) && panel.includes('Onay bekleyen'));

step('6. Onay → 3 ayrı bilet + e-postalar');
const approve = await post(`/api/admin/orders/${orderId}/approve`, null, admin);
const approved = await approve.json();
check('onay başarılı, 3 bilet üretildi', approve.status === 200 && approved.tickets === 3 && approved.emailsFailed === 0, JSON.stringify(approved));
check('ikinci onay reddedilir (409)', (await post(`/api/admin/orders/${orderId}/approve`, null, admin)).status === 409);
const ticketIds = {};
for (const g of guests) {
  const m = mailsTo(g.email, 'ticket');
  const id = m[0]?.html.match(/\/ticket\/([0-9A-F]{32})/)?.[1];
  ticketIds[g.email] = id;
  check(`${g.name}: kendi e-postasına kendi bileti`, m.length === 1 && !!id && m[0].html.includes(g.name) && m[0].html.includes(`/api/ticket/${id}/qr`) && m[0].html.includes(`/api/ticket/${id}/pdf`));
}
const ids = Object.values(ticketIds);
check('3 bilet kimliği birbirinden farklı ve 128 bit', new Set(ids).size === 3 && ids.every((i) => /^[0-9A-F]{32}$/.test(i ?? '')));
const copy = mailsTo('kaan.test@example.com', 'order-tickets');
check('sipariş sahibine tüm biletlerin kopyası', copy.length === 1 && ids.every((i) => copy[0].html.includes(i)));
check('/order/[referans] "Onaylandı" gösterir', (await (await fetch(`${BASE}/order/${prep.reference}`)).text()).includes('Onaylandı'));

step('7. Bilet sayfası, QR görseli, PDF');
const [idKaan, idAyse, idMehmet] = guests.map((g) => ticketIds[g.email]);
const page = await (await fetch(`${BASE}/ticket/${idKaan}`)).text();
check('bilet sayfası: isim, @instagram, 18+ notu, QR ve barkod', ['Kaan Çoker', 'kaan.test', 'kimlik getirin', 'P-PACK 2027'].every((x) => page.includes(x)) && (page.match(/<svg/g) ?? []).length >= 2);
const qr = await fetch(`${BASE}/api/ticket/${idKaan}/qr`);
check('QR PNG', qr.status === 200 && qr.headers.get('content-type') === 'image/png');
const pdf = await fetch(`${BASE}/api/ticket/${idKaan}/pdf`);
check('PDF indirilebilir', pdf.status === 200 && Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString() === '%PDF-');
check('tahmini bilet kimliği → bulunamadı', (await (await fetch(`${BASE}/ticket/${'0'.repeat(32)}`)).text()).includes('Bilet bulunamadı'));

step('8. İsim değişikliği (Ayşe → Zeynep)');
const rename = await post(`/api/admin/tickets/${idAyse}/rename`, { name: 'Zeynep Şahin', email: 'zeynep.test@example.com', instagram: '@zeynep.sahin' }, admin);
const renamed = await rename.json();
check('yeni bilet yeni kimlikle üretildi', rename.status === 200 && /^[0-9A-F]{32}$/.test(renamed.id) && renamed.id !== idAyse, JSON.stringify(renamed));
const zMail = mailsTo('zeynep.test@example.com', 'ticket');
check('yeni bilet yeni kişinin e-postasına gitti', zMail.length === 1 && zMail[0].html.includes(renamed.id) && zMail[0].html.includes('Zeynep Şahin'));
check('eski bilet sayfası "iptal" gösterir', (await (await fetch(`${BASE}/ticket/${idAyse}`)).text()).includes('isim değişikliği nedeniyle iptal'));
check('iptal edilmiş bilete tekrar isim değişikliği yapılamaz', (await post(`/api/admin/tickets/${idAyse}/rename`, { name: 'Baska Biri', email: 'b@example.com', instagram: 'b' }, admin)).status === 409);
check('"bileti tekrar gönder" çalışır', (await post(`/api/admin/tickets/${idKaan}/resend`, null, admin)).status === 200 && mailsTo('kaan.test@example.com', 'ticket').length === 2);

step('9. Kapıda okutma');
const sig = (id) => createHmac('sha256', env.TICKET_SECRET).update(id).digest('hex').toUpperCase();
const qrCode = (id) => `PP27.${id}.${sig(id).slice(0, 32)}`;
const barcode = (id) => BigInt(`0x${id}`).toString().padStart(40, '0');
check('girişsiz okutma → 401', (await post('/api/checkin/scan', { code: qrCode(renamed.id) })).status === 401);
check('yanlış kapı şifresi → 401', (await post('/api/checkin/login', { password: 'yanlis' })).status === 401);
const doorLogin = await post('/api/checkin/login', { password: env.E2E_CHECKIN_PASSWORD });
const door = cookieOf(doorLogin);
check('kapı personeli girişi', doorLogin.status === 200 && !!door);
check('kapı personeli admin API kullanamaz', (await fetch(`${BASE}/api/admin/export`, { headers: { cookie: door } })).status === 401);
const scan = async (code) => (await post('/api/checkin/scan', { code }, door)).json();

const first = await scan(qrCode(renamed.id));
check('ilk okutma: GEÇERLİ — Zeynep Şahin (@zeynep.sahin)', first.result === 'VALID' && first.name === 'Zeynep Şahin' && first.instagram === 'zeynep.sahin', JSON.stringify(first));
const second = await scan(qrCode(renamed.id));
check(`ikinci okutma: ZATEN KULLANILDI — ${second.time}`, second.result === 'ALREADY_USED' && /^\d{2}:\d{2}$/.test(second.time ?? ''), JSON.stringify(second));
const viaBarcode = await scan(barcode(renamed.id));
check('aynı bilet barkodla da reddedilir', viaBarcode.result === 'ALREADY_USED');
const old = await scan(qrCode(idAyse));
check('isim değişikliğiyle iptal edilen eski bilet: GEÇERSİZ', old.result === 'INVALID' && old.reason === 'cancelled', JSON.stringify(old));
const forged = await scan(`PP27.${idKaan}.${'A'.repeat(32)}`);
check('sahte imzalı QR: GEÇERSİZ', forged.result === 'INVALID');
check('uydurma kod: GEÇERSİZ', (await scan('PP27.' + 'F'.repeat(32) + '.' + sig('F'.repeat(32)).slice(0, 32))).result === 'INVALID');

const race = await Promise.all(Array.from({ length: 6 }, () => scan(barcode(idMehmet))));
check('aynı anda 6 okutma: yalnızca 1 tanesi GEÇERLİ (atomik)', race.filter((r) => r.result === 'VALID').length === 1 && race.filter((r) => r.result === 'ALREADY_USED').length === 5, race.map((r) => r.result).join(','));
const manual = await scan(idKaan.slice(0, 8).toLowerCase());
check('elle giriş (bilet no ilk 8 karakter): GEÇERLİ', manual.result === 'VALID' && manual.name === 'Kaan Çoker', JSON.stringify(manual));
check('sayaç: 3 içeride / 3 bilet', manual.checkedIn === 3 && manual.totalTickets === 3, `${manual.checkedIn}/${manual.totalTickets}`);

step('10. Reddetme, davetli bileti, CSV, işlem kaydı');
const prep2 = await (await post('/api/checkout/prepare', { ...base, guests: [{ name: 'John Smith', email: 'john.test@example.com', instagram: 'johnsmith' }], currency: 'EUR', locale: 'en' })).json();
await submit({ ...base, guests: [{ name: 'John Smith', email: 'john.test@example.com', instagram: 'johnsmith' }], currency: 'EUR', locale: 'en', reference: prep2.reference, token: prep2.token }, null);
check('İngilizce sipariş e-postası İngilizce', mailsTo('john.test@example.com', 'order-received')[0]?.subject.includes('We received'));
const order2Id = (await (await fetch(`${BASE}/admin`, { headers: { cookie: admin } })).text()).match(new RegExp(`\\\\"id\\\\":\\\\"([0-9a-f-]{36})\\\\",\\\\"reference\\\\":\\\\"${prep2.reference}`))?.[1];
const reject = await post(`/api/admin/orders/${order2Id}/reject`, { reason: 'Payment did not arrive.' }, admin);
check('reddetme + açıklamalı e-posta', reject.status === 200 && mailsTo('john.test@example.com', 'order-rejected')[0]?.html.includes('Payment did not arrive.'), String(reject.status));
const comp = await post('/api/admin/tickets', { name: 'Davetli Misafir', email: 'davetli.test@example.com', instagram: 'davetli', locale: 'tr' }, admin);
check('elle davetli bileti oluşturuldu ve gönderildi', comp.status === 200 && mailsTo('davetli.test@example.com', 'ticket').length === 1);
const csv = await (await fetch(`${BASE}/api/admin/export`, { headers: { cookie: admin } })).text();
check('CSV: ad, e-posta, Instagram, bilet durumu', csv.includes('Ad Soyad') && csv.includes('"Zeynep Şahin","zeynep.test@example.com","zeynep.sahin","Kullanıldı"') && csv.includes('"Ayşe Yıldız"') && csv.includes('İptal') && csv.includes('Davetli'));
const panel2 = await (await fetch(`${BASE}/admin`, { headers: { cookie: admin } })).text();
check('işlem kaydı: onay, isim değişikliği, check-in, ret', ['order.approve', 'ticket.rename', 'ticket.checkin', 'order.reject', 'ticket.comp'].every((a) => panel2.includes(a)));
check('özet: 4 onaylı bilet, kalan kapasite 246', panel2.includes('\\"confirmedTickets\\":4') && panel2.includes('\\"remaining\\":246'));

console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed} kontrol geçti, ${failures.length} başarısız.`);
if (failures.length) {
  console.log(failures.map((f) => `   - ${f}`).join('\n'));
  process.exit(1);
}
