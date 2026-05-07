import { apiFetch } from "./client";
import type { Cliente, ClienteConDeuda, ClienteCuenta } from "../types";

export interface ClienteFilters {
  search?: string;
  conDeuda?: boolean;
  activo?: boolean;
}

export interface CreateClientePayload {
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
}

export type UpdateClientePayload = Partial<CreateClientePayload>;

export function getClientes(filters?: ClienteFilters): Promise<Cliente[] | ClienteConDeuda[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.conDeuda !== undefined) params.set("conDeuda", String(filters.conDeuda));
  if (filters?.activo !== undefined) params.set("activo", String(filters.activo));
  const qs = params.toString();
  return apiFetch<Cliente[] | ClienteConDeuda[]>(`/clientes${qs ? `?${qs}` : ""}`);
}

export function getClientesConDeuda(filters?: Omit<ClienteFilters, "conDeuda">) {
  return getClientes({ ...filters, conDeuda: true }) as Promise<ClienteConDeuda[]>;
}

export function getCliente(id: string) {
  return apiFetch<ClienteConDeuda>(`/clientes/${id}`);
}

export function getClienteCuenta(id: string) {
  return apiFetch<ClienteCuenta>(`/clientes/${id}/cuenta`);
}

export function createCliente(data: CreateClientePayload) {
  return apiFetch<Cliente>("/clientes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCliente(id: string, data: UpdateClientePayload) {
  return apiFetch<Cliente>(`/clientes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCliente(id: string) {
  return apiFetch<{ message: string }>(`/clientes/${id}`, { method: "DELETE" });
}
