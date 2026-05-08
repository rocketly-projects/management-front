"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useClienteCuenta } from "@/lib/hooks/useClienteCuenta";
import { deleteCliente } from "@/lib/api/clientes";
import { createPagoFiado } from "@/lib/api/pagosFiado";
import { ApiError } from "@/lib/api/client";
import type { MetodoPagoNoFiado, MovimientoCuenta } from "@/lib/types";
import { ClienteFormModal } from "./ClienteFormModal";

/* ── Config ────────────────────────────────────────────────────── */

const METODO_LABEL: Record<MetodoPagoNoFiado, string> = {
  EFECTIVO:      "Efectivo",
  DEBITO:        "Débito",
  CREDITO:       "Crédito",
  TRANSFERENCIA: "Transferencia",
  MERCADO_PAGO:  "Mercado Pago",
};

const fmt = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");

function fmtDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  );
}

function fmtVentaNum(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

/* ── Content ──────────────────────────────────────────────────── */

export function ClienteDetalleContent({
  id,
  onClose,
  onDeleted,
  onUpdated,
}: {
  id: string;
  /** When provided, renders an X close button in the header. */
  onClose?: () => void;
  /** Called after a successful deactivation. If absent, navigates to /clientes. */
  onDeleted?: () => void;
  /** Called after a successful edit so the parent list can refresh. */
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const { data, loading, error, refetch } = useClienteCuenta(id);

  const [editOpen,      setEditOpen]      = useState(false);
  const [pagoOpen,      setPagoOpen]      = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteCliente(id);
      if (onDeleted) onDeleted();
      else router.push("/clientes");
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Error al desactivar cliente");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-6">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold text-foreground">
            {data?.cliente.nombre ?? (loading ? "Cargando…" : "Cliente")}
          </h1>
          <p className="text-xs text-muted">Cuenta corriente</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-gray-50"
              >
                <IconEdit className="h-3.5 w-3.5 text-muted" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12.5px] font-semibold text-red-600 transition-colors hover:bg-red-100"
              >
                <IconTrash className="h-3.5 w-3.5" />
                Desactivar
              </button>
            </>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 p-6">

          {loading && (
            <div className="flex items-center justify-center py-20 text-sm text-muted">
              Cargando cuenta…
            </div>
          )}

          {error && !loading && (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={refetch} className="mt-2 text-xs text-accent hover:underline">
                Reintentar
              </button>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Top row: deuda hero + contact info */}
              <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>

                {/* Deuda */}
                <div className="rounded-xl border border-card-border bg-white p-5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted">
                    Deuda actual
                  </p>
                  <p
                    className={`mt-1.5 font-mono text-[34px] font-extrabold leading-none tracking-tight ${
                      data.deuda > 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {fmt(data.deuda)}
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted">
                    {data.deuda > 0 ? "Saldo pendiente" : "Cliente al día"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPagoOpen(true)}
                    disabled={data.deuda <= 0}
                    className="mt-4 w-full rounded-lg bg-accent py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Registrar pago
                  </button>
                </div>

                {/* Contact info */}
                <div className="rounded-xl border border-card-border bg-white p-5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted">
                    Datos de contacto
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <InfoItem label="Teléfono" value={data.cliente.telefono} mono />
                    <InfoItem label="Email"    value={data.cliente.email} />
                    <InfoItem label="Dirección" value={data.cliente.direccion} fullWidth />
                    {data.cliente.notas && (
                      <InfoItem label="Notas" value={data.cliente.notas} fullWidth />
                    )}
                  </div>
                </div>
              </div>

              {/* Movements */}
              <div className="overflow-hidden rounded-xl border border-card-border bg-white">
                <div className="flex items-center justify-between border-b border-card-border px-5 py-3.5">
                  <div>
                    <p className="text-[14px] font-bold text-foreground">Movimientos</p>
                    <p className="text-xs text-muted">Ventas a fiado y pagos recibidos</p>
                  </div>
                  <span className="text-[11.5px] text-muted">
                    <span className="font-bold text-foreground">{data.movimientos.length}</span>{" "}
                    {data.movimientos.length === 1 ? "movimiento" : "movimientos"}
                  </span>
                </div>

                {data.movimientos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted">
                    <p className="text-[13px] font-semibold text-foreground/40">
                      Sin movimientos todavía
                    </p>
                    <p className="text-[12px] text-muted/70">
                      Las ventas a fiado y los pagos aparecerán acá.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-card-border">
                    {data.movimientos.map((m) => (
                      <MovimientoRow key={`${m.tipo}-${m.id}`} m={m} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && data && (
        <ClienteFormModal
          mode="edit"
          initial={data.cliente}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); refetch(); onUpdated?.(); }}
        />
      )}

      {/* Pago modal */}
      {pagoOpen && data && (
        <RegistrarPagoModal
          clienteId={id}
          deuda={data.deuda}
          onClose={() => setPagoOpen(false)}
          onSaved={() => { setPagoOpen(false); refetch(); onUpdated?.(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
          onClick={() => !deleteLoading && setDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeSlideIn .25s ease" }}
          >
            <div className="px-6 py-5">
              <p className="text-[15px] font-bold text-foreground">¿Desactivar cliente?</p>
              <p className="mt-1.5 text-[13px] text-muted">
                El cliente dejará de aparecer en los listados activos. Las ventas y pagos
                históricos se conservan.
              </p>
              {deleteError && (
                <p className="mt-3 text-[12.5px] font-semibold text-red-600">{deleteError}</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-card-border px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteLoading}
                className="flex-1 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteLoading ? "Desactivando…" : "Sí, desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Movimiento row ────────────────────────────────────────────── */

function MovimientoRow({ m }: { m: MovimientoCuenta }) {
  const isVenta = m.tipo === "VENTA_FIADO";
  const isAnulada = isVenta && m.estado === "ANULADA";

  return (
    <div className="grid items-center gap-3 px-5 py-3" style={{ gridTemplateColumns: "32px 1fr 160px" }}>
      <div
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full",
          isVenta ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600",
        ].join(" ")}
      >
        {isVenta ? <IconArrowUp className="h-3.5 w-3.5" /> : <IconArrowDown className="h-3.5 w-3.5" />}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground">
          {isVenta ? (
            <>Venta a fiado <span className="font-mono text-muted">{fmtVentaNum(m.ventaNumero)}</span></>
          ) : (
            <>Pago recibido — <span className="text-muted">{METODO_LABEL[m.metodoPago]}</span></>
          )}
          {isAnulada && (
            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-600">
              Anulada
            </span>
          )}
        </p>
        <p className="text-[11.5px] text-muted">
          {fmtDate(m.fecha)}
          {!isVenta && m.notas && <> · {m.notas}</>}
        </p>
      </div>

      <div className="text-right">
        <p
          className={`font-mono text-[14px] font-bold ${
            isVenta ? "text-amber-600" : "text-emerald-600"
          } ${isAnulada ? "line-through opacity-50" : ""}`}
        >
          {isVenta ? "+" : "−"}{fmt(m.monto)}
        </p>
      </div>
    </div>
  );
}

/* ── Registrar pago modal ──────────────────────────────────────── */

function RegistrarPagoModal({
  clienteId, deuda, onClose, onSaved,
}: {
  clienteId: string;
  deuda: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [monto, setMonto]       = useState("");
  const [metodo, setMetodo]     = useState<MetodoPagoNoFiado>("EFECTIVO");
  const [notas, setNotas]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const montoNum = parseFloat(monto.replace(",", ".")) || 0;
  const valid = montoNum > 0 && montoNum <= deuda + 0.01;

  const restante = useMemo(() => Math.max(0, deuda - montoNum), [deuda, montoNum]);

  async function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPagoFiado({
        clienteId,
        monto: montoNum,
        metodoPago: metodo,
        notas: notas.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al registrar pago");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeSlideIn .25s ease" }}
      >
        <div className="border-b border-card-border px-6 py-5">
          <h2 className="text-[16px] font-bold text-foreground">Registrar pago</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Deuda actual: <span className="font-mono font-semibold text-amber-600">{fmt(deuda)}</span>
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Monto <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-muted">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  autoFocus
                  className="h-10 w-full rounded-lg border border-card-border bg-white pl-7 font-mono text-[15px] font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
              <button
                type="button"
                onClick={() => setMonto(String(deuda))}
                className="rounded-lg border border-card-border bg-white px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-gray-50 transition-colors"
              >
                Pagar todo
              </button>
            </div>
            {montoNum > 0 && (
              <p className="text-[11.5px] text-muted">
                Restante luego del pago:{" "}
                <span className={`font-mono font-semibold ${restante > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {fmt(restante)}
                </span>
              </p>
            )}
            {montoNum > deuda + 0.01 && (
              <p className="text-[11.5px] font-semibold text-red-600">
                El monto supera la deuda actual.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Método de pago
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoPagoNoFiado)}
              className="h-10 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 cursor-pointer"
            >
              {(Object.keys(METODO_LABEL) as MetodoPagoNoFiado[]).map((k) => (
                <option key={k} value={k}>{METODO_LABEL[k]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>

          {error && <p className="text-[12.5px] font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-card-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !valid}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Registrando…" : "Registrar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Info item ─────────────────────────────────────────────────── */

function InfoItem({
  label, value, mono, fullWidth,
}: {
  label: string; value: string | null; mono?: boolean; fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {value ? (
        <p className={`mt-0.5 text-[13px] text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
      ) : (
        <p className="mt-0.5 text-[13px] text-muted/50">—</p>
      )}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2.5l2.5 2.5M2.5 13.5l3-.5L13 5.5l-2.5-2.5L3 10.5l-.5 3z" />
    </svg>
  );
}
function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5h10M4.5 3.5V2.5a1 1 0 011-1h3a1 1 0 011 1v1M3 3.5l.5 8a1 1 0 001 1h5a1 1 0 001-1l.5-8" />
    </svg>
  );
}
function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}
function IconArrowUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11V3M3 7l4-4 4 4" />
    </svg>
  );
}
function IconArrowDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v8M3 7l4 4 4-4" />
    </svg>
  );
}
