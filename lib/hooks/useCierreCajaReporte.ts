"use client";

import { useState, useEffect, useCallback } from "react";
import { getCierreCajaReporte } from "../api/reportes";
import { ApiError } from "../api/client";
import type { CierreCajaReporte } from "../types";

export function useCierreCajaReporte(cajaId: string | null) {
  const [data,    setData]    = useState<CierreCajaReporte | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!cajaId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCierreCajaReporte(cajaId);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar el reporte de cierre");
    } finally {
      setLoading(false);
    }
  }, [cajaId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
