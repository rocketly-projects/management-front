import { apiFetch } from "./client";
import type { Perfil } from "../types";

export function getPerfil() {
  return apiFetch<Perfil>("/perfil");
}

export function updatePerfil(data: Partial<Perfil>) {
  return apiFetch<Perfil>("/perfil", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
