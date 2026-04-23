"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Mock data ─────────────────────────────────────────────────── */

const KPI_DATA = [
  { label: "Ventas de hoy",        value: "$84.320", delta: "+12%", deltaLabel: "vs. ayer", up: true  },
  { label: "Cantidad de ventas",   value: "47",       delta: "+5",   deltaLabel: "vs. ayer", up: true  },
  { label: "Ticket promedio",      value: "$1.794",   delta: "-3%",  deltaLabel: "vs. ayer", up: false },
  { label: "Productos vendidos",   value: "138",      delta: "+21",  deltaLabel: "vs. ayer", up: true  },
];

// Hourly sales: 8h–15h
const CHART_DATA = [
  { hour: "8h",  value: 3200  },
  { hour: "9h",  value: 8100  },
  { hour: "10h", value: 12400 },
  { hour: "11h", value: 9800  },
  { hour: "12h", value: 15200 },
  { hour: "13h", value: 18600 },
  { hour: "14h", value: 11400 },
  { hour: "15h", value: 5620  },
];
const CHART_CURRENT_HOUR = 5; // 13h index

const TOP_PRODUCTS = [
  { rank: 1, name: "Coca-Cola 500ml",       category: "Bebidas",  units: 23 },
  { rank: 2, name: "Agua mineral 500ml",    category: "Bebidas",  units: 18 },
  { rank: 3, name: "Alfajor Havanna",       category: "Golosinas",units: 15 },
  { rank: 4, name: "Cigarrillos Marlboro",  category: "Tabaco",   units: 12 },
  { rank: 5, name: "Pan lactal Bimbo",      category: "Almacén",  units: 9  },
];

const ALERTS_INITIAL = [
  { id: 1, type: "stock",  color: "red",   title: "Stock crítico",  desc: "Coca-Cola 500ml — 3 unidades",     tag: "Stock"  },
  { id: 2, type: "stock",  color: "amber", title: "Stock bajo",     desc: "Yerba Mate 500g — 1 unidad",       tag: "Stock"  },
  { id: 3, type: "precio", color: "blue",  title: "Sin precio",     desc: "2 productos sin precio asignado",  tag: "Precio" },
];

const QUICK_ACTIONS = [
  { icon: IconBox,    title: "Cargar producto",      desc: "Agregá stock al catálogo",       href: "/productos" },
  { icon: IconLock,   title: "Hacer cierre de caja", desc: "Cerrar el turno actual",          href: "/cierre-caja" },
  { icon: IconChart,  title: "Ver reportes",          desc: "Historial de ventas del día",    href: "/ventas" },
];

/* ── Helpers ───────────────────────────────────────────────────── */

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

