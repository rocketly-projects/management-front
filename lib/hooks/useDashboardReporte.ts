"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardReporte } from "../api/reportes";
import { ApiError } from "../api/client";
import type { DashboardReporte } from "../types";

export function useDashboardReporte(fecha?: string) {
  const [data,    setData]    = useState<DashboardReporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardReporte(fecha);
      setData({
        hoy: res?.hoy ?? {
          totalFact: 0, cantVentas: 0, ticketPromedio: 0,
          anuladasCount: 0, totalAnulado: 0,
        },
        ayer: res?.ayer ?? {
          totalFact: 0, cantVentas: 0, ticketPromedio: 0, anuladasCount: 0,
        },
        ventasPorHora: res?.ventasPorHora ?? [],
        topProductos:  res?.topProductos  ?? [],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
