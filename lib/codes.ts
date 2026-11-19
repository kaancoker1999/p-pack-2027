import QRCode from 'qrcode';
import bwipjs from 'bwip-js/node';

const QR_OPTS = { errorCorrectionLevel: 'M' as const, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } };

export async function qrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { ...QR_OPTS, type: 'svg' });
}

export async function qrPng(payload: string, width = 600): Promise<Buffer> {
  return QRCode.toBuffer(payload, { ...QR_OPTS, type: 'png', width });
}

const BARCODE = { bcid: 'code128', includetext: false, height: 14, paddingwidth: 4, paddingheight: 2, backgroundcolor: 'FFFFFF' };

export function barcodeSvg(digits: string): string {
  return bwipjs.toSVG({ ...BARCODE, text: digits, scale: 2 });
}

export async function barcodePng(digits: string): Promise<Buffer> {
  return bwipjs.toBuffer({ ...BARCODE, text: digits, scale: 3 });
}
