"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useClientes } from "@/lib/hooks/useClientes";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Cliente, ClienteConDeuda } from "@/lib/types";
import { ClienteFormModal } from "./_components/ClienteFormModal";
import { ClienteDetalleContent } from "./_components/ClienteDetalleContent";

/* ── Types ─────────────────────────────────────────────────────── */

type DeudaFilter = "all" | "conDeuda" | "alDia";

const PAGE_SIZE = 20;

/* ── Helpers ───────────────────────────────────────────────────── */

const fmt = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");

function hasDeuda(c: Cliente | ClienteConDeuda): c is ClienteConDeuda {
  return "deuda" in c && typeof (c as ClienteConDeuda).deuda === "number";
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function ClientesPage() {
  const [search,      setSearch]      = useState("");
  const [deudaFilter, setDeudaFilter] = useState<DeudaFilter>("all");
  const [createOpen,  setCreateOpen]  = useState(false);
  const [detailId,    setDetailId]    = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, loading, error, refetch } = useClientes({
    search: debouncedSearch || undefined,
    conDeuda: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search, deudaFilter]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && detailId) {
        setDetailId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId]);

  /* ── Derived ─────────────────────────────────────────────── */

  const clientesConDeuda = useMemo(
    () => data.filter(hasDeuda) as ClienteConDeuda[],
    [data]
  );

  const filtered = useMemo(() => {
    if (deudaFilter === "all") return clientesConDeuda;
    if (deudaFilter === "conDeuda") return clientesConDeuda.filter((c) => c.deuda > 0);
    return clientesConDeuda.filter((c) => c.deuda <= 0);
  }, [clientesConDeuda, deudaFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const kpis = useMemo(() => {
    const debtors = clientesConDeuda.filter((c) => c.deuda > 0);
    const totalDeuda = debtors.reduce((s, c) => s + c.deuda, 0);
    const mayor = debtors.length > 0
      ? debtors.reduce((a, b) => b.deuda > a.deuda ? b : a)
      : null;
    return { totalDeuda, debtorsCount: debtors.length, total: clientesConDeuda.length, mayor };
  }, [clientesConDeuda]);

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="flex h-full flex-col overflow-hidden">

      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-7">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">Clientes</h1>
          <p className="text-xs text-muted">Cuenta corriente y fiado</p>
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
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <IconPlus className="h-4 w-4" />
            Nuevo cliente
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-7 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard
              label="Total adeudado"
              value={loading ? "…" : fmt(kpis.totalDeuda)}
              sub={kpis.debtorsCount > 0
                ? `${kpis.debtorsCount} ${kpis.debtorsCount === 1 ? "deudor activo" : "deudores activos"}`
                : "Sin deuda activa"}
              warn={kpis.totalDeuda > 0}
            />
            <KPICard
              label="Deudores"
              value={loading ? "…" : String(kpis.debtorsCount)}
              sub="Con saldo pendiente"
            />
            <KPICard
              label="Clientes activos"
              value={loading ? "…" : String(kpis.total)}
              sub="Total registrados"
            />
            <KPICard
              label="Mayor deuda"
              value={loading ? "…" : kpis.mayor ? fmt(kpis.mayor.deuda) : "—"}
              sub={kpis.mayor ? kpis.mayor.nombre : "Sin deudores"}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-0.5 rounded-lg border border-card-border bg-gray-100/70 p-1">
              {([
                { k: "all",      label: "Todos"     },
                { k: "conDeuda", label: "Con deuda" },
                { k: "alDia",    label: "Al día"    },
              ] as const).map(({ k, label }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDeudaFilter(k)}
                  className={[
                    "rounded-md px-3 py-1 text-[12.5px] font-semibold transition-all",
                    deudaFilter === k ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar por nombre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-card-border bg-white pl-9 pr-12 text-[13px] text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-card-border bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
            </div>

            <span className="ml-auto text-xs text-muted">
              <span className="font-bold text-foreground">{filtered.length}</span> resultados
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-card-border bg-white">
            <div
              className="grid items-center gap-3 border-b border-card-border bg-gray-50/80 px-5"
              style={{ gridTemplateColumns: "1.5fr 1fr 160px 44px", height: 42 }}
            >
              {["Nombre", "Contacto", "Deuda", ""].map((h, i) => (
                <div
                  key={i}
                  className={`text-[10.5px] font-bold uppercase tracking-[.08em] text-muted ${i === 2 ? "text-right" : ""}`}
                >
                  {h}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted">
                Cargando clientes…
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-red-600">{error}</p>
                <button onClick={refetch} className="mt-2 text-xs text-accent hover:underline">
                  Reintentar
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-card-border">
                  <IconUsers className="h-7 w-7 text-muted/40" />
                </div>
                <p className="text-[14px] font-semibold text-foreground/40">
                  {search ? "Sin resultados" : "Aún no tenés clientes"}
                </p>
                {!search && (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    Crear el primero
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {paged.map((c) => (
                  <ClienteRow key={c.id} cliente={c} onOpen={() => setDetailId(c.id)} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="flex items-center gap-2 border-t border-card-border px-5 py-3 text-[12.5px] text-muted">
                <span>
                  Página <b className="text-foreground">{currentPage}</b> de <b className="text-foreground">{totalPages}</b> · <b className="text-foreground">{filtered.length}</b> en total
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex h-7 items-center justify-center rounded-md border border-card-border bg-white px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-gray-50 disabled:opacity-40">
                    ← Ant.
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6));
                    return start + i;
                  }).map((p) => (
                    <button key={p} type="button" onClick={() => setCurrentPage(p)}
                            className={["flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                              p === currentPage ? "border-accent bg-accent text-white" : "border-card-border bg-white text-foreground hover:bg-gray-50"].join(" ")}>
                      {p}
                    </button>
                  ))}
                  <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="flex h-7 items-center justify-center rounded-md border border-card-border bg-white px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-gray-50 disabled:opacity-40">
                    Sig. →
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <ClienteFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => { setCreateOpen(false); refetch(); }}
        />
      )}

      {/* Detail drawer */}
      {detailId && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]" onClick={() => setDetailId(null)} />
          <aside
            className="fixed right-0 top-0 z-40 flex h-full w-[520px] flex-col border-l border-card-border bg-white shadow-2xl"
            style={{ animation: "slideLeft 0.25s cubic-bezier(.2,.8,.2,1)" }}
          >
            <ClienteDetalleContent
              id={detailId}
              onClose={() => setDetailId(null)}
              onDeleted={() => { setDetailId(null); refetch(); }}
              onUpdated={() => refetch()}
            />
          </aside>
        </>
      )}
    </div>
  );
}

/* ── Cliente row ───────────────────────────────────────────────── */

function ClienteRow({ cliente, onOpen }: { cliente: ClienteConDeuda; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50/80"
      style={{ gridTemplateColumns: "1.5fr 1fr 160px 44px" }}
    >
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold text-foreground">{cliente.nombre}</p>
        {cliente.notas && (
          <p className="truncate text-[11.5px] text-muted">{cliente.notas}</p>
        )}
      </div>

      <div className="min-w-0">
        {cliente.telefono ? (
          <p className="truncate font-mono text-[12.5px] text-foreground">{cliente.telefono}</p>
        ) : cliente.email ? (
          <p className="truncate text-[12.5px] text-muted">{cliente.email}</p>
        ) : (
          <p className="text-[12.5px] text-muted/50">—</p>
        )}
      </div>

      <div className="text-right">
        {cliente.deuda > 0 ? (
          <p className="font-mono text-[14px] font-bold text-amber-600">{fmt(cliente.deuda)}</p>
        ) : (
          <p className="font-mono text-[13px] text-muted/60">—</p>
        )}
      </div>

      <div className="flex justify-end text-muted">
        <IconChevron className="h-4 w-4" />
      </div>
    </button>
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
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3.5 3.5" />
    </svg>
  );
}
function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
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
function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5" />
      <path d="M16 9a3 3 0 100-6M17 19c0-2.2 1.5-4 4-4" />
    </svg>
  );
}
