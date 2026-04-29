"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useCajaStore }       from "@/lib/store/cajaStore";
import { useAuthStore }       from "@/lib/store/authStore";
import { useProductosStore }  from "@/lib/store/productosStore";
import { useDashboardReporte } from "@/lib/hooks/useDashboardReporte";
import type { DashboardData } from "@/lib/hooks/useDashboardReporte";

/* ── Config ────────────────────────────────────────────────────── */

const CHART_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const QUICK_ACTIONS = [
  { icon: IconBox,   title: "Cargar producto",      desc: "Agregá stock al catálogo",  href: "/productos"   },
  { icon: IconLock,  title: "Hacer cierre de caja", desc: "Cerrar el turno actual",    href: "/cierre-caja" },
  { icon: IconChart, title: "Ver historial",         desc: "Ventas del período actual", href: "/ventas"      },
];

/* ── Helpers ───────────────────────────────────────────────────── */

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

function formatGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatDate() {
  const d = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function fmtDelta(delta: number): { label: string; up: boolean } | null {
  if (delta === 0) return null;
  const rounded = Math.round(delta);
  return { label: `${rounded >= 0 ? "+" : ""}${rounded}% vs. ayer`, up: rounded >= 0 };
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { cajaActiva, loading: cajaLoading } = useCajaStore();
  const { perfil }                           = useAuthStore();
  const { productos, fetch: fetchProductos } = useProductosStore();

  // Fecha en formato YYYY-MM-DD (lo que espera el backend)
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { data: reporte, loading, error, isEmpty, refetch } = useDashboardReporte(today);

  // Cargar productos si no están (para alertas de stock)
  useEffect(() => {
    if (productos.length === 0) fetchProductos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Chart data: fill empty hours ────────────────────────────── */
  const chartData = useMemo(() => {
    const map: Record<number, number> = {};
    reporte?.ventasPorHora.forEach((v) => { map[v.hora] = v.total; });
    return CHART_HOURS.map((h) => ({ hour: `${h}h`, value: map[h] ?? 0 }));
  }, [reporte]);

  /* ── Alertas de stock desde productosStore ────────────────────── */
  const alertas = useMemo(() => {
    const result: { id: number; color: "red" | "amber"; title: string; desc: string }[] = [];
    let id = 0;
    productos.filter((p) => p.activo).forEach((p) => {
      if (p.stock === 0) {
        result.push({ id: id++, color: "red",   title: "Sin stock",  desc: p.nombre });
      } else if (p.stockAlert !== null && p.stock <= p.stockAlert) {
        result.push({ id: id++, color: "amber", title: "Stock bajo", desc: `${p.nombre} — ${p.stock} ud${p.stock !== 1 ? "s" : ""}` });
      }
    });
    return result;
  }, [productos]);

  const firstName = perfil?.nombreDueno?.split(" ")[0] ?? "—";

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-8">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            {formatGreeting()}, {firstName}
          </p>
          <p className="text-xs text-muted">{formatDate()}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {!cajaLoading && (
            cajaActiva ? (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11.5px] font-semibold text-emerald-700">Caja abierta</span>
              </div>
            ) : (
              <Link href="/caja"
                    className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 hover:bg-amber-100 transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="text-[11.5px] font-semibold text-amber-700">Caja cerrada</span>
              </Link>
            )
          )}

          <button type="button" aria-label="Notificaciones"
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-gray-100 hover:text-foreground">
            <IconBell className="h-5 w-5" />
            {alertas.length > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-white" />
            )}
          </button>

          <Link href="/caja"
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            <span className="text-base leading-none">+</span>
            Nueva venta
          </Link>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={refetch} className="text-xs text-accent hover:underline">Reintentar</button>
          </div>
        ) : (
          <div className="space-y-6">

            {/* KPI Cards */}
            {isEmpty && (
              <div className="rounded-xl border border-card-border bg-amber-50 px-5 py-3 text-[13px] font-medium text-amber-700">
                Sin actividad registrada hoy — abrí una caja para comenzar a vender.
              </div>
            )}
            <div className="grid grid-cols-4 gap-4">
              <KPICard
                label="Ventas de hoy"
                value={loading ? "…" : isEmpty ? "—" : fmt(reporte?.totalFacturado ?? 0)}
                delta={reporte ? fmtDelta(reporte.deltas.totalFacturado) : null}
                delay={0}
              />
              <KPICard
                label="Cantidad de ventas"
                value={loading ? "…" : isEmpty ? "—" : String(reporte?.cantVentas ?? 0)}
                delta={reporte ? fmtDelta(reporte.deltas.cantVentas) : null}
                delay={60}
              />
              <KPICard
                label="Ticket promedio"
                value={loading ? "…" : isEmpty ? "—" : reporte?.cantVentas ? fmt(reporte.ticketPromedio) : "—"}
                delta={reporte ? fmtDelta(reporte.deltas.ticketPromedio) : null}
                delay={120}
              />
              <KPICard
                label="Productos vendidos"
                value={loading ? "…" : isEmpty ? "—" : String(reporte?.productosVendidos ?? 0)}
                delta={null}
                sub={isEmpty ? "sin datos hoy" : "unidades hoy"}
                delay={180}
              />
            </div>

            {/* Chart + Quick actions */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 340px" }}>
              <SectionCard
                title="Ventas de hoy"
                subtitle="Por franja horaria · en pesos"
                action={{ label: "Ver historial", href: "/ventas" }}
              >
                <SalesChart data={chartData} loading={loading} />
              </SectionCard>

              <div className="flex flex-col gap-3">
                {QUICK_ACTIONS.map(({ icon: Icon, title, desc, href }) => (
                  <Link key={href} href={href}
                        className="group flex items-center gap-4 rounded-xl border border-card-border bg-white p-4 transition-shadow hover:shadow-sm">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent transition-colors group-hover:bg-accent/15">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-xs text-muted">{desc}</p>
                    </div>
                    <IconChevronRight className="h-4 w-4 flex-shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Top productos + Alertas */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <SectionCard
                title="Top productos hoy"
                subtitle="Por unidades vendidas"
                action={{ label: "Ver catálogo", href: "/productos" }}
              >
                <TopProductos
                  items={reporte?.topProductos ?? []}
                  loading={loading}
                />
              </SectionCard>

              <SectionCard
                title="Alertas de stock"
                subtitle={alertas.length > 0
                  ? `${alertas.length} pendiente${alertas.length !== 1 ? "s" : ""}`
                  : "Todo en orden"}
              >
                <AlertsList alertas={alertas} />
              </SectionCard>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────── */

function KPICard({
  label, value, delta, sub, warn, delay,
}: {
  label: string;
  value: string;
  delta: { label: string; up: boolean } | null;
  sub?: string;
  warn?: boolean;
  delay: number;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-white p-5"
         style={{ animation: `fadeSlideIn 0.35s ease both`, animationDelay: `${delay}ms` }}>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`mt-2 text-[28px] font-extrabold leading-none tracking-tight ${warn ? "text-amber-500" : "text-foreground"}`}>
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {delta ? (
          <>
            {delta.up
              ? <IconTrendUp className="h-3.5 w-3.5 text-emerald-500" />
              : <IconTrendDown className="h-3.5 w-3.5 text-red-500" />}
            <span className={`text-[12px] font-semibold ${delta.up ? "text-emerald-600" : "text-red-500"}`}>
              {delta.label}
            </span>
          </>
        ) : sub ? (
          <span className="text-[12px] text-muted">{sub}</span>
        ) : (
          <span className="text-[12px] text-muted/40">—</span>
        )}
      </div>
    </div>
  );
}

/* ── Sales Chart ───────────────────────────────────────────────── */

function SalesChart({
  data, loading,
}: {
  data: { hour: string; value: number }[];
  loading: boolean;
}) {
  const currentHour = new Date().getHours();
  const max  = Math.max(...data.map((d) => d.value), 1);

  const chartH = 160;
  const chartW = 560;
  const padL   = 52;
  const padB   = 28;
  const padT   = 10;
  const padR   = 8;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const barW   = (innerW / data.length) * 0.55;
  const barGap = innerW / data.length;

  const rawStep   = max / 3;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const step      = Math.ceil(rawStep / magnitude) * magnitude;
  const yTicks    = [0, step, step * 2, step * 3].filter((t) => t <= max * 1.1);

  function fmtTick(n: number) {
    if (n === 0) return "0";
    if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return `$${n}`;
  }

  if (loading) {
    return (
      <div className="mt-2 flex items-center justify-center" style={{ height: 180 }}>
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: 180 }}>
        {yTicks.map((tick) => {
          const y = padT + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#8892b0" fontFamily="inherit">
                {fmtTick(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barH   = (d.value / max) * innerH;
          const x      = padL + i * barGap + (barGap - barW) / 2;
          const y      = padT + innerH - barH;
          const active = CHART_HOURS[i] === currentHour;
          return (
            <g key={d.hour}>
              <rect
                x={x} y={d.value > 0 ? y : padT + innerH - 2}
                width={barW} height={d.value > 0 ? barH : 2}
                rx={4}
                fill={active ? "rgba(79,110,247,1)" : "rgba(79,110,247,0.18)"}
              />
              <text
                x={x + barW / 2} y={chartH - 6}
                textAnchor="middle" fontSize={10}
                fill={active ? "#4f6ef7" : "#8892b0"}
                fontWeight={active ? 700 : 400}
                fontFamily="inherit"
              >
                {d.hour}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Top Productos ─────────────────────────────────────────────── */

function TopProductos({
  items, loading,
}: {
  items: DashboardData["topProductos"];
  loading: boolean;
}) {
  if (loading) return <div className="mt-3 text-sm text-muted">Cargando…</div>;
  if (items.length === 0) {
    return (
      <div className="mt-4 py-4 text-center text-sm text-muted">Sin ventas hoy</div>
    );
  }
  const maxUnits = items[0].unidades;
  return (
    <div className="mt-1 flex flex-col gap-3">
      {items.map((p, i) => (
        <div key={p.productoId} className="flex items-center gap-3">
          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${i === 0 ? "bg-accent text-white" : "bg-gray-100 text-muted"}`}>
            {i + 1}
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="truncate text-[13px] font-semibold text-foreground">{p.nombre}</span>
              <span className="ml-2 flex-shrink-0 text-xs font-bold text-muted">{p.unidades} uds</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-accent/40"
                     style={{ width: `${(p.unidades / maxUnits) * 100}%` }} />
              </div>
              <span className="w-20 text-right font-mono text-[11px] text-muted">{fmt(p.total)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Alertas ────────────────────────────────────────────────────── */

const DOT_COLORS = { red: "bg-red-500", amber: "bg-amber-400" } as const;

function AlertsList({
  alertas,
}: {
  alertas: { id: number; color: keyof typeof DOT_COLORS; title: string; desc: string }[];
}) {
  if (alertas.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-3xl">✅</span>
        <p className="text-sm font-medium text-muted">Sin alertas de stock</p>
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-2.5">
      {alertas.slice(0, 5).map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-lg border border-card-border bg-white p-3.5">
          <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${DOT_COLORS[a.color]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground">{a.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{a.desc}</p>
          </div>
        </div>
      ))}
      {alertas.length > 5 && (
        <Link href="/productos" className="text-center text-xs font-semibold text-accent hover:underline">
          Ver {alertas.length - 5} más en el catálogo
        </Link>
      )}
    </div>
  );
}

/* ── Section Card ──────────────────────────────────────────────── */

function SectionCard({
  title, subtitle, action, children,
}: {
  title: string; subtitle?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[14px] font-bold text-foreground">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="text-xs font-semibold text-accent hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.6}>
      <path d="M10 2a6 6 0 00-6 6v2.586l-1.707 1.707A1 1 0 003 14h14a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16a2 2 0 004 0" strokeLinecap="round" />
    </svg>
  );
}
function IconTrendUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10l4-4 3 3 5-6" />
    </svg>
  );
}
function IconTrendDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4l4 4 3-3 5 6" />
    </svg>
  );
}
function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 5L8 2 2.5 5v6l5.5 3 5.5-3V5z" /><path d="M8 2v13M2.5 5l5.5 3 5.5-3" />
    </svg>
  );
}
function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7.5" width="10" height="7" rx="1.5" /><path d="M5 7.5V5a3 3 0 016 0v2.5" />
    </svg>
  );
}
function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l3.5-4 3 2.5L12 5l2 2" /><path d="M2 14h12" />
    </svg>
  );
}
function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}
