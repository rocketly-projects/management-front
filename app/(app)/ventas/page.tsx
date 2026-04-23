"use client";

import { useState, useMemo, useRef, useEffect } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface Sale {
  id: string;
  t: string;
  items: string[];
  qty: number;
  total: number;
  pay: PayKey;
  st: StatusKey;
  user: UserKey;
}

type PayKey    = "efectivo" | "debito" | "credito" | "transf" | "mp";
type StatusKey = "completa" | "anulada" | "devuelta";
type UserKey   = "DL" | "SM" | "AC";
type DateRange = "hoy" | "ayer" | "semana" | "mes";

/* ── Config ────────────────────────────────────────────────────── */

const PAYMENTS: Record<PayKey, { label: string; color: string; bg: string; border: string }> = {
  efectivo: { label: "Efectivo",      color: "#047857", bg: "rgba(16,185,129,.12)", border: "rgba(16,185,129,.25)" },
  debito:   { label: "Débito",        color: "#1e40af", bg: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.25)" },
  credito:  { label: "Crédito",       color: "#6d28d9", bg: "rgba(139,92,246,.12)", border: "rgba(139,92,246,.25)" },
  transf:   { label: "Transferencia", color: "#0e7490", bg: "rgba(6,182,212,.12)",  border: "rgba(6,182,212,.25)"  },
  mp:       { label: "Mercado Pago",  color: "#075985", bg: "rgba(14,165,233,.14)", border: "rgba(14,165,233,.30)" },
};

const STATUS: Record<StatusKey, { label: string; color: string; dot: string }> = {
  completa: { label: "Completada", color: "text-emerald-600", dot: "bg-emerald-500" },
  anulada:  { label: "Anulada",    color: "text-red-500",     dot: "bg-red-500"     },
  devuelta: { label: "Devuelta",   color: "text-amber-600",   dot: "bg-amber-400"   },
};

const USERS: Record<UserKey, { name: string; color: string }> = {
  DL: { name: "Diego López",    color: "#f43f5e" },
  SM: { name: "Sofía Márquez",  color: "#10b981" },
  AC: { name: "Ana Cavalli",    color: "#6366f1" },
};

/* ── Mock data ─────────────────────────────────────────────────── */

const SALES: Sale[] = [
  { id:"V-0049", t:"14:32", items:["Coca-Cola 500ml","Alfajor Havanna x1","Yerba La Merced 500g"],         qty:3, total:4270,  pay:"efectivo", st:"completa", user:"DL" },
  { id:"V-0048", t:"14:28", items:["Cigarrillos Philip Morris","Encendedor Bic"],                          qty:2, total:3180,  pay:"debito",   st:"completa", user:"DL" },
  { id:"V-0047", t:"14:21", items:["Pan lactal 540g","Queso cremoso 200g","Jamón cocido 250g","Tomate","Lechuga"], qty:5, total:9820,  pay:"credito",  st:"completa", user:"SM" },
  { id:"V-0046", t:"14:15", items:["Agua mineral 500ml"],                                                 qty:1, total:420,   pay:"efectivo", st:"completa", user:"DL" },
  { id:"V-0045", t:"14:04", items:["Cerveza Quilmes 1L x2","Papas Lays 90g","Maní salado 200g"],          qty:4, total:6750,  pay:"mp",       st:"completa", user:"DL" },
  { id:"V-0044", t:"13:58", items:["Chicles Trident menta x3"],                                           qty:3, total:1950,  pay:"efectivo", st:"completa", user:"SM" },
  { id:"V-0043", t:"13:49", items:["Dulce de leche 400g","Galletitas Oreo","Leche descremada 1L"],        qty:3, total:4910,  pay:"transf",   st:"devuelta", user:"SM" },
  { id:"V-0042", t:"13:41", items:["Café Nescafé 100g"],                                                  qty:1, total:3540,  pay:"debito",   st:"completa", user:"AC" },
  { id:"V-0041", t:"13:35", items:["Detergente Magistral","Lavandina Ayudín"],                            qty:2, total:2280,  pay:"efectivo", st:"completa", user:"AC" },
  { id:"V-0040", t:"13:21", items:["Gaseosa Sprite 2.25L","Fideos Matarazzo","Salsa Pomì","Queso rallado"],qty:4, total:5620,  pay:"credito",  st:"anulada",  user:"DL" },
  { id:"V-0039", t:"13:12", items:["Yogurt Serenito x4","Banana kilo"],                                  qty:5, total:3140,  pay:"efectivo", st:"completa", user:"DL" },
  { id:"V-0038", t:"13:04", items:["Helado Frigor 1L","Cucurucho x6"],                                   qty:2, total:4890,  pay:"mp",       st:"completa", user:"SM" },
];

