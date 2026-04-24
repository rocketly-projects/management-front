import { create } from "zustand";
import type { Producto } from "../types";
import type { ProductoFilters } from "../api/productos";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api/productos";

interface ProductosState {
  productos: Producto[];
  loading: boolean;
  error: string | null;
  filtros: ProductoFilters;
  fetch: () => Promise<void>;
  create: (data: Partial<Producto>) => Promise<Producto>;
  update: (id: string, data: Partial<Producto>) => Promise<Producto>;
  remove: (id: string) => Promise<void>;
  setFiltros: (filtros: ProductoFilters) => void;
}

export const useProductosStore = create<ProductosState>()((set, get) => ({
  productos: [],
  loading: false,
  error: null,
  filtros: {},
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const productos = await getProductos(get().filtros);
      set({ productos });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Error al cargar productos" });
    } finally {
      set({ loading: false });
    }
  },
  create: async (data) => {
    const producto = await createProducto(data);
    set((s) => ({ productos: [producto, ...s.productos] }));
    return producto;
  },
  update: async (id, data) => {
    const updated = await updateProducto(id, data);
    set((s) => ({
      productos: s.productos.map((p) => (p.id === id ? updated : p)),
    }));
    return updated;
  },
  remove: async (id) => {
    await deleteProducto(id);
    set((s) => ({ productos: s.productos.filter((p) => p.id !== id) }));
  },
  setFiltros: (filtros) => {
    set({ filtros });
    get().fetch();
  },
}));
