import { apiFetch } from "./client";
import type { GastoConCaja, PaginatedResponse } from "../types";

export interface GastosFilters {
  page?: number;
  limit?: number;
  cajaId?: string;
  desde?: string;
  hasta?: string;
}

export interface GastosListResponse extends PaginatedResponse<GastoConCaja> {
  monto: number;
}

export function getAllGastos(filters?: GastosFilters): Promise<GastosListResponse> {
  const params = new URLSearchParams();
  if (filters?.page)   params.set("page",   String(filters.page));
  if (filters?.limit)  params.set("limit",  String(filters.limit));
  if (filters?.cajaId) params.set("cajaId", filters.cajaId);
  if (filters?.desde)  params.set("desde",  filters.desde);
  if (filters?.hasta)  params.set("hasta",  filters.hasta);
  const qs = params.toString();
  return apiFetch<{
    data: GastoConCaja[];
    pagination: { page: number; limit: number; total: number; pages: number };
    totals: { monto: number };
  }>(`/gastos${qs ? `?${qs}` : ""}`).then(({ data, pagination, totals }) => ({
    data,
    total: pagination.total,
    page:  pagination.page,
    limit: pagination.limit,
    monto: totals.monto,
  }));
}
