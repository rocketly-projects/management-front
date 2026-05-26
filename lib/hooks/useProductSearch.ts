"use client";

import { useEffect, useRef, useState } from "react";
import { searchProductos } from "@/lib/api/productos";
import { ApiError } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  getCachedSearch,
  setCachedSearch,
} from "@/lib/utils/productSearchCache";
import type { ProductSearchResult } from "@/lib/types";

export interface UseProductSearchResult {
  results: ProductSearchResult[];
  localCount: number;
  suggestionCount: number;
  loading: boolean;
  error: string | null;
}

const INITIAL: UseProductSearchResult = {
  results: [],
  localCount: 0,
  suggestionCount: 0,
  loading: false,
  error: null,
};

/**
 * Busca productos contra GET /productos/search con:
 *  - debounce 300ms,
 *  - cancelación con AbortController cuando el query cambia,
 *  - cache LRU en memoria (60s, 50 entradas) para evitar disparar el mismo
 *    request cuando el cajero borra y vuelve a tipear lo mismo.
 *
 * Devuelve siempre la última respuesta válida; los requests abortados se ignoran.
 */
export function useProductSearch(query: string, limit = 10): UseProductSearchResult {
  const debounced = useDebouncedValue(query.trim(), 300);
  const [state, setState] = useState<UseProductSearchResult>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();

    if (debounced.length < 2) {
      // Resetear cuando el query queda corto. setState sync acá es intencional:
      // estamos sincronizando el estado del fetch con un input externo (el query).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(INITIAL);
      return;
    }

    const cached = getCachedSearch(debounced, limit);
    if (cached) {
      setState({ ...cached, loading: false, error: null });
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState((s) => ({ ...s, loading: true, error: null }));

    searchProductos(debounced, limit, ctrl.signal)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setCachedSearch(debounced, limit, data);
        setState({ ...data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({
          ...INITIAL,
          error: err instanceof ApiError ? err.message : "Error al buscar productos",
        });
      });

    return () => ctrl.abort();
  }, [debounced, limit]);

  return state;
}
