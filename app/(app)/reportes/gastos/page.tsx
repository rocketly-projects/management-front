"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useGastosList } from "@/lib/hooks/useGastosList";
import { useCajaStore } from "@/lib/store/cajaStore";
import { createGasto } from "@/lib/api/caja";
import { ApiError } from "@/lib/api/client";
import type { GastoConCaja } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────── */

type DateRange = "hoy" | "ayer" | "semana" | "mes";

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

function fmtDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  );
}

function fmtCajaShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(/\./g, "");
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function GastosPage() {
  const { cajaActiva } = useCajaStore();

  const [dateRange,   setDateRange]   = useState<DateRange>("hoy");
  const [search,      setSearch]      = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  // Add form state
  const [formOpen,    setFormOpen]    = useState(false);
  const [desc,        setDesc]        = useState("");
  const [monto,       setMonto]       = useState("");
  const [addLoading,  setAddLoading]  = useState(false);
  const [addError,    setAddError]    = useState<string | null>(null);

  const { desde, hasta } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { data: gastos, total, monto: totalMonto, loading, error, refetch } = useGastosList({
    desde,
    hasta,
    page:  currentPage,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search, dateRange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleAdd() {
    if (!cajaActiva || !desc.trim() || !monto) return;
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await createGasto(cajaActiva.id, desc.trim(), montoNum);
      setDesc("");
      setMonto("");
      setFormOpen(false);
      await refetch();
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "Error al registrar gasto");
    } finally {
      setAddLoading(false);
    }
  }

  /* ── Derived ─────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return gastos;
    return gastos.filter((g) => g.descripcion.toLowerCase().includes(q));
  }, [gastos, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const kpis = useMemo(() => {
    const promedio = total > 0 ? totalMonto / total : 0;
    const mayor    = gastos.length > 0 ? gastos.reduce((a, b) => b.monto > a.monto ? b : a) : null;
    return { totalMonto, count: total, promedio, mayor };
  }, [gastos, total, totalMonto]);

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="flex h-full flex-col overflow-hidden">

      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-7">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">Gastos</h1>
          <p className="text-xs text-muted">Egresos registrados durante los turnos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50"
          >
            <IconDownload className="h-4 w-4 text-muted" />
            Exportar
          </button>
          <button
            type="button"
            onClick={() => { setFormOpen(true); setAddError(null); }}
            disabled={!cajaActiva}
            title={!cajaActiva ? "Necesitás una caja abierta" : undefined}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconPlus className="h-4 w-4" />
            Nuevo gasto
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-7 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Total gastos"  value={loading ? "…" : fmt(kpis.totalMonto)} sub={`${kpis.count} egreso${kpis.count !== 1 ? "s" : ""}`} warn={kpis.totalMonto > 0} />
            <KPICard label="Promedio"      value={loading ? "…" : kpis.count > 0 ? fmt(kpis.promedio) : "—"} sub="Por gasto" />
            <KPICard label="Mayor egreso"  value={loading ? "…" : kpis.mayor ? fmt(kpis.mayor.monto) : "—"} sub={kpis.mayor ? kpis.mayor.descripcion : "Sin gastos"} />
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
              <input ref={searchRef} type="text" placeholder="Buscar descripción…" value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="h-9 w-full rounded-lg border border-card-border bg-white pl-9 pr-12 text-[13px] text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15" />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-card-border bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
            </div>

            <span className="ml-auto text-xs text-muted">
              <span className="font-bold text-foreground">{total}</span> resultados
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-card-border bg-white">
            <div className="grid items-center gap-3 border-b border-card-border bg-gray-50/80 px-5"
                 style={{ gridTemplateColumns: "1fr 130px 140px 130px", height: 42 }}>
              {["Descripción", "Caja", "Fecha y hora", "Monto"].map((h, i) => (
                <div key={i} className={`text-[10.5px] font-bold uppercase tracking-[.08em] text-muted ${i === 3 ? "text-right" : ""}`}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted">Cargando gastos…</div>
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
                  filtered.map((g) => <GastoRow key={g.id} gasto={g} />)
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

      {/* Add gasto modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
             onClick={() => !addLoading && setFormOpen(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
               onClick={(e) => e.stopPropagation()}
               style={{ animation: "fadeSlideIn .2s ease" }}>
            <div className="border-b border-card-border px-6 py-5">
              <h2 className="text-[16px] font-bold text-foreground">Nuevo gasto</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">Se registrará en la caja activa.</p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
                  Descripción
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                  placeholder="Ej: Bolsas, limpieza, insumos…"
                  className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-muted">$</span>
                  <input
                    type="number" min={0} value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="0"
                    className="h-9 w-full rounded-lg border border-card-border bg-white pl-7 font-mono text-[13px] font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </div>
              </div>
              {addError && <p className="text-[12.5px] font-semibold text-red-600">{addError}</p>}
            </div>
            <div className="flex gap-2 border-t border-card-border px-6 py-4">
              <button type="button" onClick={() => setFormOpen(false)} disabled={addLoading}
                      className="flex-1 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleAdd} disabled={addLoading || !desc.trim() || !monto}
                      className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                {addLoading ? "Registrando…" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Gasto row ─────────────────────────────────────────────────── */

function GastoRow({ gasto }: { gasto: GastoConCaja }) {
  return (
    <div className="grid items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/40"
         style={{ gridTemplateColumns: "1fr 130px 140px 130px" }}>
      <p className="truncate text-[13.5px] font-semibold text-foreground">{gasto.descripcion}</p>
      <p className="text-[12.5px] text-muted">Caja · {fmtCajaShort(gasto.cajaApertura)}</p>
      <p className="font-mono text-[12.5px] text-muted">{fmtDate(gasto.creadoEn)}</p>
      <p className="text-right font-mono text-[14px] font-bold text-amber-600">−{fmt(gasto.monto)}</p>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────── */

function KPICard({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-white p-4">
      <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">{label}</p>
      <p className={`text-[24px] font-bold leading-none tracking-tight ${warn ? "text-amber-600" : "text-foreground"}`}>{value}</p>
      <p className="truncate text-[12px] text-muted">{sub}</p>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */

function IconSearch({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3.5 3.5" /></svg>;
}
function IconPlus({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>;
}
function IconDownload({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h10M8 2v7M5 7l3 3 3-3" /></svg>;
}
