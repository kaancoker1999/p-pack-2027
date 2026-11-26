// Uçtan uca test: kayıt formu → admin listesi → CSV → silme (+ doğrulama, mükerrer kayıt ve yetki kontrolleri).
//
// Çalıştırma:  1) rm -rf .dev-data   2) npm run build && npm start -- -p 3100   3) npm run e2e
// (.env.local içinde LOCAL_STORE=1 olmalı: kayıtlar .dev-data/store klasörüne yazılır.)
import { readFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
let passed = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failures.push(`${name} ${detail}`);
  console.log(`${cond ? '  ✓' : '  ✗'} ${name}${cond ? '' : `  ← ${detail}`}`);
};
const step = (s) => console.log(`\n${s}`);
const send = (method, path, body, cookie) =>
  fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
const post = (path, body, cookie) => send('POST', path, body ?? {}, cookie);
const page = async (path, cookie) => (await fetch(BASE + path, cookie ? { headers: { cookie } } : undefined)).text();
const cookieOf = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0];

const consents = { age: true, kvkk: true };
const base = { firstName: 'Kaan', lastName: 'Çoker', phone: '0532 111 22 33', invitedBy: 'Kaan Çoker', locale: 'tr', consents, website: '' };
const reg = (over) => post('/api/register', { ...base, ...over });

step('1. Sayfalar');
const home = await page('/');
check('ana sayfada "Kayıt Ol" var, fiyat ve bilet yok', home.includes('Kayıt Ol') && !/Early Bird|Bilet Al|₺/.test(home));
const form = await page('/register');
check('kayıt formu: isim, soyad, telefon, referans kişisi', ['İsim', 'Soyad', 'Telefon', 'Referans kişisi'].every((x) => form.includes(x)));
check('referans listesinde yalnızca 5 organizatör', ['Derin Kılıç', 'Kaan Çoker', 'Metehan Buharalı', 'Elif Onur', 'Doğa Özilhan'].every((x) => form.includes(x)));
const old = await fetch(`${BASE}/tickets`, { redirect: 'manual' });
check('eski /tickets linki kayıt formuna yönlenir', [307, 308].includes(old.status) && (old.headers.get('location') ?? '').includes('/register'), String(old.status));
for (const gone of ['/order/IST27-AAAA-AAAA', '/checkin', '/ticket/' + '0'.repeat(32)]) {
  check(`${gone.split('/')[1]} sayfası kaldırıldı (404)`, (await fetch(BASE + gone, { redirect: 'manual' })).status === 404);
}

step('2. Form doğrulama');
check('eksik onay reddedilir', (await reg({ consents: { age: true, kvkk: false } })).status === 400);
check('honeypot dolu ise reddedilir', (await reg({ website: 'http://spam' })).status === 400);
check('boş isim reddedilir', (await reg({ firstName: ' ' })).status === 400);
check('rakamlı soyad reddedilir', (await reg({ lastName: 'Ab12' })).status === 400);
check('referans kişisi boşsa reddedilir', (await reg({ invitedBy: '' })).status === 400);
check('listede olmayan referans reddedilir', (await reg({ invitedBy: 'Ahmet' })).status === 400);
for (const bad of ['12345', 'telefon', '0212 111 22 33', '+90 212 111 22 33', '532 111 22']) {
  check(`geçersiz telefon reddedilir: ${bad}`, (await reg({ phone: bad })).status === 400);
}

step('3. Kayıt');
const r1 = await reg({});
const d1 = await r1.json();
check('kayıt oluşturuldu', r1.status === 200 && d1.ok && d1.duplicate === false, JSON.stringify(d1));
const dup = await (await reg({ firstName: 'Başka', lastName: 'Biri', phone: '+90 (532) 111-22-33', invitedBy: 'Elif Onur' })).json();
check('aynı telefon (farklı yazımla) ikinci kayıt açmaz', dup.ok && dup.duplicate === true && dup.firstName === null, JSON.stringify(dup));
const people = [
  { firstName: 'Ayşe', lastName: 'Yıldız', phone: '5332223344', invitedBy: 'Metehan Buharalı' },
  { firstName: 'Mehmet Ali', lastName: 'Öztürk', phone: '+905343334455', invitedBy: 'Derin Kılıç' },
  { firstName: 'John', lastName: "O'Neil", phone: '+44 7911 123456', invitedBy: 'Doğa Özilhan', locale: 'en' },
  { firstName: 'Zeynep', lastName: 'Şahin-Kaya', phone: '00905354445566', invitedBy: 'Elif Onur' },
];
for (const p of people) {
  const r = await reg(p);
  check(`kayıt: ${p.firstName} ${p.lastName} (${p.phone})`, r.status === 200 && (await r.json()).duplicate === false, String(r.status));
}

step('4. Admin koruması ve giriş');
check('girişsiz /admin login sayfasına yönlenir', (await fetch(`${BASE}/admin`, { redirect: 'manual' })).status === 307);
check('girişsiz CSV → 401', (await fetch(`${BASE}/api/admin/export`)).status === 401);
check('girişsiz silme → 401', (await send('DELETE', '/api/admin/registrations/905000000000')).status === 401);
check('yanlış şifre → 401', (await post('/api/admin/login', { username: 'kaan', password: 'yanlis-sifre' })).status === 401);
const login = await post('/api/admin/login', { username: 'kaan', password: env.E2E_ADMIN_PASSWORD });
const admin = cookieOf(login);
check('admin girişi httpOnly cookie verir', login.status === 200 && /HttpOnly/i.test(login.headers.get('set-cookie') ?? ''));

