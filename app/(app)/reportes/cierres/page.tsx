"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useCajas } from "@/lib/hooks/useCajas";
import { getCajaResumen } from "@/lib/api/caja";
import { ApiError } from "@/lib/api/client";
import type { CajaConAgregados, CajaResumen, EstadoCaja, MetodoPago } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────── */

type DateRange = "hoy" | "ayer" | "semana" | "mes";

/* ── Config ────────────────────────────────────────────────────── */

const PAYMENTS: Record<MetodoPago, { label: string; color: string; bg: string }> = {
  EFECTIVO:      { label: "Efectivo",      color: "#047857", bg: "rgba(16,185,129,.12)" },
  DEBITO:        { label: "Débito",        color: "#1e40af", bg: "rgba(59,130,246,.12)" },
  CREDITO:       { label: "Crédito",       color: "#6d28d9", bg: "rgba(139,92,246,.12)" },
  TRANSFERENCIA: { label: "Transferencia", color: "#0e7490", bg: "rgba(6,182,212,.12)"  },
  MERCADO_PAGO:  { label: "Mercado Pago",  color: "#075985", bg: "rgba(14,165,233,.14)" },
  FIADO:         { label: "Fiado",         color: "#b45309", bg: "rgba(245,158,11,.12)" },
};

const ESTADO_CFG: Record<EstadoCaja, { label: string; color: string; dot: string }> = {
  ABIERTA: { label: "Abierta", color: "text-emerald-600", dot: "bg-emerald-500" },
  CERRADA: { label: "Cerrada", color: "text-muted",       dot: "bg-muted/60"    },
};

const PAGE_SIZE = 20;

/* ── Helpers ───────────────────────────────────────────────────── */

const fmt = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");

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
  return { desde: todayStart.toISOString(), hasta: todayEnd.toISOString() };
}

