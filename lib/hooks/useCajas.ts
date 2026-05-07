"use client";

import { useState, useEffect, useCallback } from "react";
import { getCajas, type CajaFilters } from "../api/caja";
import type { CajaConAgregados, PaginatedResponse, EstadoCaja } from "../types";
import { ApiError } from "../api/client";

export function useCajas(filtros: CajaFilters = {}) {
  const { page, limit, estado, desde, hasta } = filtros;

  const [data, setData] = useState<PaginatedResponse<CajaConAgregados>>({
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
      const filters: { page?: number; limit?: number; estado?: EstadoCaja; desde?: string; hasta?: string } = {
        page, limit, estado, desde, hasta,
      };
      const res = await getCajas(filters);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar cajas");
    } finally {
      setLoading(false);
    }
  }, [page, limit, estado, desde, hasta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}
