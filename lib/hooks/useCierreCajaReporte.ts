"use client";

import { useState, useEffect, useCallback } from "react";
import { getCierreCajaReporte } from "../api/reportes";
import { ApiError } from "../api/client";
import type { CierreCajaReporte, MetodoPago } from "../types";

export interface CierreCajaData {
  totales: {
    totalFact: number;
    cantVentas: number;
    ticketPromedio: number;
    anuladasCount: number;
    totalAnulado: number;
  };
  porMetodo: Array<{ metodoPago: MetodoPago; total: number; cantidad: number; porcentaje: number }>;
  topProductos: Array<{ productoId: string; nombre: string; cantidad: number; total: number }>;
  comparativoSemanal: {
    dias: Array<{ fecha: string; total: number }>;
    totalSemana: number;
    promedio: number;
  };
  gastos: { total: number; cantidad: number };
}

function transform(raw: CierreCajaReporte): CierreCajaData {
  const totalSemana = raw.comparativoSemanal.reduce((s, d) => s + d.total, 0);
  const promedio = raw.comparativoSemanal.length > 0
    ? Math.round(totalSemana / raw.comparativoSemanal.length)
    : 0;

  return {
    totales: {
      totalFact:    raw.totales.totalFacturado,
      cantVentas:   raw.totales.cantidadVentas,
      ticketPromedio: raw.totales.ticketPromedio,
      anuladasCount: 0,
      totalAnulado:  0,
    },
    porMetodo: raw.desglosePagos.map((d) => ({
      metodoPago: d.metodo,
      total:      d.monto,
      cantidad:   d.cantidad,
      porcentaje: d.porcentaje,
    })),
    topProductos: raw.topProductos,
    comparativoSemanal: {
      dias: raw.comparativoSemanal.map((d) => ({ fecha: d.fecha, total: d.total })),
      totalSemana,
      promedio,
    },
    gastos: raw.gastos,
  };
}

export function useCierreCajaReporte(cajaId: string | null) {
  const [data,    setData]    = useState<CierreCajaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!cajaId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCierreCajaReporte(cajaId);
      setData(res ? transform(res) : null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar el reporte de cierre");
    } finally {
      setLoading(false);
    }
  }, [cajaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
