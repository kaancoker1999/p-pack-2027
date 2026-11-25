import { getStore } from '@netlify/blobs';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Anahtar–değer deposu.
 * - Netlify'da: Netlify Blobs ("party" deposu, güçlü tutarlılık). Ayrı veritabanı ya da şifre gerekmez.
 * - Kendi bilgisayarınızda (LOCAL_STORE=1): .dev-data/store klasöründe JSON dosyaları.
 */
export type KV = {
  get<T>(key: string): Promise<T | null>;
  /** onlyIfNew: anahtar zaten varsa yazmaz ve false döner. */
  set(key: string, value: unknown, opts?: { onlyIfNew?: boolean }): Promise<boolean>;
  del(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
};

/** Depo yanıt vermezse istek dakikalarca asılı kalmasın: 10 sn sonra hata verir. */
function withTimeout<T>(p: Promise<T>, ms = 10_000): Promise<T> {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Depo zaman aşımı')), ms))]);
}

function blobStore(): KV {
  const store = getStore({ name: 'party', consistency: 'strong' });
  return {
    async get(key) {
      // Olmayan bir anahtarda store.get() Netlify'ın Next.js çalışma ortamında yanıt vermeden takılıyor
      // (canlıda ölçüldü). Bu yüzden önce hafif bir varlık sorgusu yapılır; yoksa null döner.
      if (!(await withTimeout(store.getMetadata(key)))) return null;
      return withTimeout(store.get(key, { type: 'json' }));
    },
    async set(key, value, opts) {
      const res = await withTimeout(store.setJSON(key, value, opts?.onlyIfNew ? { onlyIfNew: true } : undefined));
      return res.modified;
    },
    del: (key) => withTimeout(store.delete(key)),
    async list(prefix) {
      const { blobs } = await withTimeout(store.list({ prefix }));
      return blobs.map((b) => b.key);
    },
  };
}

function fileStore(): KV {
  const dir = path.join(process.cwd(), '.dev-data', 'store');
  const file = (key: string) => path.join(dir, `${encodeURIComponent(key)}.json`);
  return {
    async get(key) {
      try {
        return JSON.parse(await fs.readFile(file(key), 'utf8'));
      } catch {
        return null;
      }
    },
    async set(key, value, opts) {
      await fs.mkdir(dir, { recursive: true });
      try {
        await fs.writeFile(file(key), JSON.stringify(value), { flag: opts?.onlyIfNew ? 'wx' : 'w' });
        return true;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST') return false;
        throw e;
      }
    },
    async del(key) {
      await fs.rm(file(key), { force: true });
    },
    async list(prefix) {
      try {
        const names = await fs.readdir(dir);
        return names
          .filter((n) => n.endsWith('.json'))
          .map((n) => decodeURIComponent(n.slice(0, -5)))
          .filter((k) => k.startsWith(prefix))
          .sort();
      } catch {
        return [];
      }
    },
  };
}

let cached: KV | null = null;
export function kv(): KV {
  // Dosya deposu yalnızca açıkça istenirse kullanılır; böylece yayında yanlışlıkla geçici diske yazılmaz.
  return (cached ??= process.env.LOCAL_STORE === '1' ? fileStore() : blobStore());
}
