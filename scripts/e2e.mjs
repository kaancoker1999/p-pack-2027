// Uçtan uca test: 3 kişilik sipariş → ödeme bildirimi → admin e-postası → onay → sipariş sayfasında 3 bilet
// → isim değişikliği → check-in → aynı biletin ikinci okutmada reddi (+ güvenlik ve kapasite kontrolleri).
//
// Çalıştırma:  1) npm run db:dev -- --memory   2) npm run build && npm start -- -p 3100   3) npm run e2e
// Sunucu LOCAL_DEV_MODE=1 ile çalışmalı (admin e-postası .dev-data/outbox'a yazılır).
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

const post = (path, body, cookie) =>
  fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body ?? {}) });
const cookieOf = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0];
const page = async (path, cookie) => (await fetch(BASE + path, cookie ? { headers: { cookie } } : undefined)).text();
/** Sipariş sayfasındaki bilet linkleri (sırayla) */
const ticketIdsOn = (html) => [...new Set([...html.matchAll(/\/ticket\/([0-9A-F]{32})/g)].map((m) => m[1]))];

const guests = [{ name: 'Kaan Çoker' }, { name: 'Ayşe Yıldız' }, { name: 'Mehmet Öztürk' }];
const consents = { age: true, noRefund: true, kvkk: true };
const base = { guests, invitedBy: 'Kaan', currency: 'TRY', locale: 'tr', consents, website: '' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const REF_RE = /^IST27-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

rmSync(OUTBOX, { recursive: true, force: true });

step('1. Form doğrulama, honeypot ve onay kutuları');
check('eksik onay reddedilir', (await post('/api/checkout/prepare', { ...base, consents: { ...consents, kvkk: false } })).status === 400);
check('honeypot dolu ise reddedilir', (await post('/api/checkout/prepare', { ...base, website: 'http://spam' })).status === 400);
check('tek kelimelik isim reddedilir', (await post('/api/checkout/prepare', { ...base, guests: [{ name: 'Kaan' }] })).status === 400);
check('"kim davet etti" boşsa reddedilir', (await post('/api/checkout/prepare', { ...base, invitedBy: '' })).status === 400);
check('listede olmayan davet eden reddedilir', (await post('/api/checkout/prepare', { ...base, invitedBy: 'Ahmet' })).status === 400);
for (const name of ['Metehan', 'Kaan', 'Derin', 'Elif', 'Doğa']) {
  const r = await post('/api/checkout/prepare', { ...base, invitedBy: name });
  check(`davet eden "${name}" kabul edilir`, r.status === 200, String(r.status));
}
const tooMany = await post('/api/checkout/prepare', { ...base, guests: Array.from({ length: 251 }, () => guests[0]) });
check('kapasiteyi aşan sipariş reddedilir', [400, 409].includes(tooMany.status), String(tooMany.status));

step('2. Ödeme ekranı: referans + tutar (veritabanına yazılmadan)');
const prep = await (await post('/api/checkout/prepare', base)).json();
check('referans biçimi IST27-XXXX-XXXX', REF_RE.test(prep.reference ?? ''), prep.reference);
check('toplam = 3 × güncel fiyat', prep.total === 3 * prep.unitPrice && prep.quantity === 3, JSON.stringify(prep));
console.log(`     referans ${prep.reference}, tutar ${prep.total} ${prep.currency} (${prep.tier})`);
check('bildirim gönderilmeden sipariş kaydı yok', (await page(`/order/${prep.reference}`)).includes('bulunamadı'));
check('bildirim gönderilmeden e-posta yok', outbox().length === 0);

step('3. "Ödemeyi yaptım" + dekont yükleme');
const submit = async (payload, file, type = 'image/png') => {
  const fd = new FormData();
  fd.set('payload', JSON.stringify(payload));
  if (file) fd.set('receipt', new Blob([file], { type }), 'dekont.png');
  return fetch(`${BASE}/api/orders`, { method: 'POST', body: fd });
};
const full = { ...base, reference: prep.reference, token: prep.token };
check('sahte referans jetonu reddedilir', (await submit({ ...full, reference: 'IST27-AAAA-AAAA' }, null)).status === 400);
check('resim olmayan dekont reddedilir', (await submit(full, Buffer.from('<script>alert(1)</script>'.repeat(4)))).status === 400);
check('4 MB üstü dekont reddedilir', (await submit(full, Buffer.concat([PNG, Buffer.alloc(4.2 * 1024 * 1024)]))).status === 400);
check('reddedilen denemeler sipariş oluşturmadı', (await page(`/order/${prep.reference}`)).includes('bulunamadı'));
const ok = await submit(full, PNG);
const order = await ok.json();
check('sipariş kaydedildi', ok.status === 200 && order.reference === prep.reference, JSON.stringify(order));
const dup = await submit(full, PNG);
check('çift gönderim ikinci sipariş açmaz', dup.status === 200 && (await dup.json()).reference === prep.reference);
const pending = await page(`/order/${prep.reference}`);
check('/order/[referans] "Onay bekliyor" gösterir', pending.includes('Onay bekliyor'));
check('onaydan önce sipariş sayfasında bilet yok', ticketIdsOn(pending).length === 0);
check('sipariş sayfası davet edeni gösterir', pending.includes('Davet eden'));

step('4. E-posta: yalnızca admin bildirimi');
const mails = outbox();
check('misafire e-posta gitmez, tek e-posta admin bildirimi', mails.length === 1 && mails[0].tag === 'admin-new-order' && [mails[0].to].flat().includes('admin@example.com'), `${mails.length}`);
const am = mails[0]?.html ?? '';
check('admin e-postası: referans, isimler, kişi sayısı, tutar, para birimi, davet eden', [prep.reference, 'Kaan Çoker', 'Ayşe Yıldız', 'Mehmet Öztürk', 'TRY', prep.total.toLocaleString('tr-TR'), 'Davet eden'].every((x) => am.includes(x)));
check('admin e-postası: dekont linki + panele direkt link', am.includes('/api/admin/receipt/') && am.includes(`/admin?q=${prep.reference}`));
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
const panel = await page('/admin', admin);
check('admin paneli siparişi ve davet edeni listeler', panel.includes(prep.reference) && panel.includes('Onay bekleyen') && panel.includes('\\"invitedBy\\":\\"Kaan\\"'));

step('6. Onay → 3 ayrı bilet sipariş sayfasında');
const approve = await post(`/api/admin/orders/${orderId}/approve`, null, admin);
const approved = await approve.json();
check('onay başarılı, 3 bilet üretildi', approve.status === 200 && approved.tickets === 3, JSON.stringify(approved));
check('ikinci onay reddedilir (409)', (await post(`/api/admin/orders/${orderId}/approve`, null, admin)).status === 409);
check('onay misafire e-posta göndermez', outbox().length === 1, String(outbox().length));
const paid = await page(`/order/${prep.reference}`);
check('/order/[referans] "Onaylandı" gösterir', paid.includes('Onaylandı'));
const ids = ticketIdsOn(paid);
check('sipariş sayfasında 3 bilet linki (128 bit, birbirinden farklı)', ids.length === 3 && ids.every((i) => /^[0-9A-F]{32}$/.test(i)), String(ids.length));
check('sipariş sayfası üç ismi de gösterir', guests.every((g) => paid.includes(g.name)));
const byName = {};
for (const id of ids) {
  const html = await page(`/ticket/${id}`);
  const g = guests.find((x) => html.includes(x.name));
  if (g) byName[g.name] = id;
}
check('her misafirin kendi bileti var', guests.every((g) => byName[g.name]));
check('yanlış referansla biletlere ulaşılamaz', ticketIdsOn(await page('/order/IST27-AAAA-AAAA')).length === 0);

step('7. Bilet sayfası, QR görseli, PDF');
const idKaan = byName['Kaan Çoker'];
const idAyse = byName['Ayşe Yıldız'];
const idMehmet = byName['Mehmet Öztürk'];
const tpage = await page(`/ticket/${idKaan}`);
check('bilet sayfası: isim, davet eden, 18+ notu, QR ve barkod', ['Kaan Çoker', 'Davet eden', 'kimlik getirin', 'Istanbul 2027'].every((x) => tpage.includes(x)) && (tpage.match(/<svg/g) ?? []).length >= 2);
check('bilet sayfasında Instagram yok', !tpage.includes('@<!-- -->') && !/instagram/i.test(tpage));
const qr = await fetch(`${BASE}/api/ticket/${idKaan}/qr`);
check('QR PNG', qr.status === 200 && qr.headers.get('content-type') === 'image/png');
const pdf = await fetch(`${BASE}/api/ticket/${idKaan}/pdf`);
check('PDF indirilebilir', pdf.status === 200 && Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString() === '%PDF-');
check('tahmini bilet kimliği → bulunamadı', (await page(`/ticket/${'0'.repeat(32)}`)).includes('Bilet bulunamadı'));

step('8. İsim değişikliği (Ayşe → Zeynep)');
const rename = await post(`/api/admin/tickets/${idAyse}/rename`, { name: 'Zeynep Şahin' }, admin);
const renamed = await rename.json();
check('yeni bilet yeni kimlikle üretildi', rename.status === 200 && /^[0-9A-F]{32}$/.test(renamed.id) && renamed.id !== idAyse, JSON.stringify(renamed));
const afterRename = await page(`/order/${prep.reference}`);
const idsAfter = ticketIdsOn(afterRename);
check('sipariş sayfasında eski bilet gitti, yenisi geldi', idsAfter.length === 3 && idsAfter.includes(renamed.id) && !idsAfter.includes(idAyse) && afterRename.includes('Zeynep Şahin') && !afterRename.includes('Ayşe Yıldız'));
check('eski bilet sayfası "iptal" gösterir', (await page(`/ticket/${idAyse}`)).includes('isim değişikliği nedeniyle iptal'));
check('iptal edilmiş bilete tekrar isim değişikliği yapılamaz', (await post(`/api/admin/tickets/${idAyse}/rename`, { name: 'Baska Biri' }, admin)).status === 409);

step('9. Kapıda okutma');
const sig = (id) => createHmac('sha256', env.TICKET_SECRET).update(id).digest('hex').toUpperCase();
const qrCode = (id) => `IST27.${id}.${sig(id).slice(0, 32)}`;
const barcode = (id) => BigInt(`0x${id}`).toString().padStart(40, '0');
check('girişsiz okutma → 401', (await post('/api/checkin/scan', { code: qrCode(renamed.id) })).status === 401);
check('yanlış kapı şifresi → 401', (await post('/api/checkin/login', { password: 'yanlis' })).status === 401);
const doorLogin = await post('/api/checkin/login', { password: env.E2E_CHECKIN_PASSWORD });
const door = cookieOf(doorLogin);
check('kapı personeli girişi', doorLogin.status === 200 && !!door);
check('kapı personeli admin API kullanamaz', (await fetch(`${BASE}/api/admin/export`, { headers: { cookie: door } })).status === 401);
const scan = async (code) => (await post('/api/checkin/scan', { code }, door)).json();

const first = await scan(qrCode(renamed.id));
check('ilk okutma: GEÇERLİ — Zeynep Şahin (davet eden: Kaan)', first.result === 'VALID' && first.name === 'Zeynep Şahin' && first.invitedBy === 'Kaan', JSON.stringify(first));
const second = await scan(qrCode(renamed.id));
check(`ikinci okutma: ZATEN KULLANILDI — ${second.time}`, second.result === 'ALREADY_USED' && /^\d{2}:\d{2}$/.test(second.time ?? ''), JSON.stringify(second));
check('aynı bilet barkodla da reddedilir', (await scan(barcode(renamed.id))).result === 'ALREADY_USED');
const old = await scan(qrCode(idAyse));
check('isim değişikliğiyle iptal edilen eski bilet: GEÇERSİZ', old.result === 'INVALID' && old.reason === 'cancelled', JSON.stringify(old));
check('sahte imzalı QR: GEÇERSİZ', (await scan(`IST27.${idKaan}.${'A'.repeat(32)}`)).result === 'INVALID');
check('uydurma kod: GEÇERSİZ', (await scan('IST27.' + 'F'.repeat(32) + '.' + sig('F'.repeat(32)).slice(0, 32))).result === 'INVALID');
const race = await Promise.all(Array.from({ length: 6 }, () => scan(barcode(idMehmet))));
check('aynı anda 6 okutma: yalnızca 1 tanesi GEÇERLİ (atomik)', race.filter((r) => r.result === 'VALID').length === 1 && race.filter((r) => r.result === 'ALREADY_USED').length === 5, race.map((r) => r.result).join(','));
const manual = await scan(idKaan.slice(0, 8).toLowerCase());
check('elle giriş (bilet no ilk 8 karakter): GEÇERLİ', manual.result === 'VALID' && manual.name === 'Kaan Çoker', JSON.stringify(manual));
check('sayaç: 3 içeride / 3 bilet', manual.checkedIn === 3 && manual.totalTickets === 3, `${manual.checkedIn}/${manual.totalTickets}`);

step('10. Reddetme, davetli bileti, CSV, işlem kaydı');
const john = { ...base, guests: [{ name: 'John Smith' }], invitedBy: 'Doğa', currency: 'EUR', locale: 'en' };
const prep2 = await (await post('/api/checkout/prepare', john)).json();
await submit({ ...john, reference: prep2.reference, token: prep2.token }, null);
const order2Id = (await page('/admin', admin)).match(new RegExp(`\\\\"id\\\\":\\\\"([0-9a-f-]{36})\\\\",\\\\"reference\\\\":\\\\"${prep2.reference}`))?.[1];
const reject = await post(`/api/admin/orders/${order2Id}/reject`, { reason: 'Payment did not arrive.' }, admin);
const rejectedPage = await (await fetch(`${BASE}/order/${prep2.reference}`, { headers: { cookie: 'lang=en' } })).text();
check('reddetme: açıklama sipariş sayfasında (İngilizce) görünür', reject.status === 200 && rejectedPage.includes('Rejected') && rejectedPage.includes('Payment did not arrive.'), String(reject.status));
const comp = await post('/api/admin/tickets', { name: 'Davetli Misafir', invitedBy: 'Elif', locale: 'tr' }, admin);
const compId = (await comp.json()).id;
check('elle davetli bileti oluşturuldu', comp.status === 200 && (await page(`/ticket/${compId}`)).includes('Davetli Misafir'));
check('davetli biletinde geçersiz davet eden reddedilir', (await post('/api/admin/tickets', { name: 'Biri Daha', invitedBy: 'Yabancı', locale: 'tr' }, admin)).status === 400);
const csv = await page('/api/admin/export', admin);
check('CSV: ad, davet eden, bilet durumu', csv.includes('"Ad Soyad","Davet eden","Bilet durumu","Referans"') && csv.includes('"Zeynep Şahin","Kaan","Kullanıldı"') && csv.includes('"Ayşe Yıldız","Kaan","İptal"') && csv.includes('"Davetli Misafir","Elif","Geçerli","Davetli"'));
const panel2 = await page('/admin', admin);
check('işlem kaydı: onay, isim değişikliği, check-in, ret', ['order.approve', 'ticket.rename', 'ticket.checkin', 'order.reject', 'ticket.comp'].every((a) => panel2.includes(a)));
check('özet: 4 onaylı bilet, kalan kapasite 246', panel2.includes('\\"confirmedTickets\\":4') && panel2.includes('\\"remaining\\":246'));
check('toplamda yalnızca 2 e-posta (ikisi de admin bildirimi)', outbox().length === 2 && outbox().every((m) => m.tag === 'admin-new-order'), String(outbox().length));

console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed} kontrol geçti, ${failures.length} başarısız.`);
if (failures.length) {
  console.log(failures.map((f) => `   - ${f}`).join('\n'));
  process.exit(1);
}
