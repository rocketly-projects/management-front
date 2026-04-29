"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCajaStore } from "@/lib/store/cajaStore";
import { useCierreCajaReporte } from "@/lib/hooks/useCierreCajaReporte";
import { ApiError } from "@/lib/api/client";
import type { MetodoPago } from "@/lib/types";

/* ── Config ────────────────────────────────────────────────────── */

const PAYMENTS: Record<MetodoPago, { label: string; color: string; bg: string; abbr: string }> = {
  EFECTIVO:      { label: "Efectivo",      color: "#1a6b3a", bg: "#e6f7ee", abbr: "EF" },
  DEBITO:        { label: "Débito",        color: "#1a4a7a", bg: "#e6eef7", abbr: "DB" },
  CREDITO:       { label: "Crédito",       color: "#5a3a8a", bg: "#f0eafa", abbr: "CR" },
  TRANSFERENCIA: { label: "Transferencia", color: "#6a4a1a", bg: "#faf0e0", abbr: "TR" },
  MERCADO_PAGO:  { label: "Mercado Pago",  color: "#0055ff", bg: "#e6ecff", abbr: "MP" },
};

/* ── Helpers ───────────────────────────────────────────────────── */

const fmt  = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
const fmtK = (n: number) => n >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : fmt(n);

function fmtCajaDate(iso: string) {
  const d = new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function CierreCajaPage() {
  const router = useRouter();
  const { cajaActiva, loading: cajaLoading, cerrar } = useCajaStore();

  const [cashCounted,  setCashCounted]  = useState("");
  const [note,         setNote]         = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError,   setCloseError]   = useState<string | null>(null);
  const [closed,       setClosed]       = useState(false);

  const { data: reporte, loading: reporteLoading } = useCierreCajaReporte(cajaActiva?.id ?? null);

  const totales     = reporte?.totales;
  const efectivoRow = reporte?.porMetodo.find((r) => r.metodoPago === "EFECTIVO");
  const efectivoAmt = efectivoRow?.total ?? 0;

  const cashNum  = parseFloat(cashCounted) || null;
  const cashDiff = cashNum !== null ? cashNum - efectivoAmt : null;

  /* ── Close action ────────────────────────────────────────── */

  async function handleCerrar() {
    setCloseLoading(true);
    setCloseError(null);
    try {
      await cerrar(cashNum ?? 0, note || undefined);
      setClosed(true);
    } catch (e) {
      setCloseError(e instanceof ApiError ? e.message : "Error al cerrar la caja");
    } finally {
      setCloseLoading(false);
    }
  }

  /* ── Guard: no caja abierta ──────────────────────────────── */

  if (!cajaLoading && !cajaActiva) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <IconLock className="h-6 w-6 text-muted" />
          </div>
          <p className="text-[15px] font-bold text-foreground">No hay caja abierta</p>
          <p className="text-sm text-muted">Abrí una caja desde el POS antes de hacer el cierre.</p>
          <Link href="/caja"
                className="mt-2 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
            Ir al POS
          </Link>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */

  const loading = cajaLoading || reporteLoading;

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-8">
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-foreground">Cierre de caja</h1>
          <p className="text-[12px] font-medium text-muted">
            {cajaActiva ? fmtCajaDate(cajaActiva.apertura) : "—"}
            {!loading && totales && ` · ${totales.cantVentas} venta${totales.cantVentas !== 1 ? "s" : ""} procesada${totales.cantVentas !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11.5px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Caja abierta
          </div>
          <Link href="/caja"
                className="flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-gray-50">
            <IconRegister className="h-3.5 w-3.5 text-muted" />
            Ir a caja
          </Link>
        </div>
      </header>

      {/* ── Scrollable content ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] space-y-5 px-8 py-7">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <KPICard
              label="Total facturado"
              value={loading ? "…" : fmt(totales?.totalFact ?? 0)}
              sub={loading ? "—" : `${totales?.cantVentas ?? 0} ventas completadas`}
              accent
            />
            <KPICard
              label="Ticket promedio"
              value={loading ? "…" : (totales?.cantVentas ?? 0) > 0 ? fmt(totales?.ticketPromedio ?? 0) : "—"}
              sub="Por venta completada"
            />
            <KPICard
              label="Anulaciones"
              value={loading ? "…" : String(totales?.anuladasCount ?? 0)}
              sub={loading ? "—" : (totales?.anuladasCount ?? 0) > 0 ? `${fmt(totales?.totalAnulado ?? 0)} anulados` : "Sin anulaciones"}
              warn={(totales?.anuladasCount ?? 0) > 0}
            />
            <KPICard
              label="Efectivo en caja"
              value={loading ? "…" : fmt(efectivoAmt)}
              sub={loading ? "—" : `${efectivoRow?.cantidad ?? 0} cobros en efectivo`}
            />
          </div>

          {/* Payment methods + Anulaciones */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "3fr 2fr" }}>

            {/* Payment breakdown */}
            <div className="overflow-hidden rounded-xl border border-card-border bg-white">
              <div className="border-b border-card-border px-5 py-4">
                <p className="text-[13px] font-extrabold text-foreground">Desglose por método de pago</p>
                <p className="text-xs text-muted">
                  {loading ? "Cargando…" : `Total: ${fmt(stats.totalFact)}`}
                </p>
              </div>
              <div>
                {loading ? (
                  <div className="px-5 py-6 text-sm text-muted">Cargando…</div>
                ) : !reporte || reporte.porMetodo.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-muted">Sin ventas en esta caja</div>
                ) : (
                  reporte.porMetodo.map((row) => {
                    const cfg = PAYMENTS[row.metodoPago];
                    if (!cfg) return null;
                    const totalFact = totales?.totalFact ?? 0;
                    const pct = totalFact > 0 ? Math.round((row.total / totalFact) * 100) : 0;
                    return (
                      <div key={row.metodoPago} className="flex items-center gap-3 border-b border-card-border/60 px-5 py-3 last:border-b-0">
                        <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg"
                             style={{ background: cfg.bg }}>
                          <span className="text-[10px] font-extrabold" style={{ color: cfg.color }}>{cfg.abbr}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-bold text-foreground">{cfg.label}</p>
                          <p className="text-[11.5px] text-muted">{row.cantidad} venta{row.cantidad !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="h-1.5 w-[90px] overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width: `${pct}%`, background: cfg.color + "99" }} />
                        </div>
                        <span className="w-9 text-right text-[11px] font-bold text-muted">{pct}%</span>
                        <span className="min-w-[80px] text-right font-mono text-[14px] font-extrabold text-foreground">
                          {fmt(row.total)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Anulaciones card */}
            <div className="overflow-hidden rounded-xl border border-card-border bg-white">
              <div className="border-b border-card-border px-5 py-4">
                <p className="text-[13px] font-extrabold text-foreground">Anulaciones</p>
                <p className="text-xs text-muted">Ventas revertidas en la jornada</p>
              </div>
              {loading ? (
                <div className="px-5 py-6 text-sm text-muted">Cargando…</div>
              ) : (totales?.anuladasCount ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-5 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                    <IconCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">Sin anulaciones</p>
                  <p className="text-xs text-muted">Ninguna venta fue revertida</p>
                </div>
              ) : (
                <div className="space-y-1 px-5 py-5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[.04em] text-muted">Cantidad</p>
                    <p className="font-mono text-[22px] font-extrabold text-red-500">{totales!.anuladasCount}</p>
                  </div>
                  <div className="h-px bg-card-border" />
                  <div className="flex items-baseline justify-between pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-[.04em] text-muted">Total anulado</p>
                    <p className="font-mono text-[16px] font-extrabold text-red-400">{fmt(totales!.totalAnulado)}</p>
                  </div>
                  <p className="pt-2 text-[11.5px] text-muted">
                    El stock de los productos anulados fue restaurado automáticamente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly chart */}
          <div className="overflow-hidden rounded-xl border border-card-border bg-white">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <div>
                <p className="text-[13px] font-extrabold text-foreground">Comparación con los últimos 7 días</p>
                <p className="text-xs text-muted">
                  {reporte
                    ? `Total semana: ${fmt(reporte.comparativoSemanal.totalSemana)} · Promedio: ${fmt(reporte.comparativoSemanal.promedio)}`
                    : "Cargando…"}
                </p>
              </div>
            </div>
            <WeekChart dias={reporte?.comparativoSemanal.dias ?? []} loading={loading} />
          </div>

          {/* Cash count */}
          <div className="overflow-hidden rounded-xl border border-card-border bg-white">
            <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
              <div>
                <p className="text-[13px] font-extrabold text-foreground">Conteo de efectivo</p>
                <p className="text-xs text-muted">Comparación entre el efectivo contado y lo que registra el sistema</p>
              </div>
              {cashDiff !== null && <DiffBadge diff={cashDiff} />}
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-3 gap-4">
                <CashBox
                  label="Sistema registra"
                  value={loading ? "…" : fmt(efectivoAmt)}
                  sub={loading ? "—" : `${efectivoRow?.cantidad ?? 0} cobros en efectivo`}
                  valueClass="text-foreground"
                />
                <CashBox
                  label="Contado en caja"
                  value={cashNum !== null ? fmt(cashNum) : undefined}
                  sub="Ingresá el total contado"
                  valueClass={cashNum !== null ? (cashDiff! >= 0 ? "text-emerald-600" : "text-red-500") : "text-muted"}
                  borderColor={cashNum !== null ? (cashDiff! >= 0 ? "border-emerald-300" : "border-red-300") : undefined}
                  placeholder="Ingresá el monto"
                />
                <CashBox
                  label="Diferencia"
                  value={cashDiff === null ? "—" : cashDiff === 0 ? "Exacto" : `${cashDiff > 0 ? "+" : ""}${fmt(cashDiff)}`}
                  sub={cashDiff === null ? "Ingresá el monto arriba" : cashDiff > 0 ? "Sobrante en caja" : cashDiff < 0 ? "Faltante a justificar" : "Caja cuadrada"}
                  valueClass={cashDiff === null ? "text-muted" : cashDiff > 0 ? "text-emerald-600" : cashDiff < 0 ? "text-red-500" : "text-foreground"}
                  bg={cashDiff === null ? undefined : cashDiff > 0 ? "bg-emerald-50" : cashDiff < 0 ? "bg-red-50" : "bg-gray-50"}
                  borderColor={cashDiff === null ? undefined : cashDiff > 0 ? "border-emerald-200" : cashDiff < 0 ? "border-red-200" : "border-gray-200"}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11.5px] font-bold uppercase tracking-[.04em] text-foreground/60">
                  ¿Cuánto contaste en la caja?
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={cashCounted}
                    onChange={(e) => setCashCounted(e.target.value)}
                    placeholder={loading ? "0" : String(Math.round(efectivoAmt))}
                    className="h-[52px] max-w-[240px] rounded-xl border-2 border-card-border bg-white px-4 font-mono text-[22px] font-extrabold text-foreground outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,110,247,.12)]"
                  />
                  {cashDiff !== null && <DiffBadge diff={cashDiff} large />}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11.5px] font-bold uppercase tracking-[.04em] text-foreground/60">
                  Observaciones del cierre{" "}
                  <span className="font-medium normal-case tracking-normal text-muted">(opcional)</span>
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Ej: Faltante por cambio de $500 que quedó pendiente con el cliente de la tarde…"
                  className="w-full resize-none rounded-xl border border-card-border bg-white px-4 py-3 text-[13px] font-medium text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Close CTA */}
          <div className="flex items-center justify-between rounded-xl border border-card-border bg-white px-6 py-5">
            <div>
              <p className="text-[15px] font-extrabold tracking-tight text-foreground">
                Cerrar la caja del día
              </p>
              <p className="mt-1 text-[13px] font-medium text-muted">
                Esta acción registra el resumen definitivo de la jornada. No se podrán agregar más ventas al turno actual.
              </p>
              {closeError && (
                <p className="mt-1.5 text-[13px] font-semibold text-red-600">{closeError}</p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2.5">
              <button type="button"
                      className="flex items-center gap-1.5 rounded-[9px] border border-card-border bg-white px-[18px] py-[11px] text-[13.5px] font-bold text-foreground transition-colors hover:bg-gray-50">
                <IconPrint className="h-[14px] w-[14px] text-muted" />
                Imprimir reporte
              </button>
              <button
                type="button"
                disabled={closeLoading || loading}
                onClick={handleCerrar}
                className="flex items-center gap-2 rounded-[9px] bg-sidebar px-6 py-3 text-[14px] font-extrabold text-white transition-colors hover:bg-sidebar-dark disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: "0 3px 12px rgba(26,31,46,.3)" }}
              >
                <IconLock className="h-[15px] w-[15px]" />
                {closeLoading ? "Cerrando…" : "Cerrar caja del día"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Success modal ────────────────────────────────────── */}
      {closed && (
        <ClosedModal
          totalFact={totales?.totalFact ?? 0}
          count={totales?.cantVentas ?? 0}
          avgTicket={totales?.ticketPromedio ?? 0}
          efectivoAmt={efectivoAmt}
          cashDiff={cashDiff ?? 0}
          onDone={() => router.push("/dashboard")}
        />
      )}
    </div>
  );
}

/* ── Weekly chart ──────────────────────────────────────────────── */

const DAY_LABELS: Record<number, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };

function WeekChart({ dias, loading }: { dias: Array<{ fecha: string; total: number }>; loading: boolean }) {
  if (loading || dias.length === 0) {
    return <div className="px-5 py-6 text-sm text-muted">{loading ? "Cargando…" : "Sin datos"}</div>;
  }

  const todayIdx = dias.length - 1;
  const promedio = Math.round(dias.reduce((s, d) => s + d.total, 0) / dias.length);
  const allBars  = [
    ...dias.map((d, i) => ({
      label:   DAY_LABELS[new Date(d.fecha).getDay()] ?? d.fecha.slice(5),
      amount:  d.total,
      isToday: i === todayIdx,
    })),
    { label: "Prom.", amount: promedio, isAvg: true },
  ];
  const maxVal = Math.max(...allBars.map((d) => d.amount)) * 1.12 || 1;

  return (
    <div className="px-5 pb-5 pt-4">
      <div className="flex h-[80px] items-end gap-2.5">
        {allBars.map((d, i) => {
          const h       = Math.round(((d.amount || 0) / maxVal) * 72);
          const isToday = (d as { isToday?: boolean }).isToday;
          const isAvg   = (d as { isAvg?: boolean }).isAvg;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="whitespace-nowrap font-mono text-[9.5px] font-bold text-muted">
                {fmtK(d.amount)}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: h,
                  background: isToday ? "#4f6ef7" : isAvg ? "transparent" : "rgba(79,110,247,.25)",
                  border: isAvg ? "1.5px dashed rgba(79,110,247,.5)" : undefined,
                  borderBottom: isAvg ? "none" : undefined,
                }}
              />
              <span className={`text-[10.5px] font-semibold ${isToday ? "font-extrabold text-accent" : "text-muted"}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3.5">
        {[
          { color: "#4f6ef7",              label: "Hoy"            },
          { color: "rgba(79,110,247,.25)", label: "Últimos 7 días" },
          { color: "transparent",          label: "Promedio", dashed: true },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <div className="h-[6px] w-[10px] rounded-sm"
                 style={{ background: l.color, border: (l as { dashed?: boolean }).dashed ? "1.5px dashed rgba(79,110,247,.5)" : undefined }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────── */

function KPICard({
  label, value, sub, accent, warn,
}: {
  label: string; value: string; sub: string; accent?: boolean; warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-white px-5 py-[18px]">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[.05em] text-muted">{label}</p>
      <p className={`text-[28px] font-extrabold leading-none tracking-tight ${accent ? "text-accent" : warn ? "text-amber-500" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-muted">{sub}</p>
    </div>
  );
}

/* ── Cash box ──────────────────────────────────────────────────── */

function CashBox({
  label, value, sub, valueClass, bg, borderColor, placeholder,
}: {
  label: string; value?: string; sub: string;
  valueClass?: string; bg?: string; borderColor?: string; placeholder?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border-[1.5px] p-4 ${bg ?? ""} ${borderColor ?? "border-card-border"}`}>
      <p className="text-[11px] font-bold uppercase tracking-[.04em] text-muted">{label}</p>
      <p className={`text-[26px] font-extrabold leading-none tracking-tight ${valueClass}`}>
        {value ?? <span className="text-[16px] font-semibold text-muted/60">{placeholder}</span>}
      </p>
      <p className="text-[11.5px] font-medium text-muted">{sub}</p>
    </div>
  );
}

/* ── Diff badge ────────────────────────────────────────────────── */

function DiffBadge({ diff, large }: { diff: number; large?: boolean }) {
  const base = large
    ? "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-extrabold"
    : "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold";

  if (diff === 0) return (
    <div className={`${base} bg-gray-100 text-gray-600`}>
      <IconCheck className="h-4 w-4" /> Sin diferencia
    </div>
  );
  if (diff > 0) return (
    <div className={`${base} bg-emerald-50 text-emerald-700`}>
      <IconTrendUp className="h-4 w-4" /> Sobrante: {fmt(diff)}
    </div>
  );
  return (
    <div className={`${base} bg-red-50 text-red-600`}>
      <IconAlert className="h-4 w-4" /> Faltante: {fmt(Math.abs(diff))}
    </div>
  );
}

/* ── Closed modal ──────────────────────────────────────────────── */

function ClosedModal({
  totalFact, count, avgTicket, efectivoAmt, cashDiff, onDone,
}: {
  totalFact: number; count: number; avgTicket: number;
  efectivoAmt: number; cashDiff: number; onDone: () => void;
}) {
  const rows = [
    { label: "Total facturado",    value: fmt(totalFact) },
    { label: "Cantidad de ventas", value: String(count)  },
    { label: "Efectivo en caja",   value: fmt(efectivoAmt) },
    ...(cashDiff !== 0 ? [{
      label: "Diferencia de caja",
      value: `${cashDiff > 0 ? "+" : ""}${fmt(cashDiff)}`,
      color: cashDiff > 0 ? "text-emerald-600" : "text-red-500",
    }] : []),
    { label: "Ticket promedio", value: fmt(avgTicket), bold: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px]"
         style={{ animation: "fadeSlideIn .15s ease" }}>
      <div className="w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl"
           style={{ animation: "scaleIn .18s ease" }}>

        <div className="px-7 py-7">
          <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-sidebar">
            <IconLock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-[18px] font-extrabold tracking-tight text-foreground">Caja cerrada</h2>
          <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-muted">
            La jornada fue registrada y cerrada correctamente.
          </p>

          <div className="mt-4 space-y-2 rounded-xl bg-main-bg px-4 py-3.5">
            {rows.map((row, i) => (
              <div key={i}>
                {(row as { bold?: boolean }).bold && <div className="my-1 h-px bg-card-border" />}
                <div className="flex justify-between">
                  <span className={`text-[12.5px] font-medium ${"color" in row ? row.color : "text-muted"}`}>
                    {row.label}
                  </span>
                  <span className={`text-[13px] font-bold ${"color" in row ? row.color : "text-foreground"}`}>
                    {row.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-card-border px-6 py-4">
          <button type="button"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-card-border bg-white py-2.5 text-[13.5px] font-bold text-foreground transition-colors hover:bg-gray-50">
            <IconPrint className="h-3.5 w-3.5" />
            Imprimir reporte
          </button>
          <button type="button" onClick={onDone}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-[9px] bg-sidebar py-2.5 text-[14px] font-extrabold text-white transition-colors hover:bg-sidebar-dark">
            <IconCheck className="h-4 w-4" />
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */

function IconRegister({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v4H3zM3 7v14h18V7M8 12h8M8 16h5" />
    </svg>
  );
}
function IconTrendUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10l3.5-4L7 8l4.5-5.5" />
    </svg>
  );
}
function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="11" rx="2" />
      <path d="M17 11V7a5 5 0 00-10 0v4" />
    </svg>
  );
}
function IconPrint({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5V2h8v3M4 11H3a1 1 0 01-1-1V7a1 1 0 011-1h10a1 1 0 011 1v3a1 1 0 01-1 1h-1M4 9h8v5H4z" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5l4 4L13.5 4" />
    </svg>
  );
}
function IconAlert({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.5L1.5 13.5h13L8 2.5zM8 7v3M8 11.5h.01" />
    </svg>
  );
}
