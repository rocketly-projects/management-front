import { apiFetch } from "./client";
import type { Venta, PaginatedResponse, MetodoPago, EstadoVenta } from "../types";

export interface VentaFilters {
  page?: number;
  limit?: number;
  estado?: EstadoVenta;
  cajaId?: string;
  desde?: string;
  hasta?: string;
}

export interface CreateVentaPayload {
  items: { productoId: string; cantidad: number }[];
  descuento?: number;
  metodoPago: MetodoPago;
  cajaId: string;
  clienteId?: string;
}

export function getVentas(filters?: VentaFilters): Promise<PaginatedResponse<Venta>> {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.estado) params.set("estado", filters.estado);
  if (filters?.cajaId) params.set("cajaId", filters.cajaId);
  if (filters?.desde)  params.set("desde",  filters.desde);
  if (filters?.hasta)  params.set("hasta",  filters.hasta);
  const qs = params.toString();
  return apiFetch<{ data: Venta[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/ventas${qs ? `?${qs}` : ""}`
  ).then(({ data, pagination }) => ({
    data,
    total: pagination.total,
    page:  pagination.page,
    limit: pagination.limit,
  }));
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
