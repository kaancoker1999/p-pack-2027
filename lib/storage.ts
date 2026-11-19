import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { event } from '@/config/event';
import { isProd } from './env';

const BUCKET = process.env.SUPABASE_RECEIPTS_BUCKET || 'receipts';
const DEV_DIR = path.join(process.cwd(), '.dev-data', 'receipts');

type Kind = { ext: string; mime: string };

/** Dosya türünü uzantıya/beyana değil, içeriğin ilk baytlarına bakarak belirler. */
function sniff(buf: Buffer): Kind | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: 'png', mime: 'image/png' };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP')
    return { ext: 'webp', mime: 'image/webp' };
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp' && /^(heic|heix|mif1|msf1|hevc)/.test(buf.subarray(8, 12).toString('latin1')))
    return { ext: 'heic', mime: 'image/heic' };
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  return null;
}

export type ReceiptCheck = { ok: true; buf: Buffer; kind: Kind } | { ok: false; error: 'too_large' | 'bad_type' };

export async function checkReceipt(file: File): Promise<ReceiptCheck> {
  if (file.size > event.receiptMaxMb * 1024 * 1024) return { ok: false, error: 'too_large' };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  return kind ? { ok: true, buf, kind } : { ok: false, error: 'bad_type' };
}

function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Dekontu özel bucket'a yükler, dosya yolunu döner. Supabase tanımlı değilse (yerel geliştirme) diske yazar. */
export async function uploadReceipt(reference: string, buf: Buffer, kind: Kind): Promise<string> {
  const key = `${reference}-${randomBytes(8).toString('hex')}.${kind.ext}`;
  const sb = supabase();
  if (!sb) {
    if (isProd) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil.');
    await fs.mkdir(DEV_DIR, { recursive: true });
    await fs.writeFile(path.join(DEV_DIR, key), buf);
    return key;
  }
  const { error } = await sb.storage.from(BUCKET).upload(key, buf, { contentType: kind.mime, upsert: false });
  if (error) throw new Error(`Dekont yüklenemedi: ${error.message}`);
  return key;
}

export async function deleteReceipt(key: string): Promise<void> {
  const sb = supabase();
  try {
    if (!sb) await fs.unlink(path.join(DEV_DIR, path.basename(key)));
    else await sb.storage.from(BUCKET).remove([key]);
  } catch {
    /* yok say */
  }
}

/** Admin için: kısa ömürlü imzalı link ya da (yerelde) dosyanın kendisi. */
export async function receiptAccess(
  key: string,
): Promise<{ redirect: string } | { body: Buffer; mime: string } | null> {
  const sb = supabase();
  if (!sb) {
    try {
      const body = await fs.readFile(path.join(DEV_DIR, path.basename(key)));
      return { body, mime: sniff(body)?.mime ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(key, 300);
  return error || !data ? null : { redirect: data.signedUrl };
}
