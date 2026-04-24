import { apiFetch } from "./client";
import type { Producto } from "../types";

export interface ProductoFilters {
  categoria?: string;
  activo?: boolean;
  busqueda?: string;
}

export function getProductos(filters?: ProductoFilters) {
  const params = new URLSearchParams();
  if (filters?.categoria) params.set("categoria", filters.categoria);
  if (filters?.activo !== undefined) params.set("activo", String(filters.activo));
  if (filters?.busqueda) params.set("busqueda", filters.busqueda);
  const qs = params.toString();
  return apiFetch<Producto[]>(`/productos${qs ? `?${qs}` : ""}`);
}

export function getProducto(id: string) {
  return apiFetch<Producto>(`/productos/${id}`);
}

export function createProducto(data: Partial<Producto>) {
  return apiFetch<Producto>("/productos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProducto(id: string, data: Partial<Producto>) {
  return apiFetch<Producto>(`/productos/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteProducto(id: string) {
  return apiFetch<void>(`/productos/${id}`, { method: "DELETE" });
}
