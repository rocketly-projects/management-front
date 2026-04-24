"use client";

import { useState, useEffect, useCallback } from "react";
import { getVentasAgregadas } from "../api/reportes";
import { ApiError } from "../api/client";
import type { EstadoVenta, VentasAgregadasHora, VentasAgregadasDia, VentasAgregadasMetodo } from "../types";

type Agrupar = "hora" | "dia" | "metodo";
type ResultMap = {
  hora:   VentasAgregadasHora[];
  dia:    VentasAgregadasDia[];
  metodo: VentasAgregadasMetodo[];
};

interface Params<A extends Agrupar> {
  desde: string;
  hasta: string;
  agrupar: A;
  estado?: EstadoVenta;
}

export function useVentasAgregadas<A extends Agrupar>(params: Params<A>) {
  const [data,    setData]    = useState<ResultMap[A]>([] as ResultMap[A]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const key = JSON.stringify(params);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (getVentasAgregadas as any)(params);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar datos agregados");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
