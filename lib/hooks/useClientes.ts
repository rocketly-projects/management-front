"use client";

import { useState, useEffect, useCallback } from "react";
import { getClientes } from "../api/clientes";
import type { ClienteFilters } from "../api/clientes";
import type { Cliente, ClienteConDeuda } from "../types";
import { ApiError } from "../api/client";

export function useClientes(filtros: ClienteFilters = {}) {
  const { search, conDeuda, activo } = filtros;
  const [data, setData] = useState<(Cliente | ClienteConDeuda)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClientes({ search, conDeuda, activo });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, [search, conDeuda, activo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  return { data, loading, error, refetch: loadData };
}
