// Yerel geliştirme veritabanı: Supabase / Docker gerektirmeyen gömülü Postgres (PGlite).
// Kullanım: npm run db:dev   →  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { mkdirSync, readFileSync } from 'node:fs';

const memory = process.argv.includes('--memory');
const port = Number(process.env.DEV_DB_PORT ?? 54329);
if (!memory) mkdirSync('.dev-data', { recursive: true });

const db = await PGlite.create(memory ? undefined : '.dev-data/pglite');
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8').split('-- @supabase-only')[0];
await db.exec(schema);

const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
await server.start();
console.log(`Yerel veritabanı hazır${memory ? ' (bellekte)' : ''}: postgres://postgres:postgres@127.0.0.1:${port}/postgres`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
