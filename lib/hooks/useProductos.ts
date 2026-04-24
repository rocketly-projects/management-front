"use client";

import { useEffect } from "react";
import { useProductosStore } from "../store/productosStore";

export function useProductos() {
  const store = useProductosStore();

  useEffect(() => {
    if (store.productos.length === 0 && !store.loading) {
      store.fetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
