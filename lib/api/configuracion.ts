import { apiFetch } from "./client";
import type { Configuracion } from "../types";

export function getConfiguracion() {
  return apiFetch<Configuracion>("/configuracion");
}

export function updateConfiguracion(data: Partial<Configuracion>) {
  return apiFetch<Configuracion>("/configuracion", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
