"use client";

import { useState, useEffect, useCallback } from "react";
import { getClienteCuenta } from "../api/clientes";
import type { ClienteCuenta } from "../types";
import { ApiError } from "../api/client";

export function useClienteCuenta(id: string | null) {
  const [data, setData] = useState<ClienteCuenta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await getClienteCuenta(id);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cargar la cuenta");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
