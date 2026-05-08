"use client";

import { useState } from "react";
import { createCliente, updateCliente } from "@/lib/api/clientes";
import { ApiError } from "@/lib/api/client";
import type { Cliente } from "@/lib/types";

export function ClienteFormModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Partial<Cliente>;
  onClose: () => void;
  onSaved: (c: Cliente) => void;
}) {
  const [nombre,    setNombre]    = useState(initial?.nombre ?? "");
  const [telefono,  setTelefono]  = useState(initial?.telefono ?? "");
  const [email,     setEmail]     = useState(initial?.email ?? "");
  const [direccion, setDireccion] = useState(initial?.direccion ?? "");
  const [notas,     setNotas]     = useState(initial?.notas ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit() {
    if (!nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        direccion: direccion.trim() || undefined,
        notas: notas.trim() || undefined,
      };
      const saved = mode === "create"
        ? await createCliente(payload)
        : await updateCliente(initial!.id!, payload);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar el cliente");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeSlideIn .25s ease" }}
      >
        <div className="border-b border-card-border px-6 py-5">
          <h2 className="text-[16px] font-bold text-foreground">
            {mode === "create" ? "Nuevo cliente" : "Editar cliente"}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Solo el nombre es obligatorio.
          </p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <Field label="Nombre" required>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <input
                type="text"
                value={telefono ?? ""}
                onChange={(e) => setTelefono(e.target.value)}
                className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email ?? ""}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </Field>
          </div>

          <Field label="Dirección">
            <input
              type="text"
              value={direccion ?? ""}
              onChange={(e) => setDireccion(e.target.value)}
              className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </Field>

          <Field label="Notas">
            <textarea
              value={notas ?? ""}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </Field>

          {error && <p className="text-[12.5px] font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-card-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !nombre.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
