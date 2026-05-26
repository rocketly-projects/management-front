import { apiFetch } from "./client";
import type {
  Producto,
  ProductSearchResponse,
  CreateFromExternalPayload,
} from "../types";

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

/**
 * Búsqueda unificada usada por la caja: locales del tenant + sugerencias de OFF.
 * El backend devuelve los results con `source: "local" | "openfoodfacts"`.
 */
export function searchProductos(q: string, limit = 10, signal?: AbortSignal) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch<ProductSearchResponse>(
    `/productos/search?${params.toString()}`,
    { signal }
  );
}

/**
 * Crea un Producto local a partir de un payload de fuente externa (OFF, scanner, etc.).
 * 201 → Producto creado. 409 → ya existe; el cuerpo del ApiError trae `productoId`.
 */
export function createProductoFromExternal(payload: CreateFromExternalPayload) {
  return apiFetch<Producto>("/productos/from-external", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
