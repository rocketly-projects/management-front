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

/** Convierte cualquier string de fecha (ISO datetime o YYYY-MM-DD) a YYYY-MM-DD local. */
function toDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const p = new URLSearchParams({
    desde: toDateStr(params.desde),
    hasta: toDateStr(params.hasta),
    agrupar: params.agrupar,
  });
  if (params.estado) p.set("estado", params.estado);
  return apiFetch<{ agrupacion: string; data: VentasAgregadasHora[] | VentasAgregadasDia[] | VentasAgregadasMetodo[] }>(
    `/reportes/ventas-agregadas?${p}`
  ).then((res) => res.data);
}
