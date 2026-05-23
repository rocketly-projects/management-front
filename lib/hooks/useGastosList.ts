"use client";

import { useState, useEffect, useCallback } from "react";
import { getAllGastos, type GastosFilters } from "../api/gastos";
import type { GastoConCaja } from "../types";
import { ApiError } from "../api/client";

interface State {
  data: GastoConCaja[];
  total: number;
  page: number;
  limit: number;
  monto: number;
}

export function useGastosList(filtros: GastosFilters = {}) {
  const { page, limit, cajaId, desde, hasta } = filtros;

  const [state, setState] = useState<State>({
    data: [], total: 0, page: 1, limit: 20, monto: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllGastos({ page, limit, cajaId, desde, hasta });
      setState({
        data:  res.data,
        total: res.total,
        page:  res.page,
        limit: res.limit,
        monto: res.monto,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar gastos");
    } finally {
      setLoading(false);
    }
  }, [page, limit, cajaId, desde, hasta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { ...state, loading, error, refetch: fetch };
}
