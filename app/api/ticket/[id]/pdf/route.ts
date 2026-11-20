import { getTicket } from '@/lib/orders';
import { ticketPdf } from '@/lib/pdf';
import { ticketIdSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = ticketIdSchema.safeParse((await params).id.toUpperCase());
  const ticket = id.success ? await getTicket(id.data) : null;
  if (!ticket) return new Response('Not found', { status: 404 });
  const pdf = await ticketPdf(ticket);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Istanbul-2027-${ticket.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
