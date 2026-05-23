import { apiFetch } from "./client";
import type { PagoFiado, MetodoPagoNoFiado } from "../types";

export interface CreatePagoFiadoPayload {
  clienteId: string;
  monto: number;
  metodoPago: MetodoPagoNoFiado;
  ventaId?: string;
  notas?: string;
}

export function getPagosFiado(clienteId?: string) {
  const qs = clienteId ? `?clienteId=${encodeURIComponent(clienteId)}` : "";
  return apiFetch<PagoFiado[]>(`/pagos-fiado${qs}`);
}

export function createPagoFiado(data: CreatePagoFiadoPayload) {
  return apiFetch<PagoFiado>("/pagos-fiado", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
