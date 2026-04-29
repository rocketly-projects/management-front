"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useVentas } from "@/lib/hooks/useVentas";
import { useVentasAgregadas } from "@/lib/hooks/useVentasAgregadas";
import { getVenta, anularVenta } from "@/lib/api/ventas";
import { ApiError } from "@/lib/api/client";
import type { Venta, MetodoPago, EstadoVenta } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────── */

type DateRange = "hoy" | "ayer" | "semana" | "mes";

/* ── Config ────────────────────────────────────────────────────── */

const PAYMENTS: Record<MetodoPago, { label: string; color: string; bg: string; border: string }> = {
  EFECTIVO:      { label: "Efectivo",      color: "#047857", bg: "rgba(16,185,129,.12)", border: "rgba(16,185,129,.25)" },
  DEBITO:        { label: "Débito",        color: "#1e40af", bg: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.25)" },
  CREDITO:       { label: "Crédito",       color: "#6d28d9", bg: "rgba(139,92,246,.12)", border: "rgba(139,92,246,.25)" },
  TRANSFERENCIA: { label: "Transferencia", color: "#0e7490", bg: "rgba(6,182,212,.12)",  border: "rgba(6,182,212,.25)"  },
  MERCADO_PAGO:  { label: "Mercado Pago",  color: "#075985", bg: "rgba(14,165,233,.14)", border: "rgba(14,165,233,.30)" },
};

const STATUS: Record<EstadoVenta, { label: string; color: string; dot: string }> = {
  COMPLETADA: { label: "Completada", color: "text-emerald-600", dot: "bg-emerald-500" },
  ANULADA:    { label: "Anulada",    color: "text-red-500",     dot: "bg-red-500"     },
};

const HEATMAP_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const PAGE_SIZE = 20;

/* ── Helpers ───────────────────────────────────────────────────── */

const fmt    = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtNum = (n: number) => `#${String(n).padStart(4, "0")}`;

