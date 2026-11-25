// Admin şifresi için bcrypt hash üretir.
// Kullanım:  npm run hash-password -- kaan "gizli-sifre"   (ADMIN_USERS için)
import bcrypt from 'bcryptjs';

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Kullanım: npm run hash-password -- kullanıcı-adı "şifre"');
  process.exit(1);
}
const [user, password] = args;
if (password.length < 10) console.error('Uyarı: en az 10 karakterlik bir şifre önerilir.\n');
const value = `${user.toLowerCase()}:${bcrypt.hashSync(password, 12)}`;

console.log('Vercel > Environment Variables alanına (olduğu gibi):\n');
console.log(`  ${value}\n`);
console.log('.env / .env.local dosyasına ($ işaretleri \\ ile kaçırılmış hali):\n');
console.log(`  ADMIN_USERS=${value.replaceAll('$', '\\$')}\n`);
console.log('Birden fazla admin için değerleri virgülle birleştirin: kaan:<hash>,ali:<hash>');