function fmtDateLong(iso: string) {
  const d = new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });
  return d.replace(/\./g, "");
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function durationHours(apertura: string, cierre: string | null): string {
  if (!cierre) return "—";
  const ms = new Date(cierre).getTime() - new Date(apertura).getTime();
  const hours = Math.floor(ms / 3600000);
  const mins  = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function CierresPage() {
  const [dateRange,   setDateRange]   = useState<DateRange>("semana");
  const [search,      setSearch]      = useState("");
  const [stFilter,    setStFilter]    = useState<EstadoCaja | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  const [drawerCajaId, setDrawerCajaId] = useState<string | null>(null);
  const [drawerData,   setDrawerData]   = useState<CajaResumen | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError,   setDrawerError]   = useState<string | null>(null);

  const { desde, hasta } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { data: cajas, total, loading, error, refetch } = useCajas({
    desde,
    hasta,
    page:   currentPage,
    limit:  PAGE_SIZE,
    estado: stFilter !== "all" ? stFilter : undefined,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search, stFilter, dateRange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && drawerCajaId) closeDrawer();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerCajaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!drawerCajaId) { setDrawerData(null); return; }
    setDrawerLoading(true);
    setDrawerError(null);
    getCajaResumen(drawerCajaId)
      .then(setDrawerData)
      .catch((e) => setDrawerError(e instanceof ApiError ? e.message : "Error al cargar resumen"))
      .finally(() => setDrawerLoading(false));
  }, [drawerCajaId]);

  function closeDrawer() {
    setDrawerCajaId(null);
    setDrawerData(null);
  }

  /* ── Derived ─────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cajas;
    return cajas.filter((c) => (c.notas ?? "").toLowerCase().includes(q));
  }, [cajas, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const kpis = useMemo(() => {
    const cerradas = cajas.filter((c) => c.estado === "CERRADA");
    const totalFact = cajas.reduce((s, c) => s + c.totalFacturado, 0);
    const totalGastos = cajas.reduce((s, c) => s + c.gastosTotal, 0);
    const ventasTotal = cajas.reduce((s, c) => s + c.cantVentas, 0);
    return { closedCount: cerradas.length, totalFact, totalGastos, ventasTotal };
  }, [cajas]);

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="flex h-full flex-col overflow-hidden">

      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-7">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">Cierres</h1>
          <p className="text-xs text-muted">Historial de cajas y cierres</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50">
          <IconDownload className="h-4 w-4 text-muted" />
          Exportar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-7 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Cajas cerradas" value={loading ? "…" : String(kpis.closedCount)} sub={`de ${cajas.length} en el período`} />
            <KPICard label="Facturado"      value={loading ? "…" : fmt(kpis.totalFact)}      sub={`${kpis.ventasTotal} venta${kpis.ventasTotal !== 1 ? "s" : ""}`} />
            <KPICard label="Gastos"         value={loading ? "…" : fmt(kpis.totalGastos)}    sub="Egresos del período" warn={kpis.totalGastos > 0} />
            <KPICard label="Total del período" value={loading ? "…" : String(total)}
              sub={`del ${dateRange === "hoy" ? "día" : dateRange === "ayer" ? "día de ayer" : dateRange === "semana" ? "últimos 7 días" : "último mes"}`} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-0.5 rounded-lg border border-card-border bg-gray-100/70 p-1">
              {(["hoy", "ayer", "semana", "mes"] as DateRange[]).map((d) => {
                const labels = { hoy: "Hoy", ayer: "Ayer", semana: "Semana", mes: "Mes" };
                return (
                  <button key={d} type="button" onClick={() => setDateRange(d)}
                          className={["rounded-md px-3 py-1 text-[12.5px] font-semibold transition-all",
                            dateRange === d ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground"].join(" ")}>
                    {labels[d]}
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1 max-w-xs">
              <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input ref={searchRef} type="text" placeholder="Buscar en notas…" value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="h-9 w-full rounded-lg border border-card-border bg-white pl-9 pr-12 text-[13px] text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15" />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-card-border bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
            </div>

            <select value={stFilter} onChange={(e) => setStFilter(e.target.value as EstadoCaja | "all")}
                    className="h-9 rounded-lg border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground outline-none cursor-pointer hover:border-gray-300 transition-colors">
              <option value="all">Estado: Todos</option>
              {(Object.keys(ESTADO_CFG) as EstadoCaja[]).map((k) => (
                <option key={k} value={k}>{ESTADO_CFG[k].label}</option>
              ))}
            </select>

            <span className="ml-auto text-xs text-muted">
              <span className="font-bold text-foreground">{total}</span> resultados
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-card-border bg-white">
            <div className="grid items-center gap-3 border-b border-card-border bg-gray-50/80 px-5"
                 style={{ gridTemplateColumns: "180px 1fr 120px 110px 130px 130px 44px", height: 42 }}>
              {["Apertura → Cierre", "Notas", "Duración", "Estado", "Ventas", "Facturado", ""].map((h, i) => (
                <div key={i} className={`text-[10.5px] font-bold uppercase tracking-[.08em] text-muted ${i === 5 ? "text-right" : ""}`}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted">Cargando cajas…</div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-red-600">{error}</p>
                <button onClick={refetch} className="mt-2 text-xs text-accent hover:underline">Reintentar</button>
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted">Sin resultados</div>
                ) : (
                  filtered.map((c) => <CajaRow key={c.id} caja={c} onClick={() => setDrawerCajaId(c.id)} />)
                )}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-card-border px-5 py-3 text-[12.5px] text-muted">
              <span>Página <b className="text-foreground">{currentPage}</b> de <b className="text-foreground">{totalPages}</b> · <b className="text-foreground">{total}</b> en total</span>
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
                  <button key={p} type="button" onClick={() => setCurrentPage(p)} disabled={loading}
                          className={["flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors disabled:opacity-40",
                            p === currentPage ? "border-accent bg-accent text-white" : "border-card-border bg-white text-foreground hover:bg-gray-50"].join(" ")}>
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
        </div>
      </div>

      {drawerCajaId && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]" onClick={closeDrawer} />
          <CajaDrawer data={drawerData} loading={drawerLoading} error={drawerError} onClose={closeDrawer} />
        </>
      )}
    </div>
  );
}

/* ── Caja row ──────────────────────────────────────────────────── */

