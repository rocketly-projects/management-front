import { apiFetch } from "./client";
import type {
  DashboardReporte,
  CierreCajaReporte,
  ComparativoSemanal,
  VentasAgregadasHora,
  VentasAgregadasDia,
  VentasAgregadasMetodo,
  EstadoVenta,
} from "../types";

/** fecha: YYYY-MM-DD. Si se omite, el backend usa hoy. */
export function getDashboardReporte(fecha?: string) {
  const qs = fecha ? `?fecha=${fecha}` : "";
  return apiFetch<DashboardReporte>(`/reportes/dashboard${qs}`);
}

export function getCierreCajaReporte(cajaId: string) {
  return apiFetch<CierreCajaReporte>(`/reportes/cierre-caja/${cajaId}`);
}

export function getComparativoSemanal(fechaFin?: string) {
  const qs = fechaFin ? `?fechaFin=${fechaFin}` : "";
  return apiFetch<ComparativoSemanal>(`/reportes/comparativo-semanal${qs}`);
}

export function getVentasAgregadas(
  params: { desde: string; hasta: string; agrupar: "hora"; estado?: EstadoVenta }
): Promise<VentasAgregadasHora[]>;
export function getVentasAgregadas(
  params: { desde: string; hasta: string; agrupar: "dia"; estado?: EstadoVenta }
): Promise<VentasAgregadasDia[]>;
export function getVentasAgregadas(
  params: { desde: string; hasta: string; agrupar: "metodo"; estado?: EstadoVenta }
): Promise<VentasAgregadasMetodo[]>;
export function getVentasAgregadas(params: {
  desde: string;
  hasta: string;
  agrupar: "hora" | "dia" | "metodo";
  estado?: EstadoVenta;
}): Promise<VentasAgregadasHora[] | VentasAgregadasDia[] | VentasAgregadasMetodo[]> {
  const p = new URLSearchParams({ desde: params.desde, hasta: params.hasta, agrupar: params.agrupar });
  if (params.estado) p.set("estado", params.estado);
  return apiFetch(`/reportes/ventas-agregadas?${p}`);
}
