"use client";

import { useState, useEffect, useCallback } from "react";
import { getVentas } from "../api/ventas";
import type { Venta, PaginatedResponse, EstadoVenta } from "../types";
import { ApiError } from "../api/client";

export interface VentasFiltros {
  page?: number;
  limit?: number;
  estado?: EstadoVenta;
  cajaId?: string;
  desde?: string;
  hasta?: string;
}

export function useVentas(filtros: VentasFiltros = {}) {
  const [data, setData] = useState<PaginatedResponse<Venta>>({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVentas(filtros);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filtros)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}