step('5. Admin listesi ve CSV');
const panel = await page('/admin', admin);
check('panel 5 kaydı listeler', ['Çoker', 'Yıldız', 'Öztürk', 'Neil', 'Şahin-Kaya'].every((x) => panel.includes(x)) && !panel.includes('Başka'));
check('telefonlar tek biçimde saklandı', ['+905321112233', '+905332223344', '+905343334455', '+447911123456', '+905354445566'].every((x) => panel.includes(x)));
check('referans kişileri kayıtlı', panel.includes('\\"invitedBy\\":\\"Metehan Buharalı\\"') && panel.includes('\\"invitedBy\\":\\"Doğa Özilhan\\"'));
const csv = await page('/api/admin/export', admin);
check('CSV başlıkları', csv.includes('"Sıra","Ad","Soyad","Telefon","Referans kişisi","Ödeme durumu","Kayıt zamanı"'));
const csvLines = csv.trim().split('\r\n');
check('CSV: 5 kişi, hepsi "Ödenmedi"', csvLines.length === 6 && csvLines.slice(1).every((l) => l.includes('"Ödenmedi"')), String(csvLines.length));
check('CSV isme göre sıralı (Ayşe, John, Kaan, Mehmet Ali, Zeynep)', ['Ayşe', 'John', 'Kaan', 'Mehmet Ali', 'Zeynep'].every((n, i) => csvLines[i + 1].startsWith(`"${i + 1}","${n}"`)), csvLines.slice(1).map((l) => l.split(',')[1]).join(' '));
check('CSV satırı: telefon ve referans', csv.includes('"Kaan","Çoker"," +90 532 111 22 33","Kaan Çoker"') && csv.includes('"John","O\'Neil"," +447911123456","Doğa Özilhan"'));
check('panelde WhatsApp linki yok', !/whatsapp|wa\.me/i.test(panel));

step('5b. Ödeme durumu');
const idOf = (html, first) => html.match(new RegExp(`\\\\"id\\\\":\\\\"(\\d{8,15})\\\\",\\\\"firstName\\\\":\\\\"${first}\\\\"`))?.[1];
const idKaan = idOf(panel, 'Kaan');
const idJohn = idOf(panel, 'John');
check('girişsiz ödeme değişikliği → 401', (await send('PATCH', `/api/admin/registrations/${idKaan}`, { payment: 'cash' })).status === 401);
check('geçersiz ödeme durumu reddedilir', (await send('PATCH', `/api/admin/registrations/${idKaan}`, { payment: 'kredi' }, admin)).status === 400);
check('Kaan → Nakit', (await send('PATCH', `/api/admin/registrations/${idKaan}`, { payment: 'cash' }, admin)).status === 200, String(idKaan));
check('John → IBAN', (await send('PATCH', `/api/admin/registrations/${idJohn}`, { payment: 'iban' }, admin)).status === 200);
check('olmayan kayıt → 404', (await send('PATCH', '/api/admin/registrations/905000000000', { payment: 'cash' }, admin)).status === 404);
const csv2 = await page('/api/admin/export', admin);
check('CSV ödeme durumlarını gösterir', csv2.includes('"Kaan","Çoker"," +90 532 111 22 33","Kaan Çoker","Nakit"') && csv2.includes('"Doğa Özilhan","IBAN"') && (csv2.match(/"Ödenmedi"/g) ?? []).length === 3);
check('Kaan → tekrar Ödenmedi', (await send('PATCH', `/api/admin/registrations/${idKaan}`, { payment: 'unpaid' }, admin)).status === 200 && (await page('/admin', admin)).includes('registration.payment'));

step('5c. Parti listesi rengi (cinsiyet düzeltmesi)');
check('boş güncelleme reddedilir', (await send('PATCH', `/api/admin/registrations/${idKaan}`, {}, admin)).status === 400);
check('geçersiz değer reddedilir', (await send('PATCH', `/api/admin/registrations/${idKaan}`, { gender: 'x' }, admin)).status === 400);
check('varsayılan: elle düzeltme yok (isimden tahmin edilir)', (await page('/admin', admin)).includes('\\"gender\\":null') );
check('John → kız olarak düzeltilebilir', (await send('PATCH', `/api/admin/registrations/${idJohn}`, { gender: 'f' }, admin)).status === 200 && (await page('/admin', admin)).includes('\\"gender\\":\\"f\\"'));

step('6. Kayıt silme');
const id = idOf(panel, 'Ayşe');
const del = await send('DELETE', `/api/admin/registrations/${id}`, null, admin);
check('admin kaydı silebilir', del.status === 200, `${del.status} ${id}`);
check('aynı kayıt ikinci kez silinemez (404)', (await send('DELETE', `/api/admin/registrations/${id}`, null, admin)).status === 404);
const panel2 = await page('/admin', admin);
check('silinen kayıt listeden çıktı, işlem kayda geçti', !panel2.includes('\\"lastName\\":\\"Yıldız\\"') && panel2.includes('registration.delete') && panel2.includes('registrations.export'));
check('silinen numara yeniden kaydolabilir', (await (await reg(people[0])).json()).duplicate === false);

step('7. Hız sınırı');
let limited = false;
for (let i = 0; i < 40 && !limited; i++) limited = (await reg({ phone: 'x' })).status === 429;
check('art arda çok fazla deneme 429 ile durdurulur', limited);

console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed} kontrol geçti, ${failures.length} başarısız.`);
if (failures.length) {
  console.log(failures.map((f) => `   - ${f}`).join('\n'));
  process.exit(1);
}
