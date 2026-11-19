import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';
import { event } from '@/config/event';
import { isProd } from '../env';

export type Mail = { to: string | string[]; subject: string; html: string; tag?: string };
export type MailResult = { ok: boolean; error?: string };

function from(): string {
  return process.env.EMAIL_FROM || `${event.name} <${event.ticketsEmail}>`;
}

/**
 * Resend ile e-posta gönderir.
 * RESEND_API_KEY yoksa ve üretimde değilsek e-postayı .dev-data/outbox klasörüne yazar
 * (yerel geliştirme ve uçtan uca test için).
 */
export async function sendEmail(mail: Mail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (isProd) {
      console.error('[email] RESEND_API_KEY tanımlı değil, e-posta gönderilemedi:', mail.subject);
      return { ok: false, error: 'RESEND_API_KEY missing' };
    }
    const dir = path.join(process.cwd(), '.dev-data', 'outbox');
    await fs.mkdir(dir, { recursive: true });
    const file = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${mail.tag ?? 'mail'}.json`;
    await fs.writeFile(path.join(dir, file), JSON.stringify({ from: from(), ...mail, at: new Date().toISOString() }, null, 2));
    console.log(`[email:dev] → ${[mail.to].flat().join(', ')} | ${mail.subject}`);
    return { ok: true };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: from(),
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      replyTo: process.env.EMAIL_REPLY_TO || event.ticketsEmail,
    });
    if (error) {
      console.error('[email] gönderilemedi:', mail.subject, error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('[email] hata:', mail.subject, e);
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

/** Yeni sipariş bildirimi alacak adresler */
export function adminRecipients(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Birden fazla e-postayı tek istekte (Resend batch API) gönderir; böylece
 * kalabalık siparişlerde saniyelik istek sınırına takılmaz. Başarısız olan sayısını döner.
 */
export async function sendEmails(mails: Mail[]): Promise<{ sent: number; failed: number }> {
  if (mails.length === 0) return { sent: 0, failed: 0 };
  const key = process.env.RESEND_API_KEY;
  if (!key || mails.length === 1) {
    let failed = 0;
    for (const m of mails) if (!(await sendEmail(m)).ok) failed++;
    return { sent: mails.length - failed, failed };
  }
  const resend = new Resend(key);
  let failed = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(
        chunk.map((m) => ({
          from: from(),
          to: m.to,
          subject: m.subject,
          html: m.html,
          replyTo: process.env.EMAIL_REPLY_TO || event.ticketsEmail,
        })),
      );
      if (error) {
        console.error('[email] toplu gönderim hatası:', error);
        failed += chunk.length;
      }
    } catch (e) {
      console.error('[email] toplu gönderim hatası:', e);
      failed += chunk.length;
    }
  }
  return { sent: mails.length - failed, failed };
}
