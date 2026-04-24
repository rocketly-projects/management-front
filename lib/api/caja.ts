import { apiFetch } from "./client";
import type { Caja, Gasto } from "../types";

export function getCajaActiva() {
  return apiFetch<Caja | null>("/caja/activa");
}

export function abrirCaja(montoInicial: number) {
  return apiFetch<Caja>("/caja/abrir", {
    method: "POST",
    body: JSON.stringify({ montoInicial }),
  });
}

export function cerrarCaja(montoCierre: number, notas?: string) {
  return apiFetch<Caja>("/caja/cerrar", {
    method: "POST",
    body: JSON.stringify({ montoCierre, notas }),
  });
}

export function getGastos(cajaId: string) {
  return apiFetch<Gasto[]>(`/caja/${cajaId}/gastos`);
}

export function createGasto(cajaId: string, descripcion: string, monto: number) {
  return apiFetch<Gasto>(`/caja/${cajaId}/gastos`, {
    method: "POST",
    body: JSON.stringify({ descripcion, monto }),
  });
}
