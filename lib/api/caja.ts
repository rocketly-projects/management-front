import { apiFetch } from "./client";
import type { Caja, CajaConAgregados, CajaResumen, EstadoCaja, Gasto, PaginatedResponse } from "../types";

export interface CajaFilters {
  page?: number;
  limit?: number;
  estado?: EstadoCaja;
  desde?: string;
  hasta?: string;
}

export function getCajas(filters?: CajaFilters): Promise<PaginatedResponse<CajaConAgregados>> {
  const params = new URLSearchParams();
  if (filters?.page)   params.set("page",   String(filters.page));
  if (filters?.limit)  params.set("limit",  String(filters.limit));
  if (filters?.estado) params.set("estado", filters.estado);
  if (filters?.desde)  params.set("desde",  filters.desde);
  if (filters?.hasta)  params.set("hasta",  filters.hasta);
  const qs = params.toString();
  return apiFetch<{ data: CajaConAgregados[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/caja${qs ? `?${qs}` : ""}`
  ).then(({ data, pagination }) => ({
    data,
    total: pagination.total,
    page:  pagination.page,
    limit: pagination.limit,
  }));
}

export function getCajaResumen(id: string) {
  return apiFetch<CajaResumen>(`/caja/${id}/resumen`);
}

export function getCajaActiva() {
  return apiFetch<Caja | null>("/caja/activa");
}

export function abrirCaja(montoInicial: number) {
  return apiFetch<Caja>("/caja/abrir", {
    method: "POST",
    body: JSON.stringify({ montoInicial }),
  });
}

export function cerrarCaja(montoCierre: number, notas?: string) {
  return apiFetch<Caja>("/caja/cerrar", {
    method: "POST",
    body: JSON.stringify({ montoCierre, notas }),
  });
}

export function getGastos(cajaId: string) {
  return apiFetch<Gasto[]>(`/caja/${cajaId}/gastos`);
}

export function createGasto(cajaId: string, descripcion: string, monto: number) {
  return apiFetch<Gasto>(`/caja/${cajaId}/gastos`, {
    method: "POST",
    body: JSON.stringify({ descripcion, monto }),
  });
}
