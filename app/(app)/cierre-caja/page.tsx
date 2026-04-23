"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Mock data ─────────────────────────────────────────────────── */

const TODAY = {
  totalVentas:      84320,
  cantVentas:       47,
  ticketPromedio:   1794,
  productosVendidos:138,
  methods: [
    { id:"efectivo",      label:"Efectivo",      color:"#1a6b3a", bg:"#e6f7ee", amount:38200, count:21 },
    { id:"debito",        label:"Débito",         color:"#1a4a7a", bg:"#e6eef7", amount:18450, count:10 },
    { id:"mercadopago",   label:"Mercado Pago",   color:"#0055ff", bg:"#e6ecff", amount:15870, count:9  },
    { id:"transferencia", label:"Transferencia",  color:"#6a4a1a", bg:"#faf0e0", amount:7800,  count:5  },
    { id:"credito",       label:"Crédito",        color:"#5a3a8a", bg:"#f0eafa", amount:4000,  count:2  },
  ],
  topProducts: [
    { name:"Coca-Cola 500ml",       cat:"Bebidas",   units:23, revenue:19550 },
    { name:"Agua mineral 500ml",    cat:"Bebidas",   units:18, revenue:7560  },
    { name:"Alfajor Havanna x1",    cat:"Golosinas", units:15, revenue:18000 },
    { name:"Cigarrillos Marlboro",  cat:"Tabaco",    units:12, revenue:30000 },
    { name:"Pan lactal Bimbo",      cat:"Almacén",   units:9,  revenue:10350 },
  ],
};

const WEEK = [
  { day:"Lun", amount:72400  },
  { day:"Mar", amount:91200  },
  { day:"Mié", amount:65800  },
  { day:"Jue", amount:88500  },
  { day:"Vie", amount:105200 },
  { day:"Sáb", amount:119600 },
  { day:"Dom", amount:58300  },
];
const PREV_AVG  = Math.round(WEEK.reduce((s, d) => s + d.amount, 0) / WEEK.length);
const ALL_WEEK  = [...WEEK, { day:"Hoy", amount:TODAY.totalVentas, isToday:true }];
const PCT_VS_AVG = Math.round(((TODAY.totalVentas - PREV_AVG) / PREV_AVG) * 100);
const TOTAL_METHODS = TODAY.methods.reduce((s, m) => s + m.amount, 0);

/* ── Helpers ───────────────────────────────────────────────────── */

const fmt  = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
const fmtK = (n: number) => n >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : fmt(n);

/* ── KPI data ──────────────────────────────────────────────────── */

const KPIS = [
  { label:"Total facturado",    value: fmt(TODAY.totalVentas),       delta:`${PCT_VS_AVG >= 0 ? "+" : ""}${PCT_VS_AVG}%`, deltaLabel:"vs. promedio semanal", up: PCT_VS_AVG >= 0, accent:true  },
  { label:"Cantidad de ventas", value: String(TODAY.cantVentas),     delta:"+5",   deltaLabel:"vs. ayer", up:true  },
  { label:"Ticket promedio",    value: fmt(TODAY.ticketPromedio),    delta:"−3%",  deltaLabel:"vs. ayer", up:false },
  { label:"Productos vendidos", value: String(TODAY.productosVendidos), delta:"+21", deltaLabel:"vs. ayer", up:true  },
];

/* ── Page ─────────────────────────────────────────────────────── */

