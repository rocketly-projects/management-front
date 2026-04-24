import { create } from "zustand";
import type { Caja } from "../types";
import { getCajaActiva, abrirCaja, cerrarCaja } from "../api/caja";

interface CajaState {
  cajaActiva: Caja | null;
  loading: boolean;
  fetchActiva: () => Promise<void>;
  abrir: (montoInicial: number) => Promise<void>;
  cerrar: (montoCierre: number, notas?: string) => Promise<void>;
}

export const useCajaStore = create<CajaState>()((set) => ({
  cajaActiva: null,
  loading: false,
  fetchActiva: async () => {
    set({ loading: true });
    try {
      const caja = await getCajaActiva();
      set({ cajaActiva: caja });
    } finally {
      set({ loading: false });
    }
  },
  abrir: async (montoInicial) => {
    const caja = await abrirCaja(montoInicial);
    set({ cajaActiva: caja });
  },
  cerrar: async (montoCierre, notas) => {
    await cerrarCaja(montoCierre, notas);
    set({ cajaActiva: null });
  },
}));
