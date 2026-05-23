import { apiFetch } from "./client";
import type { AuthResponse } from "../types";

export interface RegisterPayload {
  email: string;
  password: string;
  nombre: string;
  nombreDueno?: string;
  telefono?: string;
  direccion?: string;
  taxId?: string;
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(data: RegisterPayload) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
