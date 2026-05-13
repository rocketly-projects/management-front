import { jsPDF } from 'jspdf';
import type { TicketData } from '@/lib/api/tickets';

const PAGE_W = 80;
const MARGIN = 7;
const LINE_H = 4.5;

const METODO: Record<string, string> = {
  EFECTIVO:      'Efectivo',
  DEBITO:        'Tarjeta Debito',
  CREDITO:       'Tarjeta Credito',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO:  'Mercado Pago',
  FIADO:         'Fiado',
};

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

// jsPDF built-in fonts only support Latin-1 reliably — remove combining accents
function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¡¿]/g, '');
}

function calcHeight(data: TicketData): number {
  const { negocio, venta } = data;
  let lines = 5;
  if (negocio.taxId)     lines++;
  if (negocio.direccion) lines++;
  if (negocio.telefono)  lines++;
  lines += venta.items.length * 2;
  if (venta.descuento > 0) lines += 2;
  lines += 6;
  return Math.max(120, lines * LINE_H + MARGIN * 2 + 20);
}

export function generarTicketPdf(data: TicketData): jsPDF {
  const { negocio, venta } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W, calcHeight(data)] });

  const CX = PAGE_W / 2;
  const RX = PAGE_W - MARGIN;
  let y = MARGIN + 2;

  const t = (str: string, x: number, opts?: { align?: 'left' | 'center' | 'right' }) =>
    doc.text(normalize(str), x, y, { align: opts?.align ?? 'left' });

  const sep = () => {
    doc.setDrawColor(180, 180, 180);
    doc.line(MARGIN, y, RX, y);
    y += 3;
  };

  // Nombre del negocio
  doc.setFont('Courier', 'bold');
  doc.setFontSize(11);
  t(negocio.nombre.toUpperCase(), CX, { align: 'center' });
  y += LINE_H + 1;

  // Datos del negocio
  doc.setFont('Courier', 'normal');
  doc.setFontSize(8);
  if (negocio.taxId)     { t(`CUIT: ${negocio.taxId}`, CX, { align: 'center' }); y += LINE_H; }
  if (negocio.direccion) { t(negocio.direccion, CX, { align: 'center' });          y += LINE_H; }
  if (negocio.telefono)  { t(`Tel: ${negocio.telefono}`, CX, { align: 'center' }); y += LINE_H; }

  y += 2; sep();

  // Ticket # y fecha
  const fecha = new Date(venta.creadoEn).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = new Date(venta.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont('Courier', 'bold'); doc.setFontSize(9);
  t(`Ticket #${String(venta.numero).padStart(4, '0')}`, MARGIN);
  doc.setFont('Courier', 'normal');
  t(`${fecha} ${hora}`, RX, { align: 'right' });
  y += LINE_H; sep();

  // Items
  for (const item of venta.items) {
    doc.setFont('Courier', 'bold'); doc.setFontSize(9);
    t(item.producto.nombre, MARGIN);
    y += LINE_H - 0.5;
    doc.setFont('Courier', 'normal'); doc.setFontSize(8);
    t(`${item.cantidad} x ${fmt(item.precioUnitario)}`, MARGIN);
    doc.setFont('Courier', 'bold');
    t(fmt(item.subtotal), RX, { align: 'right' });
    doc.setFont('Courier', 'normal');
    y += LINE_H + 0.5;
  }
  sep();

  // Totales
  doc.setFontSize(8);
  if (venta.descuento > 0) {
    t('Subtotal', MARGIN); t(fmt(venta.subtotal), RX, { align: 'right' }); y += LINE_H;
    doc.setTextColor(22, 163, 74);
    t('Descuento', MARGIN); t(`-${fmt(venta.descuento)}`, RX, { align: 'right' });
    doc.setTextColor(0, 0, 0); y += LINE_H;
  }
  doc.setFont('Courier', 'bold'); doc.setFontSize(11);
  t('TOTAL', MARGIN); t(fmt(venta.total), RX, { align: 'right' });
  y += LINE_H + 1; sep();

  // Pie: método de pago + gracias
  doc.setFont('Courier', 'bold'); doc.setFontSize(8);
  t((METODO[venta.metodoPago] ?? venta.metodoPago).toUpperCase(), CX, { align: 'center' });
  y += LINE_H + 2;
  doc.setFont('Courier', 'normal');
  t('Gracias por su compra!', CX, { align: 'center' });

  return doc;
}

export function descargarTicketPdf(data: TicketData): void {
  generarTicketPdf(data).save(`ticket-${String(data.venta.numero).padStart(4, '0')}.pdf`);
}

export async function compartirTicketPdf(data: TicketData): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const doc  = generarTicketPdf(data);
  const blob = doc.output('blob');
  const file = new File([blob], `ticket-${String(data.venta.numero).padStart(4, '0')}.pdf`, { type: 'application/pdf' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ title: `Ticket #${String(data.venta.numero).padStart(4, '0')}`, files: [file] });
    return true;
  } catch { return false; }
}

export function whatsappTicketUrl(data: TicketData): string {
  const { negocio, venta } = data;
  const lines = [
    `*${negocio.nombre}*`,
    `Ticket #${String(venta.numero).padStart(4, '0')}`,
    '',
    ...venta.items.map(i => `${i.producto.nombre} x${i.cantidad}: ${fmt(i.subtotal)}`),
    '',
    ...(venta.descuento > 0 ? [`Descuento: -${fmt(venta.descuento)}`] : []),
    `*TOTAL: ${fmt(venta.total)}*`,
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function mailtoTicketUrl(data: TicketData): string {
  const { negocio, venta } = data;
  const subject = encodeURIComponent(
    `Tu ticket de ${negocio.nombre} - #${String(venta.numero).padStart(4, '0')}`,
  );
  const body = [
    'Hola,', '',
    'Te enviamos el detalle de tu compra:', '',
    `Negocio: ${negocio.nombre}`,
    `Ticket: #${String(venta.numero).padStart(4, '0')}`, '',
    ...venta.items.map(i => `- ${i.producto.nombre} x${i.cantidad}: ${fmt(i.subtotal)}`), '',
    ...(venta.descuento > 0 ? [`Descuento: -${fmt(venta.descuento)}`] : []),
    `TOTAL: ${fmt(venta.total)}`,
  ].join('\n');
  return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
}
