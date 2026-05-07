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
  const { page, limit, estado, cajaId, desde, hasta } = filtros;
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
      const res = await getVentas({ page, limit, estado, cajaId, desde, hasta });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  }, [page, limit, estado, cajaId, desde, hasta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}