const KPI_DATA = [
  { label: "Facturado hoy",  value: "$284.560", delta: "▲ 18,4% vs ayer", up: true,  spark: [20,14,17,11,12,6,9,3]  },
  { label: "Ventas",         value: "127",      delta: "▲ +12 vs ayer",   up: true,  spark: [22,18,14,16,10,12,6,5]  },
  { label: "Ticket promedio",value: "$2.241",   delta: "▲ 4,2%",          up: true,  spark: null                     },
  { label: "Devoluciones",   value: "2",        delta: "$3.200 anulados",  up: false, spark: null,  warn: true         },
];

const TOP_PRODUCTS = [
  { name: "Coca-Cola 500ml",      sub: "Bebidas",   qty: 42, val: 35700  },
  { name: "Alfajor Havanna x1",   sub: "Golosinas", qty: 31, val: 37200  },
  { name: "Cigarrillos Marlboro", sub: "Tabaco",    qty: 24, val: 60000  },
  { name: "Chicles Trident",      sub: "Golosinas", qty: 18, val: 11700  },
  { name: "Pan lactal 540g",      sub: "Panadería", qty: 14, val: 12600  },
];

const HEATMAP_HOURS = [8,9,10,11,12,13,14,15,16,17,18,19];
const HEATMAP_INT   = [12,22,30,44,78,88,100,72,58,64,48,28];

/* ── Helpers ───────────────────────────────────────────────────── */

const fmt = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");

