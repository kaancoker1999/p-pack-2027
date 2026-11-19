import fontkit from '@pdf-lib/fontkit';
import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { event } from '@/config/event';
import { getDict } from '@/i18n';
import { barcodePng, qrPng } from './codes';
import type { TicketRow } from './db';
import { formatEventDate, formatEventTime } from './pricing';
import { barcodeDigits, prettyId, qrPayload } from './tickets';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const gold = rgb(0.831, 0.686, 0.216);
const red = rgb(0.757, 0.071, 0.122);
const white = rgb(1, 1, 1);
const mute = rgb(0.64, 0.64, 0.64);

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = white, maxWidth = 250) {
  let s = size;
  while (font.widthOfTextAtSize(text, s) > maxWidth && s > 7) s -= 0.5;
  page.drawText(text, { x: (page.getWidth() - font.widthOfTextAtSize(text, s)) / 2, y, size: s, font, color });
}

/** Tek sayfalık, bilet kartı görünümünde PDF (Türkçe karakterler için gömülü fontlarla). */
export async function ticketPdf(ticket: TicketRow): Promise<Uint8Array> {
  const t = getDict(ticket.locale);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${event.name} — ${ticket.guest_name}`);
  const [regular, bold, display] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, 'Inter_400Regular.ttf')),
    fs.readFile(path.join(FONT_DIR, 'Inter_700Bold.ttf')),
    fs.readFile(path.join(FONT_DIR, 'PlayfairDisplay_700Bold.ttf')),
  ]);
  const fReg = await pdf.embedFont(regular, { subset: true });
  const fBold = await pdf.embedFont(bold, { subset: true });
  const fDisp = await pdf.embedFont(display, { subset: true });

  const W = 300;
  const H = 600;
  const page = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.02, 0.02, 0.02) });
  page.drawRectangle({ x: 0, y: H - 150, width: W, height: 150, color: rgb(0.33, 0, 0) });
  page.drawRectangle({ x: 0, y: H - 152, width: W, height: 2, color: gold });
  page.drawRectangle({ x: 10, y: 10, width: W - 20, height: H - 20, borderColor: gold, borderWidth: 1 });

  centered(page, t.ticket.admit.toLocaleUpperCase(ticket.locale), H - 42, fBold, 8, gold);
  centered(page, event.name, H - 82, fDisp, 30, gold);
  centered(page, `${formatEventDate(ticket.locale)} · ${formatEventTime()}`, H - 108, fBold, 11);
  centered(page, `${event.venue.name}, ${event.venue.area}`, H - 126, fReg, 10, white);

  centered(page, ticket.guest_name, H - 190, fDisp, 22);
  centered(page, `@${ticket.guest_instagram}`, H - 210, fReg, 12, gold);

  const qr = await pdf.embedPng(await qrPng(qrPayload(ticket.id, ticket.signature), 720));
  const qrSize = 190;
  page.drawRectangle({ x: (W - qrSize) / 2 - 6, y: H - 426, width: qrSize + 12, height: qrSize + 12, color: white });
  page.drawImage(qr, { x: (W - qrSize) / 2, y: H - 420, width: qrSize, height: qrSize });

  const bar = await pdf.embedPng(await barcodePng(barcodeDigits(ticket.id)));
  const barW = 240;
  const barH = Math.min(52, (bar.height / bar.width) * barW);
  page.drawRectangle({ x: (W - barW) / 2 - 4, y: H - 498, width: barW + 8, height: barH + 8, color: white });
  page.drawImage(bar, { x: (W - barW) / 2, y: H - 494, width: barW, height: barH });
  centered(page, prettyId(ticket.id), H - 512, fReg, 7, mute);

  page.drawRectangle({ x: 40, y: 46, width: W - 80, height: 26, color: red });
  centered(page, t.ticket.idNote.toLocaleUpperCase(ticket.locale), 55, fBold, 10);
  centered(page, t.ticket.openBar, 28, fReg, 8, mute);

  if (ticket.status === 'CANCELLED') {
    page.drawRectangle({ x: 0, y: H / 2 - 30, width: W, height: 60, color: red, opacity: 0.92 });
    centered(page, t.ticket.CANCELLED.toLocaleUpperCase(ticket.locale), H / 2 - 9, fBold, 24);
  }
  return pdf.save();
}