/* ── Page ─────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const alerts = ALERTS_INITIAL.filter((a) => !dismissed.includes(a.id));

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-8">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            {formatGreeting()}, Diego
          </p>
          <p className="text-xs text-muted">{formatDate()}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Caja status pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11.5px] font-semibold text-emerald-700">Caja abierta</span>
          </div>

          {/* Bell */}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-gray-100 hover:text-foreground"
            aria-label="Notificaciones"
          >
            <IconBell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-white" />
          </button>

          {/* Nueva venta */}
          <Link
            href="/caja"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            Nueva venta
          </Link>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {KPI_DATA.map((kpi, i) => (
              <KPICard key={kpi.label} {...kpi} delay={i * 60} />
            ))}
          </div>

          {/* Grid: Chart + Quick actions */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 340px" }}>
            {/* Sales chart */}
            <SectionCard
              title="Ventas de hoy"
              subtitle="Por franja horaria · en pesos"
              action={{ label: "Ver detalle", href: "/ventas" }}
            >
              <SalesChart />
            </SectionCard>

            {/* Quick actions */}
            <div className="flex flex-col gap-3">
              {QUICK_ACTIONS.map(({ icon: Icon, title, desc, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-4 rounded-xl border border-card-border bg-white p-4 transition-shadow hover:shadow-sm"
                >
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

          {/* Grid: Top productos + Alertas */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {/* Top productos */}
            <SectionCard
              title="Top productos hoy"
              subtitle="Por unidades vendidas"
              action={{ label: "Ver catálogo", href: "/productos" }}
            >
              <TopProducts />
            </SectionCard>

            {/* Alertas */}
            <SectionCard
              title="Alertas"
              subtitle={`${alerts.length} pendiente${alerts.length !== 1 ? "s" : ""}`}
            >
              <AlertsList
                alerts={alerts}
                onDismiss={(id) => setDismissed((d) => [...d, id])}
              />
            </SectionCard>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────── */

function KPICard({
  label, value, delta, deltaLabel, up, delay,
}: {
  label: string; value: string; delta: string;
  deltaLabel: string; up: boolean; delay: number;
}) {
  return (
    <div
      className="rounded-xl border border-card-border bg-white p-5"
      style={{ animation: `fadeSlideIn 0.35s ease both`, animationDelay: `${delay}ms` }}
    >
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-foreground">
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {up ? (
          <IconTrendUp className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <IconTrendDown className="h-3.5 w-3.5 text-red-500" />
        )}
        <span className={`text-[12px] font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
          {delta}
        </span>
        <span className="text-[12px] text-muted">{deltaLabel}</span>
      </div>
    </div>
  );
}

/* ── Sales Chart ───────────────────────────────────────────────── */

function SalesChart() {
  const max       = Math.max(...CHART_DATA.map((d) => d.value));
  const yTicks    = [0, 5000, 10000, 15000, 20000];
  const chartH    = 160;
  const chartW    = 560;
  const padL      = 48;
  const padB      = 28;
  const padT      = 10;
  const padR      = 8;
  const innerW    = chartW - padL - padR;
  const innerH    = chartH - padT - padB;
  const barW      = (innerW / CHART_DATA.length) * 0.55;
  const barGap    = innerW / CHART_DATA.length;

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        style={{ height: 180 }}
      >
        {/* Grid lines + Y labels */}
        {yTicks.map((tick) => {
          const y = padT + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line
                x1={padL} y1={y}
                x2={chartW - padR} y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#8892b0"
                fontFamily="inherit"
              >
                {tick === 0 ? "0" : `$${tick / 1000}k`}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {CHART_DATA.map((d, i) => {
          const barH   = (d.value / max) * innerH;
          const x      = padL + i * barGap + (barGap - barW) / 2;
          const y      = padT + innerH - barH;
          const active = i === CHART_CURRENT_HOUR;
          return (
            <g key={d.hour}>
              <rect
                x={x} y={y}
                width={barW} height={barH}
                rx={4}
                fill={active ? "rgba(79,110,247,1)" : "rgba(79,110,247,0.18)"}
              />
              {/* X label */}
              <text
                x={x + barW / 2}
                y={chartH - 6}
                textAnchor="middle"
                fontSize={10}
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

/* ── Top Products ──────────────────────────────────────────────── */

function TopProducts() {
  const maxUnits = TOP_PRODUCTS[0].units;
  return (
    <div className="mt-1 flex flex-col gap-3">
      {TOP_PRODUCTS.map((p) => (
        <div key={p.rank} className="flex items-center gap-3">
          {/* Rank */}
          <span
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
              p.rank === 1
                ? "bg-accent text-white"
                : "bg-gray-100 text-muted"
            }`}
          >
            {p.rank}
          </span>

          {/* Name + bar */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="truncate text-[13px] font-semibold text-foreground">
                {p.name}
              </span>
              <span className="ml-2 flex-shrink-0 text-xs font-bold text-muted">
                {p.units} uds
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-accent/40"
                  style={{ width: `${(p.units / maxUnits) * 100}%` }}
                />
              </div>
              <span className="w-16 text-right text-[11px] text-muted">{p.category}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Alerts ────────────────────────────────────────────────────── */

const DOT_COLORS: Record<string, string> = {
  red:   "bg-red-500",
  amber: "bg-amber-400",
  blue:  "bg-blue-400",
};
const TAG_COLORS: Record<string, string> = {
  Stock:  "bg-red-50 text-red-600",
  Precio: "bg-blue-50 text-blue-600",
};

function AlertsList({
  alerts,
  onDismiss,
}: {
  alerts: typeof ALERTS_INITIAL;
  onDismiss: (id: number) => void;
}) {
  if (alerts.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-3xl">✅</span>
        <p className="text-sm font-medium text-muted">Sin alertas pendientes</p>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-2.5">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-lg border border-card-border bg-white p-3.5"
        >
          <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${DOT_COLORS[a.color]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground">{a.title}</p>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${TAG_COLORS[a.tag]}`}>
                {a.tag}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{a.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(a.id)}
            className="flex-shrink-0 text-muted hover:text-foreground transition-colors"
            aria-label="Descartar alerta"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Section Card wrapper ──────────────────────────────────────── */

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
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
      <path d="M13.5 5L8 2 2.5 5v6l5.5 3 5.5-3V5z" />
      <path d="M8 2v13M2.5 5l5.5 3 5.5-3" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7.5" width="10" height="7" rx="1.5" />
      <path d="M5 7.5V5a3 3 0 016 0v2.5" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l3.5-4 3 2.5L12 5l2 2" />
      <path d="M2 14h12" />
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

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}
