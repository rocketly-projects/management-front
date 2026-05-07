"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardReporte } from "../api/reportes";
import { ApiError } from "../api/client";
import type { DashboardReporte } from "../types";

export interface DashboardData {
  totalFacturado: number;
  cantVentas: number;
  ticketPromedio: number;
  productosVendidos: number;
  deltas: {
    totalFacturado: number;
    cantVentas: number;
    ticketPromedio: number;
  };
  ventasPorHora: Array<{ hora: number; total: number; cantidad: number }>;
  topProductos: Array<{ productoId: string; nombre: string; unidades: number; total: number }>;
}

function transform(raw: DashboardReporte): DashboardData {
  const k = raw.kpis;
  return {
    totalFacturado: k.totalFacturado.valor,
    cantVentas: k.cantidadVentas.valor,
    ticketPromedio: k.ticketPromedio.valor,
    productosVendidos: k.productosVendidos.valor,
    deltas: {
      totalFacturado: k.totalFacturado.deltaVsAyer,
      cantVentas: k.cantidadVentas.deltaVsAyer,
      ticketPromedio: k.ticketPromedio.deltaVsAyer,
    },
    ventasPorHora: raw.ventasPorHora,
    topProductos: raw.topProductos.map((p) => ({
      productoId: p.productoId,
      nombre: p.nombre,
      unidades: p.cantidad,
      total: p.total,
    })),
  };
}

export function useDashboardReporte(fecha?: string) {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardReporte(fecha);
      if (res) {
        setData(transform(res));
      } else {
        setData(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  const isEmpty = !loading && !error && data === null;
  return { data, loading, error, isEmpty, refetch: fetch };
}