function unitPrices(sale: Sale): number[] {
  const avg = sale.total / sale.qty;
  return sale.items.map((_, i) => {
    const factor = [1.05, 0.9, 1.1, 0.95, 1.0, 0.85, 1.15][i % 7];
    return Math.max(50, Math.round((avg * factor) / 10) * 10);
  });
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function VentasPage() {
  const [dateRange, setDateRange] = useState<DateRange>("hoy");
  const [search, setSearch]       = useState("");
  const [payFilter, setPayFilter] = useState<PayKey | "all">("all");
  const [stFilter, setStFilter]   = useState<StatusKey | "all">("all");
  const [userFilter, setUserFilter] = useState<UserKey | "all">("all");
  const [drawer, setDrawer]       = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setDrawer(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return SALES.filter((s) => {
      if (q && !s.id.toLowerCase().includes(q) && !s.items.join(" ").toLowerCase().includes(q)) return false;
      if (payFilter !== "all" && s.pay !== payFilter) return false;
      if (stFilter  !== "all" && s.st  !== stFilter)  return false;
      if (userFilter !== "all" && s.user !== userFilter) return false;
      return true;
    });
  }, [search, payFilter, stFilter, userFilter]);

  // Payment breakdown
  const payBreakdown = useMemo(() => {
    const totals: Partial<Record<PayKey, number>> = {};
    SALES.forEach((s) => { totals[s.pay] = (totals[s.pay] ?? 0) + s.total; });
    const sum = Object.values(totals).reduce((a, b) => a + (b ?? 0), 0);
    return (Object.keys(PAYMENTS) as PayKey[]).map((k) => ({
      key: k, val: totals[k] ?? 0, pct: sum ? Math.round(((totals[k] ?? 0) / sum) * 100) : 0,
    }));
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Page header ───────────────────────────────────────── */}
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

          {/* ── KPI Row ─────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            {KPI_DATA.map((k, i) => <KPICard key={i} {...k} />)}
          </div>

          {/* ── Filters ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date segmented */}
            <div className="flex items-center gap-0.5 rounded-lg border border-card-border bg-gray-100/70 p-1">
              {(["hoy","ayer","semana","mes"] as DateRange[]).map((d) => {
                const labels = { hoy:"Hoy", ayer:"Ayer", semana:"Semana", mes:"Mes" };
                return (
                  <button key={d} type="button" onClick={() => setDateRange(d)}
                          className={[
                            "rounded-md px-3 py-1 text-[12.5px] font-semibold transition-all",
                            dateRange === d
                              ? "bg-white text-foreground shadow-sm"
                              : "text-muted hover:text-foreground",
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
                placeholder="Buscar #venta, producto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-card-border bg-white pl-9 pr-12 text-[13px] text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-card-border bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                ⌘K
              </kbd>
            </div>

            {/* Método */}
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value as PayKey | "all")}
                    className="h-9 rounded-lg border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground outline-none cursor-pointer hover:border-gray-300 transition-colors">
              <option value="all">Método: Todos</option>
              {(Object.keys(PAYMENTS) as PayKey[]).map((k) => (
                <option key={k} value={k}>{PAYMENTS[k].label}</option>
              ))}
            </select>

            {/* Estado */}
            <select value={stFilter} onChange={(e) => setStFilter(e.target.value as StatusKey | "all")}
                    className="h-9 rounded-lg border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground outline-none cursor-pointer hover:border-gray-300 transition-colors">
              <option value="all">Estado: Todos</option>
              {(Object.keys(STATUS) as StatusKey[]).map((k) => (
                <option key={k} value={k}>{STATUS[k].label}</option>
              ))}
            </select>

            {/* Usuario */}
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value as UserKey | "all")}
                    className="h-9 rounded-lg border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground outline-none cursor-pointer hover:border-gray-300 transition-colors">
              <option value="all">Usuario: Todos</option>
              {(Object.keys(USERS) as UserKey[]).map((k) => (
                <option key={k} value={k}>{USERS[k].name}</option>
              ))}
            </select>

            <span className="ml-auto text-xs text-muted">
              <span className="font-bold text-foreground">{visible.length}</span> resultados
            </span>
          </div>

          {/* ── Main grid ───────────────────────────────────── */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>

            {/* Sales table */}
            <div className="overflow-hidden rounded-xl border border-card-border bg-white">
              {/* Table header */}
              <div className="grid items-center gap-3 border-b border-card-border bg-gray-50/80 px-5 py-0"
                   style={{ gridTemplateColumns: "130px 1fr 130px 110px 130px 44px", height: 42 }}>
                {["#Venta / Hora","Productos","Método","Estado","Total",""].map((h, i) => (
                  <div key={i} className={`text-[10.5px] font-bold uppercase tracking-[.08em] text-muted ${i === 4 ? "text-right" : ""}`}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-card-border">
                {visible.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted">Sin resultados</div>
                ) : (
                  visible.map((s) => (
                    <SaleRow key={s.id} sale={s} onClick={() => setDrawer(s)} />
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center gap-2 border-t border-card-border px-5 py-3 text-[12.5px] text-muted">
                <span>Mostrando <b className="text-foreground">{visible.length}</b> de <b className="text-foreground">{SALES.length}</b></span>
                <div className="ml-auto flex items-center gap-1.5">
                  {[1,2,3].map((p) => (
                    <button key={p} type="button"
                            className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                              p === 1 ? "border-accent bg-accent text-white" : "border-card-border bg-white text-foreground hover:bg-gray-50"
                            }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side stack */}
            <div className="flex flex-col gap-4">
              {/* Payment breakdown */}
              <div className="rounded-xl border border-card-border bg-white">
                <div className="border-b border-card-border px-5 py-3.5">
                  <p className="text-[14px] font-bold text-foreground">Métodos de pago</p>
                  <p className="text-xs text-muted">Participación del día</p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  {payBreakdown.filter((p) => p.val > 0).map((p) => {
                    const cfg = PAYMENTS[p.key];
                    return (
                      <div key={p.key}>
                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                          <span style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="font-mono text-foreground">{fmt(p.val)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full transition-all duration-300"
                               style={{ width: `${p.pct}%`, background: cfg.color }} />
                        </div>
                        <p className="mt-0.5 text-right text-[10.5px] text-muted">{p.pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top products */}
              <div className="rounded-xl border border-card-border bg-white">
                <div className="border-b border-card-border px-5 py-3.5">
                  <p className="text-[14px] font-bold text-foreground">Más vendidos hoy</p>
                  <p className="text-xs text-muted">Top 5 por unidades</p>
                </div>
                <div className="px-5 py-1">
                  {TOP_PRODUCTS.map((t, i) => (
                    <div key={i} className="grid items-center gap-2.5 border-b border-dashed border-card-border py-2.5 last:border-b-0"
                         style={{ gridTemplateColumns: "22px 1fr auto" }}>
                      <span className="font-mono text-[11px] font-semibold text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold leading-snug text-foreground">{t.name}</p>
                        <p className="text-[11.5px] text-muted">{t.sub} · {t.qty} uds.</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[12.5px] font-bold text-foreground">{fmt(t.val)}</p>
                        <p className="text-[10.5px] text-muted">{(t.val / 284560 * 100).toFixed(1)}% día</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap */}
              <div className="rounded-xl border border-card-border bg-white">
                <div className="border-b border-card-border px-5 py-3.5">
                  <p className="text-[14px] font-bold text-foreground">Ventas por hora</p>
                  <p className="text-xs text-muted">Concentración de operaciones</p>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-12 gap-1">
                    {HEATMAP_INT.map((v, i) => (
                      <div key={i} title={`${HEATMAP_HOURS[i]}h — ${v}%`}
                           className="aspect-square rounded-sm transition-opacity"
                           style={{ background: `rgba(79,110,247,${v / 100})` }} />
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-12 gap-1">
                    {HEATMAP_HOURS.map((h) => (
                      <div key={h} className="text-center font-mono text-[9.5px] text-muted">{h}h</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Detail drawer ─────────────────────────────────────── */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
               onClick={() => setDrawer(null)} />
          <SaleDrawer sale={drawer} onClose={() => setDrawer(null)} />
        </>
      )}
    </div>
  );
}

/* ── Sale row ──────────────────────────────────────────────────── */

function SaleRow({ sale, onClick }: { sale: Sale; onClick: () => void }) {
  const pay = PAYMENTS[sale.pay];
  const st  = STATUS[sale.st];
  const first = sale.items[0] ?? "";
  const more  = sale.items.length > 1 ? ` +${sale.items.length - 1} más` : "";

  return (
    <div className="grid cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/80"
         style={{ gridTemplateColumns: "130px 1fr 130px 110px 130px 44px" }}
         onClick={onClick}>
      {/* ID + time */}
      <div>
        <p className="font-mono text-[13px] font-semibold text-foreground">#{sale.id}</p>
        <p className="text-[11.5px] text-muted">{sale.t}</p>
      </div>

      {/* Products */}
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-foreground">{first}{more}</p>
        <p className="text-[12px] text-muted">
          {sale.qty} unidades · Cajero: {USERS[sale.user].name.split(" ")[0]}
        </p>
      </div>

      {/* Payment pill */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
              style={{ color: pay.color, background: pay.bg, borderColor: pay.border }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pay.color }} />
          {pay.label}
        </span>
      </div>

      {/* Status */}
      <div>
        <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${st.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      {/* Total */}
      <div className="text-right">
        <p className="font-mono text-[14px] font-bold text-foreground">{fmt(sale.total)}</p>
        <p className="text-[12px] text-muted">{sale.qty} items</p>
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

function SaleDrawer({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const pay    = PAYMENTS[sale.pay];
  const st     = STATUS[sale.st];
  const user   = USERS[sale.user];
  const prices = unitPrices(sale);
  const subtotal = sale.total / 1.21;
  const tax      = sale.total - subtotal;
  const disc     = sale.st === "devuelta" ? -Math.round(sale.total * 0.1) : 0;
  const grandTotal = sale.total + disc;

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-[460px] flex-col border-l border-card-border bg-white shadow-2xl"
           style={{ animation: "slideLeft 0.25s cubic-bezier(.2,.8,.2,1)" }}>

      {/* Drawer head */}
      <div className="border-b border-card-border px-6 py-5">
        <div className="flex items-center gap-2.5">
          {/* Pay pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
                style={{ color: pay.color, background: pay.bg, borderColor: pay.border }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: pay.color }} />
            {pay.label}
          </span>
          {/* Status pill */}
          <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${st.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
          <button type="button" onClick={onClose}
                  className="ml-auto rounded-md p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <h2 className="mt-2.5 font-mono text-[22px] font-bold text-foreground">#{sale.id}</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Hoy {sale.t} · {user.name} · Caja #1
        </p>
      </div>

      {/* Drawer body */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

        {/* Items */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Artículos</p>
          <div className="overflow-hidden rounded-xl border border-card-border">
            {sale.items.map((name, i) => (
              <div key={i} className="grid items-center gap-2.5 border-b border-card-border px-3.5 py-2.5 last:border-b-0 text-[13px]"
                   style={{ gridTemplateColumns: "36px 1fr auto auto" }}>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-center font-mono text-[12px] font-semibold text-foreground">
                  1×
                </span>
                <div>
                  <p className="font-semibold text-foreground">{name}</p>
                  <p className="text-[11.5px] text-muted">SKU {779 + i * 7}{String(i).padStart(4, "0")}</p>
                </div>
                <span className="font-mono text-[12px] text-muted min-w-[72px] text-right">{fmt(prices[i])}</span>
                <span className="font-mono text-[13px] font-bold text-foreground min-w-[88px] text-right">{fmt(prices[i])}</span>
              </div>
            ))}

            {/* Totals */}
            <div className="grid grid-cols-2 gap-y-1.5 border-t border-dashed border-card-border px-3.5 py-3.5 text-[12.5px]">
              <span className="text-muted">Subtotal</span>
              <span className="text-right font-mono font-semibold text-foreground">{fmt(subtotal)}</span>
              {disc !== 0 && (
                <>
                  <span className="text-muted">Descuento</span>
                  <span className="text-right font-mono font-semibold text-red-500">{fmt(disc)}</span>
                </>
              )}
              <span className="text-muted">Impuestos (21%)</span>
              <span className="text-right font-mono font-semibold text-foreground">{fmt(tax)}</span>
              <span className="text-[14px] font-bold text-foreground">Total</span>
              <span className="text-right font-mono text-[18px] font-bold text-foreground">{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Detalles</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cliente",      value: "Cliente ocasional",                 sub: "Sin CUIT registrado" },
              { label: "Comprobante",  value: `Ticket B — 0001-${sale.id.replace("V-","0000")}`, sub: "Comprobante fiscal" },
              { label: "Cajero",       value: user.name,                           sub: "Cajero", avatar: sale.user, color: user.color },
              { label: "Canal",        value: "POS · Caja #1",                     sub: "Canal de venta" },
            ].map((d) => (
              <div key={d.label} className="rounded-xl border border-card-border p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{d.label}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {d.avatar && (
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                          style={{ background: d.color }}>
                      {d.avatar}
                    </span>
                  )}
                  <p className="text-[13px] font-semibold text-foreground">{d.value}</p>
                </div>
                <p className="mt-0.5 text-[11.5px] text-muted">{d.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-card-border px-6 py-4">
        {[
          { label: "Reimprimir", icon: <IconPrint className="h-4 w-4" /> },
          { label: "Enviar",     icon: <IconSend  className="h-4 w-4" /> },
        ].map((a) => (
          <button key={a.label} type="button"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50">
            {a.icon}{a.label}
          </button>
        ))}
        <button type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
          <IconRefund className="h-4 w-4" />
          Anular
        </button>
      </div>
    </aside>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────── */

function KPICard({
  label, value, delta, up, spark, warn,
}: {
  label: string; value: string; delta: string;
  up: boolean; spark: number[] | null; warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-card-border bg-white p-4">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[.08em] text-muted">
        {label}
      </div>
      <p className={`text-[24px] font-bold leading-none tracking-tight ${warn ? "text-amber-500" : "text-foreground"}`}>
        {value}
      </p>
      <div className="flex items-end justify-between gap-2">
        <span className={`text-[12px] font-medium ${up ? "text-emerald-600" : "text-amber-600"}`}>
          {delta}
        </span>
        {spark && (
          <svg width={72} height={26} viewBox="0 0 72 26" className="flex-shrink-0">
            <polyline
              points={spark.map((v, i) => `${i * (72 / (spark.length - 1))},${26 - (v / Math.max(...spark)) * 22}`).join(" ")}
              fill="none"
              stroke={up ? "#10b981" : "#4f6ef7"}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
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
function IconSend({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" />
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
