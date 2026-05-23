const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface CatalogoNegocio {
  nombre: string;
  nombreDisplay: string;
  logo: string | null;
  telefono: string | null;
  direccion: string | null;
  moneda: string;
}

export interface CatalogoProducto {
  id: string;
  nombre: string;
  marca: string | null;
  precio: number;
  categoria: string | null;
  imagen: string | null;
  stock: number;
}

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getNegocio(nombre: string) {
  return publicFetch<CatalogoNegocio>(`/public/${nombre}`);
}

export function getProductosCatalogo(
  nombre: string,
  filters?: { categoria?: string; busqueda?: string }
) {
  const params = new URLSearchParams();
  if (filters?.categoria) params.set("categoria", filters.categoria);
  if (filters?.busqueda) params.set("busqueda", filters.busqueda);
  const qs = params.toString();
  return publicFetch<CatalogoProducto[]>(`/public/${nombre}/productos${qs ? `?${qs}` : ""}`);
}

export function getCategoriasCatalogo(nombre: string) {
  return publicFetch<string[]>(`/public/${nombre}/productos/categorias`);
}