function CajaRow({ caja, onClick }: { caja: CajaConAgregados; onClick: () => void }) {
  const st = ESTADO_CFG[caja.estado];
  return (
    <div className="grid cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/80"
         style={{ gridTemplateColumns: "180px 1fr 120px 110px 130px 130px 44px" }} onClick={onClick}>

      <div>
        <p className="font-mono text-[13px] font-semibold text-foreground">
          {fmtDateLong(caja.apertura)} {fmtTime(caja.apertura)}
        </p>
        <p className="text-[11.5px] text-muted">
          → {caja.cierre ? `${fmtDateLong(caja.cierre)} ${fmtTime(caja.cierre)}` : "abierta"}
        </p>
      </div>

      <div className="min-w-0">
        {caja.notas ? (
          <p className="truncate text-[13px] text-foreground/80">{caja.notas}</p>
        ) : (
          <p className="text-[13px] text-muted/50">—</p>
        )}
      </div>

      <div>
        <p className="font-mono text-[12.5px] text-muted">{durationHours(caja.apertura, caja.cierre)}</p>
      </div>

      <div>
        <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${st.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-foreground">{caja.cantVentas}</p>
        {caja.gastosTotal > 0 && (
          <p className="text-[11.5px] font-semibold text-amber-600">−{fmt(caja.gastosTotal)} gastos</p>
        )}
      </div>

      <div className="text-right">
        <p className="font-mono text-[14px] font-bold text-foreground">{fmt(caja.totalFacturado)}</p>
      </div>

      <div className="flex justify-end">
        <IconChevron className="h-4 w-4 text-muted" />
      </div>
    </div>
  );
}

/* ── Caja drawer ───────────────────────────────────────────────── */

function CajaDrawer({ data, loading, error, onClose }: {
  data: CajaResumen | null; loading: boolean; error: string | null; onClose: () => void;
}) {
  const caja = data?.caja;
  const st   = caja ? ESTADO_CFG[caja.estado] : null;
  const diff = caja && caja.montoCierre !== null
    ? caja.montoCierre - (caja.montoInicial + (data?.porMetodo.find((p) => p.metodoPago === "EFECTIVO")?.total ?? 0))
    : null;

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-[480px] flex-col border-l border-card-border bg-white shadow-2xl"
           style={{ animation: "slideLeft 0.25s cubic-bezier(.2,.8,.2,1)" }}>

      <div className="border-b border-card-border px-6 py-5">
        <div className="flex items-center gap-2.5">
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
        <h2 className="mt-2.5 text-[20px] font-bold text-foreground">
          {caja ? fmtDateLong(caja.apertura) : "…"}
        </h2>
        {caja && (
          <p className="mt-0.5 text-[13px] text-muted">
            {fmtTime(caja.apertura)}{caja.cierre ? ` → ${fmtTime(caja.cierre)}` : ""} · {durationHours(caja.apertura, caja.cierre)}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading && <div className="flex items-center justify-center py-16 text-sm text-muted">Cargando resumen…</div>}
        {error && !loading && <p className="text-sm font-semibold text-red-600">{error}</p>}
        {data && caja && !loading && (
          <div className="space-y-5">

            {/* Totales */}
            <div className="grid grid-cols-3 gap-2">
              <MiniKPI label="Facturado"   value={fmt(data.totales.totalFacturado)} />
              <MiniKPI label="Ventas"      value={String(data.totales.cantVentas)}  />
              <MiniKPI label="Promedio"    value={data.totales.cantVentas > 0 ? fmt(data.totales.ticketPromedio) : "—"} />
            </div>

            {/* Por método */}
            {data.porMetodo.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Métodos de pago</p>
                <div className="space-y-2.5 rounded-xl border border-card-border p-4">
                  {data.porMetodo.map((row) => {
                    const cfg = PAYMENTS[row.metodoPago];
                    if (!cfg) return null;
                    return (
                      <div key={row.metodoPago}>
                        <div className="mb-1 flex items-center justify-between text-[12px] font-semibold">
                          <span style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="font-mono text-foreground">{fmt(row.total)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full transition-all duration-300"
                               style={{ width: `${row.porcentaje}%`, background: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conteo de efectivo (solo si cerrada) */}
            {caja.estado === "CERRADA" && caja.montoCierre !== null && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Conteo de efectivo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-card-border p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Inicial</p>
                    <p className="mt-1 font-mono text-[15px] font-bold text-foreground">{fmt(caja.montoInicial)}</p>
                  </div>
                  <div className="rounded-xl border border-card-border p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Contado al cierre</p>
                    <p className="mt-1 font-mono text-[15px] font-bold text-foreground">{fmt(caja.montoCierre)}</p>
                  </div>
                  {diff !== null && (
                    <div className={`col-span-2 rounded-xl border p-3.5 ${diff === 0 ? "border-card-border bg-gray-50" : diff > 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Diferencia</p>
                      <p className={`mt-1 font-mono text-[15px] font-bold ${diff === 0 ? "text-foreground" : diff > 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {diff === 0 ? "Exacto" : `${diff > 0 ? "+" : ""}${fmt(diff)}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gastos */}
            {data.gastos.cantidad > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">
                  Gastos · <span className="font-mono text-amber-600">{fmt(data.gastos.total)}</span>
                </p>
                <div className="overflow-hidden rounded-xl border border-card-border">
                  {data.gastos.lista.map((g, i) => (
                    <div key={g.id}
                         className={`flex items-center justify-between px-3.5 py-2.5 text-[13px] ${i > 0 ? "border-t border-card-border" : ""}`}>
                      <span className="truncate text-foreground">{g.descripcion}</span>
                      <span className="ml-3 font-mono font-bold text-amber-600">−{fmt(g.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {caja.notas && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Notas</p>
                <p className="rounded-xl border border-card-border bg-gray-50/60 px-4 py-3 text-[13px] text-foreground/90">
                  {caja.notas}
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </aside>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────── */

function KPICard({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-white p-4">
      <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">{label}</p>
      <p className={`text-[24px] font-bold leading-none tracking-tight ${warn ? "text-amber-500" : "text-foreground"}`}>{value}</p>
      <p className="text-[12px] text-muted">{sub}</p>
    </div>
  );
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-card-border p-3.5">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-[15px] font-extrabold text-foreground">{value}</p>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */

function IconSearch({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3.5 3.5" /></svg>;
}
function IconDownload({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h10M8 2v7M5 7l3 3 3-3" /></svg>;
}
function IconX({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 4l12 12M16 4L4 16" /></svg>;
}
function IconChevron({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>;
}
