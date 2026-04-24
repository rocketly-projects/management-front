import { apiFetch } from "./client";
import type { Venta, PaginatedResponse, MetodoPago, EstadoVenta } from "../types";

export interface VentaFilters {
  page?: number;
  limit?: number;
  estado?: EstadoVenta;
  cajaId?: string;
}

export interface CreateVentaPayload {
  items: { productoId: string; cantidad: number }[];
  descuento?: number;
  metodoPago: MetodoPago;
  cajaId: string;
}

export function getVentas(filters?: VentaFilters) {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.estado) params.set("estado", filters.estado);
  if (filters?.cajaId) params.set("cajaId", filters.cajaId);
  const qs = params.toString();
  return apiFetch<PaginatedResponse<Venta>>(`/ventas${qs ? `?${qs}` : ""}`);
}

export function getVenta(id: string) {
  return apiFetch<Venta>(`/ventas/${id}`);
}

export function createVenta(data: CreateVentaPayload) {
  return apiFetch<Venta>("/ventas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function anularVenta(id: string) {
  return apiFetch<Venta>(`/ventas/${id}/anular`, { method: "POST" });
}
