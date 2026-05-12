import { apiFetch } from "./client";
import type { MetodoPago } from "../types";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TicketNegocio {
  nombre:    string;
  taxId:     string | null;
  telefono:  string | null;
  direccion: string | null;
  logo:      string | null;
}

export interface TicketItem {
  id:             string;
  cantidad:       number;
  precioUnitario: number;
  subtotal:       number;
  producto: {
    id:     string;
    nombre: string;
    sku:    string | null;
  };
}

export interface TicketData {
  negocio: TicketNegocio;
  venta: {
    id:         string;
    numero:     number;
    subtotal:   number;
    total:      number;
    descuento:  number;
    metodoPago: MetodoPago;
    estado:     string;
    creadoEn:   string;
    cliente:    { id: string; nombre: string } | null;
    items:      TicketItem[];
  };
}

export interface ImprimirConfig {
  conexion: "network" | "usb";
  ip?:      string;
  puerto?:  number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Trae los datos completos del ticket para previsualización. */
export function getTicket(ventaId: string): Promise<TicketData> {
  return apiFetch<TicketData>(`/tickets/${ventaId}`);
}

/** Envía el ticket a la impresora térmica. */
export function imprimirTicket(
  ventaId: string,
  config: ImprimirConfig
): Promise<{ ok: boolean; message: string }> {
  return apiFetch(`/tickets/${ventaId}/imprimir`, {
    method: "POST",
    body:   JSON.stringify(config),
  });
}
