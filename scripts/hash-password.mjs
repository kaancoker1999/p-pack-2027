// Admin / kapı şifresi için bcrypt hash üretir.
// Kullanım:  npm run hash-password -- kaan "gizli-sifre"     (admin: ADMIN_USERS için)
//            npm run hash-password -- "kapi-sifresi"          (kapı: CHECKIN_PASSWORD_HASH için)
import bcrypt from 'bcryptjs';

const args = process.argv.slice(2);
if (args.length < 1 || args.length > 2) {
  console.error('Kullanım: npm run hash-password -- [kullanıcı-adı] "şifre"');
  process.exit(1);
}
const [user, password] = args.length === 2 ? args : [null, args[0]];
if (password.length < 10) console.error('Uyarı: en az 10 karakterlik bir şifre önerilir.\n');
const hash = bcrypt.hashSync(password, 12);
const value = user ? `${user.toLowerCase()}:${hash}` : hash;

console.log('Vercel > Environment Variables alanına (olduğu gibi):\n');
console.log(`  ${value}\n`);
console.log('.env / .env.local dosyasına ($ işaretleri \\ ile kaçırılmış hali):\n');
console.log(`  ${user ? 'ADMIN_USERS' : 'CHECKIN_PASSWORD_HASH'}=${value.replaceAll('$', '\\$')}\n`);
if (user) console.log('Birden fazla admin için değerleri virgülle birleştirin: kaan:<hash>,ali:<hash>');