function getDateRange(range: DateRange): { desde: string; hasta: string } {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  if (range === "ayer") {
    const start = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    return { desde: start.toISOString(), hasta: new Date(todayStart.getTime() - 1).toISOString() };
  }
  if (range === "semana") {
    return { desde: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), hasta: todayEnd.toISOString() };
  }
  if (range === "mes") {
    return { desde: new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), hasta: todayEnd.toISOString() };
  }
  // hoy
  return { desde: todayStart.toISOString(), hasta: todayEnd.toISOString() };
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function VentasPage() {
  const [dateRange,   setDateRange]   = useState<DateRange>("hoy");
  const [search,      setSearch]      = useState("");
  const [payFilter,   setPayFilter]   = useState<MetodoPago | "all">("all");
  const [stFilter,    setStFilter]    = useState<EstadoVenta | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  // Drawer state
  const [drawerVentaId,  setDrawerVentaId]  = useState<string | null>(null);
  const [drawerData,     setDrawerData]     = useState<Venta | null>(null);
  const [drawerLoading,  setDrawerLoading]  = useState(false);
  const [drawerError,    setDrawerError]    = useState<string | null>(null);
  const [anularConfirm,  setAnularConfirm]  = useState(false);
  const [anularLoading,  setAnularLoading]  = useState(false);
  const [anularError,    setAnularError]    = useState<string | null>(null);

  const { desde, hasta } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { data: ventas, total, loading, error, refetch } = useVentas({
    desde,
    hasta,
    page:   currentPage,
    limit:  PAGE_SIZE,
    estado: stFilter !== "all" ? stFilter : undefined,
  });

  const { data: metodosData, loading: metodosLoading } = useVentasAgregadas({ desde, hasta, agrupar: "metodo" });
  const { data: horasData,   loading: horasLoading   } = useVentasAgregadas({ desde, hasta, agrupar: "hora"   });

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, payFilter, stFilter, dateRange]);


  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") {
        if (anularConfirm) { setAnularConfirm(false); return; }
        closeDrawer();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anularConfirm]);

  // Fetch drawer detail on open
  useEffect(() => {
    if (!drawerVentaId) { setDrawerData(null); return; }
    setDrawerLoading(true);
    setDrawerError(null);
    setAnularConfirm(false);
    setAnularError(null);
    getVenta(drawerVentaId)
      .then(setDrawerData)
      .catch((e) => setDrawerError(e instanceof ApiError ? e.message : "Error al cargar venta"))
      .finally(() => setDrawerLoading(false));
  }, [drawerVentaId]);

  // Anular action
  const handleAnular = useCallback(async () => {
    if (!drawerVentaId) return;
    setAnularLoading(true);
    setAnularError(null);
    try {
      await anularVenta(drawerVentaId);
      closeDrawer();
      refetch();
    } catch (e) {
      setAnularError(e instanceof ApiError ? e.message : "Error al anular venta");
    } finally {
      setAnularLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerVentaId, refetch]);

  function closeDrawer() {
    setDrawerVentaId(null);
    setDrawerData(null);
    setAnularConfirm(false);
    setAnularError(null);
  }

  /* ── Derived ─────────────────────────────────────────────── */

  // estado is now a server-side filter; only search and metodoPago remain client-side
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ventas.filter((v) => {
      if (q && !fmtNum(v.numero).toLowerCase().includes(q)) return false;
      if (payFilter !== "all" && v.metodoPago !== payFilter) return false;
      return true;
    });
  }, [ventas, search, payFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const kpis = useMemo(() => {
    const completed  = ventas.filter((v) => v.estado === "COMPLETADA");
    const anuladas   = ventas.filter((v) => v.estado === "ANULADA");
    const totalFact  = completed.reduce((s, v) => s + v.total, 0);
    const avgTicket  = completed.length ? totalFact / completed.length : 0;
    const totalAnul  = anuladas.reduce((s, v) => s + v.total, 0);
    return { totalFact, count: completed.length, avgTicket, anuladasCount: anuladas.length, totalAnul };
  }, [ventas]);


  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Page header ─────────────────────────────────────── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-7">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">Ventas</h1>
          <p className="text-xs text-muted">Historial de operaciones</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50">
          <IconDownload className="h-4 w-4 text-muted" />
          Exportar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-7 space-y-5">

          {/* ── KPIs ──────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard
              label="Facturado"
              value={loading ? "…" : fmt(kpis.totalFact)}
              sub={loading ? "—" : `${kpis.count} venta${kpis.count !== 1 ? "s" : ""} completada${kpis.count !== 1 ? "s" : ""}`}
            />
            <KPICard
              label="Ticket promedio"
              value={loading ? "…" : kpis.count > 0 ? fmt(kpis.avgTicket) : "—"}
              sub="Por venta completada"
            />
            <KPICard
              label="Anulaciones"
              value={loading ? "…" : String(kpis.anuladasCount)}
              sub={loading ? "—" : kpis.anuladasCount > 0 ? `${fmt(kpis.totalAnul)} anulados` : "Sin anulaciones"}
              warn={kpis.anuladasCount > 0}
            />
            <KPICard
              label="Total del período"
              value={loading ? "…" : String(total)}
              sub={`del ${dateRange === "hoy" ? "día" : dateRange === "ayer" ? "día de ayer" : dateRange === "semana" ? "últimos 7 días" : "último mes"}`}
            />
          </div>

          {/* ── Filters ───────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date segmented */}
            <div className="flex items-center gap-0.5 rounded-lg border border-card-border bg-gray-100/70 p-1">
              {(["hoy", "ayer", "semana", "mes"] as DateRange[]).map((d) => {
                const labels = { hoy: "Hoy", ayer: "Ayer", semana: "Semana", mes: "Mes" };
                return (
                  <button key={d} type="button" onClick={() => setDateRange(d)}
                          className={[
                            "rounded-md px-3 py-1 text-[12.5px] font-semibold transition-all",
                            dateRange === d ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground",
                          ].join(" ")}>
                    {labels[d]}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar #venta…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-card-border bg-white pl-9 pr-12 text-[13px] text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-card-border bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                ⌘K
              </kbd>
            </div>

            {/* Método */}
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value as MetodoPago | "all")}
                    className="h-9 rounded-lg border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground outline-none cursor-pointer hover:border-gray-300 transition-colors">
              <option value="all">Método: Todos</option>
              {(Object.keys(PAYMENTS) as MetodoPago[]).map((k) => (
                <option key={k} value={k}>{PAYMENTS[k].label}</option>
              ))}
            </select>

            {/* Estado */}
            <select value={stFilter} onChange={(e) => setStFilter(e.target.value as EstadoVenta | "all")}
                    className="h-9 rounded-lg border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground outline-none cursor-pointer hover:border-gray-300 transition-colors">
              <option value="all">Estado: Todos</option>
              {(Object.keys(STATUS) as EstadoVenta[]).map((k) => (
                <option key={k} value={k}>{STATUS[k].label}</option>
              ))}
            </select>

            <span className="ml-auto text-xs text-muted">
              <span className="font-bold text-foreground">{total}</span> resultados
            </span>
          </div>

          {/* ── Main grid ─────────────────────────────────────── */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>

            {/* Sales table */}
            <div className="overflow-hidden rounded-xl border border-card-border bg-white">
              {/* Table header */}
              <div className="grid items-center gap-3 border-b border-card-border bg-gray-50/80 px-5 py-0"
                   style={{ gridTemplateColumns: "150px 1fr 150px 120px 130px 44px", height: 42 }}>
                {["#Venta / Fecha", "Descuento", "Método", "Estado", "Total", ""].map((h, i) => (
                  <div key={i} className={`text-[10.5px] font-bold uppercase tracking-[.08em] text-muted ${i === 4 ? "text-right" : ""}`}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted">
                  Cargando ventas…
                </div>
              ) : error ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                  <button onClick={refetch} className="mt-2 text-xs text-accent hover:underline">
                    Reintentar
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-card-border">
                  {filtered.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted">Sin resultados</div>
                  ) : (
                    filtered.map((v) => (
                      <SaleRow key={v.id} venta={v} onClick={() => setDrawerVentaId(v.id)} />
                    ))
                  )}
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center gap-2 border-t border-card-border px-5 py-3 text-[12.5px] text-muted">
                <span>
                  Página{" "}
                  <b className="text-foreground">{currentPage}</b>{" "}
                  de{" "}
                  <b className="text-foreground">{totalPages}</b>
                  {" · "}
                  <b className="text-foreground">{total}</b> en total
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1 || loading}
                          className="flex h-7 items-center justify-center rounded-md border border-card-border bg-white px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-gray-50 disabled:opacity-40">
                    ← Ant.
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6));
                    return start + i;
                  }).map((p) => (
                    <button key={p} type="button" onClick={() => setCurrentPage(p)}
                            disabled={loading}
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors disabled:opacity-40",
                              p === currentPage
                                ? "border-accent bg-accent text-white"
                                : "border-card-border bg-white text-foreground hover:bg-gray-50",
                            ].join(" ")}>
                      {p}
                    </button>
                  ))}
                  <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages || loading}
                          className="flex h-7 items-center justify-center rounded-md border border-card-border bg-white px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-gray-50 disabled:opacity-40">
                    Sig. →
                  </button>
                </div>
              </div>
            </div>

            {/* Right side stack */}
            <div className="flex flex-col gap-4">

              {/* Payment breakdown */}
              <div className="rounded-xl border border-card-border bg-white">
                <div className="border-b border-card-border px-5 py-3.5">
                  <p className="text-[14px] font-bold text-foreground">Métodos de pago</p>
                  <p className="text-xs text-muted">Participación del período</p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  {metodosLoading ? (
                    <p className="text-xs text-muted">Cargando…</p>
                  ) : metodosData.length === 0 ? (
                    <p className="text-xs text-muted">Sin ventas en el período</p>
                  ) : (
                    metodosData.map((row) => {
                      const cfg = PAYMENTS[row.metodoPago];
                      if (!cfg) return null;
                      return (
                        <div key={row.metodoPago}>
                          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                            <span style={{ color: cfg.color }}>{cfg.label}</span>
                            <span className="font-mono text-foreground">{fmt(row.total)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full transition-all duration-300"
                                 style={{ width: `${row.porcentaje}%`, background: cfg.color }} />
                          </div>
                          <p className="mt-0.5 text-right text-[10.5px] text-muted">{row.porcentaje}%</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Heatmap */}
              <div className="rounded-xl border border-card-border bg-white">
                <div className="border-b border-card-border px-5 py-3.5">
                  <p className="text-[14px] font-bold text-foreground">Ventas por hora</p>
                  <p className="text-xs text-muted">Concentración de operaciones</p>
                </div>
                <div className="px-5 py-4">
                  {horasLoading ? (
                    <p className="text-xs text-muted">Cargando…</p>
                  ) : horasData.length === 0 ? (
                    <p className="text-xs text-muted">Sin datos en el período</p>
                  ) : (() => {
                    const horasVisible = HEATMAP_HOURS;
                    const maxCant = Math.max(...horasData.map((h) => h.cantidad), 1);
                    const byHour = Object.fromEntries(horasData.map((h) => [h.hora, h.cantidad]));
                    return (
                      <>
                        <div className="grid grid-cols-12 gap-1">
                          {horasVisible.map((h) => {
                            const cant = byHour[h] ?? 0;
                            const pct  = Math.round((cant / maxCant) * 100);
                            return (
                              <div key={h}
                                   title={`${h}h · ${cant} venta${cant !== 1 ? "s" : ""}`}
                                   className="aspect-square rounded-sm"
                                   style={{ background: `rgba(79,110,247,${Math.max(pct / 100, 0.06)})` }} />
                            );
                          })}
                        </div>
                        <div className="mt-1.5 grid grid-cols-12 gap-1">
                          {horasVisible.map((h) => (
                            <div key={h} className="text-center font-mono text-[9.5px] text-muted">{h}h</div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Detail drawer ─────────────────────────────────────── */}
      {drawerVentaId && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]" onClick={closeDrawer} />
          <SaleDrawer
            data={drawerData}
            loading={drawerLoading}
            error={drawerError}
            anularConfirm={anularConfirm}
            anularLoading={anularLoading}
            anularError={anularError}
            onClose={closeDrawer}
            onAnularRequest={() => setAnularConfirm(true)}
            onAnularConfirm={handleAnular}
            onAnularCancel={() => setAnularConfirm(false)}
          />
        </>
      )}
    </div>
  );
}

/* ── Sale row ──────────────────────────────────────────────────── */

function SaleRow({ venta, onClick }: { venta: Venta; onClick: () => void }) {
  const pay = PAYMENTS[venta.metodoPago];
  const st  = STATUS[venta.estado];

  return (
    <div className="grid cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/80"
         style={{ gridTemplateColumns: "150px 1fr 150px 120px 130px 44px" }}
         onClick={onClick}>

      {/* # + fecha */}
      <div>
        <p className="font-mono text-[13px] font-semibold text-foreground">{fmtNum(venta.numero)}</p>
        <p className="text-[11.5px] text-muted">{fmtDate(venta.creadoEn)}</p>
      </div>

      {/* Descuento */}
      <div className="min-w-0">
        {venta.descuento > 0 ? (
          <p className="text-[13px] font-semibold text-emerald-600">−{fmt(venta.descuento)}</p>
        ) : (
          <p className="text-[13px] text-muted/50">—</p>
        )}
      </div>

      {/* Método */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
              style={{ color: pay.color, background: pay.bg, borderColor: pay.border }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pay.color }} />
          {pay.label}
        </span>
      </div>

      {/* Estado */}
      <div>
        <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${st.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      {/* Total */}
      <div className="text-right">
        <p className="font-mono text-[14px] font-bold text-foreground">{fmt(venta.total)}</p>
      </div>

      {/* Menu */}
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <button type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-gray-100 hover:text-foreground">
          <IconDots className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Sale drawer ───────────────────────────────────────────────── */

function SaleDrawer({
  data, loading, error,
  anularConfirm, anularLoading, anularError,
  onClose, onAnularRequest, onAnularConfirm, onAnularCancel,
}: {
  data: Venta | null;
  loading: boolean;
  error: string | null;
  anularConfirm: boolean;
  anularLoading: boolean;
  anularError: string | null;
  onClose: () => void;
  onAnularRequest: () => void;
  onAnularConfirm: () => void;
  onAnularCancel: () => void;
}) {
  const pay = data ? PAYMENTS[data.metodoPago] : null;
  const st  = data ? STATUS[data.estado]       : null;

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-[460px] flex-col border-l border-card-border bg-white shadow-2xl"
           style={{ animation: "slideLeft 0.25s cubic-bezier(.2,.8,.2,1)" }}>

      {/* Head */}
      <div className="border-b border-card-border px-6 py-5">
        <div className="flex items-center gap-2.5">
          {pay && (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ color: pay.color, background: pay.bg, borderColor: pay.border }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: pay.color }} />
              {pay.label}
            </span>
          )}
          {st && (
            <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${st.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
          )}
          <button type="button" onClick={onClose}
                  className="ml-auto rounded-md p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <h2 className="mt-2.5 font-mono text-[22px] font-bold text-foreground">
          {data ? fmtNum(data.numero) : "…"}
        </h2>
        {data && <p className="mt-0.5 text-[13px] text-muted">{fmtDate(data.creadoEn)}</p>}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading && (
          <div className="flex items-center justify-center py-16 text-sm text-muted">
            Cargando detalle…
          </div>
        )}
        {error && !loading && (
          <p className="text-sm font-semibold text-red-600">{error}</p>
        )}
        {data && !loading && (
          <div className="space-y-5">

            {/* Items */}
            {data.items && data.items.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Artículos</p>
                <div className="overflow-hidden rounded-xl border border-card-border">
                  {data.items.map((item) => (
                    <div key={item.id}
                         className="grid items-center gap-2.5 border-b border-card-border px-3.5 py-2.5 last:border-b-0 text-[13px]"
                         style={{ gridTemplateColumns: "40px 1fr auto auto" }}>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-center font-mono text-[12px] font-semibold text-foreground">
                        {item.cantidad}×
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{item.producto?.nombre ?? "Producto"}</p>
                        {item.producto?.sku && <p className="text-[11.5px] text-muted">{item.producto.sku}</p>}
                      </div>
                      <span className="font-mono text-[12px] text-muted min-w-[72px] text-right">
                        {fmt(item.precioUnitario)}
                      </span>
                      <span className="font-mono text-[13px] font-bold text-foreground min-w-[88px] text-right">
                        {fmt(item.subtotal)}
                      </span>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-y-1.5 border-t border-dashed border-card-border px-3.5 py-3.5 text-[12.5px]">
                    <span className="text-muted">Subtotal</span>
                    <span className="text-right font-mono font-semibold text-foreground">
                      {fmt(data.total + data.descuento)}
                    </span>
                    {data.descuento > 0 && (
                      <>
                        <span className="text-muted">Descuento</span>
                        <span className="text-right font-mono font-semibold text-emerald-600">
                          −{fmt(data.descuento)}
                        </span>
                      </>
                    )}
                    <span className="text-[14px] font-bold text-foreground">Total</span>
                    <span className="text-right font-mono text-[18px] font-bold text-foreground">
                      {fmt(data.total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Detail grid */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Detalles</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Estado",  value: st?.label  ?? "—" },
                  { label: "Método",  value: pay?.label ?? "—" },
                  { label: "Total",   value: fmt(data.total) },
                  { label: "Fecha",   value: fmtDate(data.creadoEn) },
                ].map((d) => (
                  <div key={d.label} className="rounded-xl border border-card-border p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{d.label}</p>
                    <p className="mt-1 text-[13px] font-semibold text-foreground">{d.value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Actions */}
      {data && !loading && (
        <div className="flex-shrink-0 border-t border-card-border px-6 py-4">
          {anularConfirm ? (
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-foreground">¿Confirmar anulación?</p>
              <p className="text-[12px] text-muted">
                Esta acción restaura el stock de todos los artículos y no se puede deshacer.
              </p>
              {anularError && (
                <p className="text-[12px] font-semibold text-red-600">{anularError}</p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={onAnularCancel}
                        className="flex-1 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={onAnularConfirm} disabled={anularLoading}
                        className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
                  {anularLoading ? "Anulando…" : "Sí, anular"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50">
                <IconPrint className="h-4 w-4" />
                Reimprimir
              </button>
              {data.estado === "COMPLETADA" && (
                <button type="button" onClick={onAnularRequest}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
                  <IconRefund className="h-4 w-4" />
                  Anular
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────── */

function KPICard({
  label, value, sub, warn,
}: {
  label: string; value: string; sub: string; warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-white p-4">
      <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">{label}</p>
      <p className={`text-[24px] font-bold leading-none tracking-tight ${warn ? "text-amber-500" : "text-foreground"}`}>
        {value}
      </p>
      <p className="text-[12px] text-muted">{sub}</p>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3.5 3.5" />
    </svg>
  );
}
function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h10M8 2v7M5 7l3 3 3-3" />
    </svg>
  );
}
function IconDots({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 16 16">
      <circle cx="3" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}
function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  );
}
function IconPrint({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5V2h8v3M4 11H3a1 1 0 01-1-1V7a1 1 0 011-1h10a1 1 0 011 1v3a1 1 0 01-1 1h-1M4 9h8v5H4z" />
    </svg>
  );
}
function IconRefund({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8a6 6 0 106-6M2 8l2-2M2 8l2 2" />
    </svg>
  );
}
