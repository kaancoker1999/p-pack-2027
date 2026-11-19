import { qrPng } from '@/lib/codes';
import { getTicket } from '@/lib/orders';
import { qrPayload } from '@/lib/tickets';
import { ticketIdSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Bilet e-postasındaki QR görseli (PNG). Kimlik 128 bit rastgele olduğu için tahmin edilemez. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = ticketIdSchema.safeParse((await params).id.toUpperCase());
  const ticket = id.success ? await getTicket(id.data) : null;
  if (!ticket) return new Response('Not found', { status: 404 });
  const png = await qrPng(qrPayload(ticket.id, ticket.signature), 600);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600', 'X-Robots-Tag': 'noindex' },
  });
}