export default function CierreCajaPage() {
  const [cashCounted, setCashCounted] = useState("");
  const [note,        setNote]        = useState("");
  const [closed,      setClosed]      = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(true);

  const systemCash = TODAY.methods[0].amount;
  const cashNum    = parseFloat(cashCounted) || null;
  const cashDiff   = cashNum !== null ? cashNum - systemCash : null;

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-8">
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-foreground">Cierre de caja</h1>
          <p className="text-[12px] font-medium text-muted">
            Lunes 21 de abril de 2026 · {TODAY.cantVentas} ventas procesadas
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {cajaAbierta ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11.5px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Caja abierta
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[11.5px] font-bold text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              Caja cerrada
            </div>
          )}
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
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-xl border border-card-border bg-white px-5 py-[18px]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[.05em] text-muted">{k.label}</p>
                <p className={`text-[28px] font-extrabold leading-none tracking-tight ${k.accent ? "text-accent" : "text-foreground"}`}>
                  {k.value}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {k.up ? <IconTrendUp className="h-3 w-3 text-emerald-500" /> : <IconTrendDown className="h-3 w-3 text-red-500" />}
                  <span className={`text-[12px] font-semibold ${k.up ? "text-emerald-600" : "text-red-500"}`}>{k.delta}</span>
                  <span className="text-[12px] font-medium text-muted">{k.deltaLabel}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment methods + Top products */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "3fr 2fr" }}>

            {/* Payment methods breakdown */}
            <div className="overflow-hidden rounded-xl border border-card-border bg-white">
              <div className="flex items-start justify-between border-b border-card-border px-5 py-4">
                <div>
                  <p className="text-[13px] font-extrabold text-foreground">Desglose por método de pago</p>
                  <p className="text-xs text-muted">Total: {fmt(TOTAL_METHODS)}</p>
                </div>
              </div>
              <div>
                {TODAY.methods.map((m) => {
                  const pct = Math.round((m.amount / TOTAL_METHODS) * 100);
                  return (
                    <div key={m.id} className="flex items-center gap-3 border-b border-card-border/60 px-5 py-3 last:border-b-0">
                      <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg"
                           style={{ background: m.bg }}>
                        <span className="text-[10px] font-extrabold" style={{ color: m.color }}>
                          {m.label.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-foreground">{m.label}</p>
                        <p className="text-[11.5px] text-muted">{m.count} ventas</p>
                      </div>
                      <div className="h-1.5 w-[90px] overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full transition-all duration-500"
                             style={{ width:`${pct}%`, background: m.color + "99" }} />
                      </div>
                      <span className="w-9 text-right text-[11px] font-bold text-muted">{pct}%</span>
                      <span className="min-w-[80px] text-right font-mono text-[14px] font-extrabold text-foreground">
                        {fmt(m.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top products */}
            <div className="overflow-hidden rounded-xl border border-card-border bg-white">
              <div className="border-b border-card-border px-5 py-4">
                <p className="text-[13px] font-extrabold text-foreground">Más vendidos hoy</p>
                <p className="text-xs text-muted">Por unidades</p>
              </div>
              <div>
                {TODAY.topProducts.map((p, i) => {
                  const maxUnits = TODAY.topProducts[0].units;
                  const rankColor = i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-muted";
                  return (
                    <div key={i} className="flex items-center gap-3 border-b border-card-border/60 px-5 py-2.5 last:border-b-0">
                      <span className={`w-[18px] flex-shrink-0 text-center text-[11px] font-extrabold ${rankColor}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-[13px] font-semibold text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted">{p.cat}</p>
                      </div>
                      <div className="h-[5px] w-[60px] overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-accent" style={{ width:`${(p.units / maxUnits) * 100}%` }} />
                      </div>
                      <span className="min-w-[28px] text-right text-[13px] font-extrabold text-foreground">{p.units}</span>
                      <span className="min-w-[64px] text-right font-mono text-[11.5px] font-semibold text-muted">{fmt(p.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weekly chart */}
          <div className="overflow-hidden rounded-xl border border-card-border bg-white">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <div>
                <p className="text-[13px] font-extrabold text-foreground">Comparación con los últimos 7 días</p>
                <p className="text-xs text-muted">
                  Promedio semanal: {fmt(PREV_AVG)} · Hoy: {PCT_VS_AVG >= 0 ? "+" : ""}{PCT_VS_AVG}% vs. promedio
                </p>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${PCT_VS_AVG >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {PCT_VS_AVG >= 0 ? "▲" : "▼"} {Math.abs(PCT_VS_AVG)}% vs. prom.
              </span>
            </div>
            <WeekChart />
          </div>

          {/* Cash count section */}
          <div className="overflow-hidden rounded-xl border border-card-border bg-white">
            <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
              <div>
                <p className="text-[13px] font-extrabold text-foreground">Conteo de efectivo</p>
                <p className="text-xs text-muted">Comparación entre el efectivo contado y lo que registra el sistema</p>
              </div>
              {cashDiff !== null && (
                <DiffBadge diff={cashDiff} />
              )}
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* 3 boxes */}
              <div className="grid grid-cols-3 gap-4">
                {/* Sistema */}
                <CashBox
                  label="Sistema registra"
                  value={fmt(systemCash)}
                  sub={`${TODAY.methods[0].count} cobros en efectivo`}
                  valueClass="text-foreground"
                />
                {/* Contado */}
                <CashBox
                  label="Contado en caja"
                  value={cashNum !== null ? fmt(cashNum) : undefined}
                  sub="Ingresá el total contado"
                  valueClass={cashNum !== null ? (cashDiff! >= 0 ? "text-emerald-600" : "text-red-500") : "text-muted"}
                  borderColor={cashNum !== null ? (cashDiff! >= 0 ? "border-emerald-300" : "border-red-300") : undefined}
                  placeholder="Ingresá el monto"
                />
                {/* Diferencia */}
                <CashBox
                  label="Diferencia"
                  value={cashDiff === null ? "—" : cashDiff === 0 ? "Exacto" : `${cashDiff > 0 ? "+" : ""}${fmt(cashDiff)}`}
                  sub={cashDiff === null ? "Ingresá el monto arriba" : cashDiff > 0 ? "Sobrante en caja" : cashDiff < 0 ? "Faltante a justificar" : "Caja cuadrada"}
                  valueClass={cashDiff === null ? "text-muted" : cashDiff > 0 ? "text-emerald-600" : cashDiff < 0 ? "text-red-500" : "text-foreground"}
                  bg={cashDiff === null ? undefined : cashDiff > 0 ? "bg-emerald-50" : cashDiff < 0 ? "bg-red-50" : "bg-gray-50"}
                  borderColor={cashDiff === null ? undefined : cashDiff > 0 ? "border-emerald-200" : cashDiff < 0 ? "border-red-200" : "border-gray-200"}
                />
              </div>

              {/* Cash input */}
              <div className="space-y-2">
                <p className="text-[11.5px] font-bold uppercase tracking-[.04em] text-foreground/60">
                  ¿Cuánto contaste en la caja?
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={cashCounted}
                    onChange={(e) => setCashCounted(e.target.value)}
                    placeholder={String(systemCash)}
                    className="h-[52px] max-w-[240px] rounded-xl border-2 border-card-border bg-white px-4 font-mono text-[22px] font-extrabold text-foreground outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,110,247,.12)]"
                  />
                  {cashDiff !== null && <DiffBadge diff={cashDiff} large />}
                </div>
              </div>

              {/* Notes */}
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
                {cajaAbierta
                  ? "Esta acción registra el resumen definitivo de la jornada. No se podrán agregar más ventas al día de hoy."
                  : "La caja ya fue cerrada. Podés imprimir el reporte de la jornada."}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2.5">
              <button type="button"
                      className="flex items-center gap-1.5 rounded-[9px] border border-card-border bg-white px-[18px] py-[11px] text-[13.5px] font-bold text-foreground transition-colors hover:bg-gray-50">
                <IconPrint className="h-[14px] w-[14px] text-muted" />
                Imprimir reporte
              </button>
              <button
                type="button"
                disabled={!cajaAbierta}
                onClick={() => setClosed(true)}
                className="flex items-center gap-2 rounded-[9px] bg-sidebar px-6 py-3 text-[14px] font-extrabold text-white transition-colors hover:bg-sidebar-dark disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: cajaAbierta ? "0 3px 12px rgba(26,31,46,.3)" : undefined }}
              >
                <IconLock className="h-[15px] w-[15px]" />
                {cajaAbierta ? "Cerrar caja del día" : "Caja cerrada"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Success modal ────────────────────────────────────── */}
      {closed && (
        <ClosedModal
          cashDiff={cashDiff ?? 0}
          onClose={() => { setClosed(false); setCajaAbierta(false); }}
        />
      )}
    </div>
  );
}

/* ── Weekly chart ──────────────────────────────────────────────── */

function WeekChart() {
  const allBars = [...ALL_WEEK, { day:"Prom.", amount:PREV_AVG, isAvg:true }] as (typeof ALL_WEEK[0] & { isAvg?: boolean })[];
  const maxVal  = Math.max(...allBars.map((d) => d.amount)) * 1.12;

  return (
    <div className="px-5 pb-5 pt-4">
      {/* Bars */}
      <div className="flex h-[80px] items-end gap-2.5">
        {allBars.map((d, i) => {
          const h = Math.round((d.amount / maxVal) * 72);
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
                  background: isToday ? "#4f6ef7"
                    : isAvg ? "transparent"
                    : "rgba(79,110,247,.25)",
                  border: isAvg ? "1.5px dashed rgba(79,110,247,.5)" : undefined,
                  borderBottom: isAvg ? "none" : undefined,
                }}
              />
              <span className={`text-[10.5px] font-semibold ${isToday ? "font-extrabold text-accent" : "text-muted"}`}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3.5">
        {[
          { color:"#4f6ef7",          label:"Hoy"             },
          { color:"rgba(79,110,247,.25)", label:"Últimos 7 días" },
          { color:"transparent",       label:"Promedio",  dashed:true },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <div className="h-[6px] w-[10px] rounded-sm"
                 style={{ background:l.color, border:l.dashed ? "1.5px dashed rgba(79,110,247,.5)" : undefined }} />
            {l.label}
          </div>
        ))}
      </div>
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
        {value ?? (
          <span className="text-[16px] font-semibold text-muted/60">{placeholder}</span>
        )}
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

  if (diff === 0)  return (
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

function ClosedModal({ cashDiff, onClose }: { cashDiff: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px]"
         style={{ animation: "fadeSlideIn .15s ease" }}>
      <div className="w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl"
           style={{ animation: "scaleIn .18s ease" }}>

        {/* Body */}
        <div className="px-7 py-7">
          <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-sidebar">
            <IconLock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-[18px] font-extrabold tracking-tight text-foreground">Caja cerrada</h2>
          <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-muted">
            La jornada del lunes 21 de abril fue registrada y cerrada correctamente.
          </p>

          {/* Summary */}
          <div className="mt-4 space-y-2 rounded-xl bg-main-bg px-4 py-3.5">
            {[
              { label:"Total facturado",    value: fmt(TODAY.totalVentas)        },
              { label:"Cantidad de ventas", value: String(TODAY.cantVentas)      },
              { label:"Efectivo en caja",   value: fmt(TODAY.methods[0].amount)  },
              ...(cashDiff !== 0 ? [{
                label:"Diferencia de caja",
                value: `${cashDiff > 0 ? "+" : ""}${fmt(cashDiff)}`,
                color: cashDiff > 0 ? "text-emerald-600" : "text-red-500",
              }] : []),
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className={`text-[12.5px] font-medium ${"color" in row ? row.color : "text-muted"}`}>
                  {row.label}
                </span>
                <span className={`text-[13px] font-bold ${"color" in row ? row.color : "text-foreground"}`}>
                  {row.value}
                </span>
              </div>
            ))}
            <div className="my-1 h-px bg-card-border" />
            <div className="flex justify-between">
              <span className="text-[14px] font-bold text-foreground">Ticket promedio</span>
              <span className="text-[15px] font-extrabold text-foreground">{fmt(TODAY.ticketPromedio)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 border-t border-card-border px-6 py-4">
          <button type="button"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-card-border bg-white py-2.5 text-[13.5px] font-bold text-foreground transition-colors hover:bg-gray-50">
            <IconPrint className="h-3.5 w-3.5" />
            Imprimir reporte
          </button>
          <button type="button" onClick={onClose}
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
function IconTrendDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4l3.5 4L7 6l4.5 5.5" />
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
