"use client";

import { useState, useEffect, useRef, useMemo } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface CatalogItem {
  id: number; name: string; cat: string;
  code: string; price: number; stock: number;
}

interface CartItem extends CatalogItem {
  qty: number; cartId: number;
}

type PayMethod = "efectivo" | "debito" | "credito" | "transf" | "mp";
type DiscType  = "pct" | "amt";

interface SaleModal {
  num: number; method: PayMethod; total: number;
  discAmt: number; change: number | null;
  items: CartItem[];
}

/* ── Catalog ───────────────────────────────────────────────────── */

const CATALOG: CatalogItem[] = [
  { id:1,  name:"Coca-Cola 500ml",       cat:"Bebidas",   code:"7790895001010", price:850,  stock:24 },
  { id:2,  name:"Agua mineral 500ml",    cat:"Bebidas",   code:"7791337002068", price:420,  stock:18 },
  { id:3,  name:"Sprite 1.5L",           cat:"Bebidas",   code:"7790895000914", price:1400, stock:8  },
  { id:4,  name:"Alfajor Havanna x1",    cat:"Golosinas", code:"7791780000012", price:1200, stock:30 },
  { id:5,  name:"Chicles Trident menta", cat:"Golosinas", code:"7622210024039", price:650,  stock:45 },
  { id:6,  name:"Cigarrillos Marlboro",  cat:"Tabaco",    code:"5000159473139", price:2500, stock:3  },
  { id:7,  name:"Pan lactal Bimbo",      cat:"Almacén",   code:"7792222000063", price:1150, stock:12 },
  { id:8,  name:"Yerba Mate 500g",       cat:"Almacén",   code:"7791195001013", price:3200, stock:1  },
  { id:9,  name:"Nescafé sachets x5",    cat:"Almacén",   code:"7613036742764", price:800,  stock:22 },
  { id:10, name:"Medias lunas x4",       cat:"Panadería", code:"0000000000001", price:900,  stock:6  },
  { id:11, name:"Flan casero",           cat:"Panadería", code:"0000000000002", price:750,  stock:4  },
  { id:12, name:"Leche entera 1L",       cat:"Lácteos",   code:"7793100001013", price:1380, stock:15 },
];

const METHODS: Record<PayMethod, { label: string; kbd: string; color: string; bg: string; border: string }> = {
  efectivo: { label:"Efectivo",      kbd:"F1", color:"#047857", bg:"rgba(16,185,129,.1)", border:"rgba(16,185,129,.4)" },
  debito:   { label:"Débito",        kbd:"F2", color:"#1e40af", bg:"rgba(59,130,246,.1)", border:"rgba(59,130,246,.4)" },
  credito:  { label:"Crédito",       kbd:"F3", color:"#6d28d9", bg:"rgba(139,92,246,.1)", border:"rgba(139,92,246,.4)" },
  transf:   { label:"Transferencia", kbd:"F4", color:"#0e7490", bg:"rgba(6,182,212,.1)",  border:"rgba(6,182,212,.4)"  },
  mp:       { label:"Mercado Pago",  kbd:"F5", color:"#075985", bg:"rgba(14,165,233,.12)", border:"rgba(14,165,233,.4)" },
};

const CASH_PRESETS = [500, 1000, 2000, 5000, 10000];

/* ── Helpers ───────────────────────────────────────────────────── */

const fmtARS = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;


/* ── Page ─────────────────────────────────────────────────────── */

export default function CajaPage() {
  const clock = useClock();

  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null); // cartId
  const [discount,    setDiscount]    = useState("");
  const [discType,    setDiscType]    = useState<DiscType>("pct");
  const [method,      setMethod]      = useState<PayMethod>("efectivo");
  const [cash,        setCash]        = useState("");
  const [modal,       setModal]       = useState<SaleModal | null>(null);
  const [saleNum,     setSaleNum]     = useState(48);

  // Search state
  const [query,      setQuery]      = useState("");
  const [dropOpen,   setDropOpen]   = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Derived ─────────────────────────────────────────────── */

  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return [];
    return CATALOG.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.includes(q)
    ).slice(0, 8);
  }, [query]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discVal  = parseFloat(discount) || 0;
  const discAmt  = discType === "pct"
    ? Math.round(subtotal * discVal / 100)
    : Math.min(discVal, subtotal);
  const total    = Math.max(0, subtotal - discAmt);
  const cashAmt  = parseFloat(cash.replace(/\D/g, "")) || 0;
  const change   = cashAmt - total;

  /* ── Cart helpers ────────────────────────────────────────── */

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, qty: Math.min(c.qty + 1, item.stock) } : c
        );
      }
      const newItem = { ...item, qty: 1, cartId: Date.now() };
      setSelectedRow(newItem.cartId);
      return [...prev, newItem];
    });
    setQuery("");
    setDropOpen(false);
    searchRef.current?.focus();
  }

  function updateQty(cartId: number, delta: number) {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.cartId !== cartId) return [c];
        const next = c.qty + delta;
        if (next <= 0) return [];
        return [{ ...c, qty: Math.min(next, c.stock) }];
      })
    );
  }

  function setQty(cartId: number, val: number) {
    if (isNaN(val) || val <= 0) {
      setCart((prev) => prev.filter((c) => c.cartId !== cartId));
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.cartId === cartId ? { ...c, qty: Math.min(val, c.stock) } : c
      )
    );
  }

  function removeItem(cartId: number) {
    setCart((prev) => {
      const idx   = prev.findIndex((c) => c.cartId === cartId);
      const next  = prev.filter((c) => c.cartId !== cartId);
      if (next.length === 0) { setSelectedRow(null); return next; }
      const newSel = next[Math.min(idx, next.length - 1)].cartId;
      setSelectedRow(newSel);
      return next;
    });
  }

  function clearCart() {
    setCart([]);
    setSelectedRow(null);
    setDiscount("");
    setCash("");
  }

  /* ── Payment ─────────────────────────────────────────────── */

  function handleCobrar() {
    if (cart.length === 0) return;
    setModal({
      num: saleNum, method, total, discAmt,
      change: method === "efectivo" ? change : null,
      items: cart,
    });
  }

  function handleNuevaVenta() {
    clearCart();
    setSaleNum((n) => n + 1);
    setModal(null);
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  /* ── Keyboard ────────────────────────────────────────────── */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (modal) {
        if (e.key === "Escape") { handleNuevaVenta(); }
        return;
      }
      // F-keys
      const fMap: Record<string, PayMethod> = { F1:"efectivo", F2:"debito", F3:"credito", F4:"transf", F5:"mp" };
      if (fMap[e.key]) { e.preventDefault(); setMethod(fMap[e.key]); return; }
      if (e.key === "F12" || (e.ctrlKey && e.key === "Enter")) { e.preventDefault(); handleCobrar(); return; }

      if (tag === "INPUT") return; // let inputs handle their own

      // Cart navigation
      if (cart.length === 0) return;
      const selIdx = cart.findIndex((c) => c.cartId === selectedRow);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(selIdx + 1, cart.length - 1);
        setSelectedRow(cart[next].cartId);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(selIdx - 1, 0);
        setSelectedRow(cart[prev].cartId);
      }
      if (selectedRow !== null) {
        if (e.key === "+" || e.key === "=") { e.preventDefault(); updateQty(selectedRow,  1); }
        if (e.key === "-")                  { e.preventDefault(); updateQty(selectedRow, -1); }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeItem(selectedRow); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, selectedRow, modal, total, method]);

  /* ── Search handlers ─────────────────────────────────────── */

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropOpen || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); addToCart(results[focusedIdx]); }
    if (e.key === "Escape")    { setDropOpen(false); setQuery(""); }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-main-bg">

      {/* ── POS Header (dark) ──────────────────────────────── */}
      <div className="flex h-12 flex-shrink-0 items-center gap-4 bg-sidebar px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-extrabold text-white">R</div>
          <span className="text-[13px] font-bold text-white">Rocketly</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-white/60">Venta</span>
          <span className="font-mono text-[13px] font-bold text-white">#{String(saleNum).padStart(4,"0")}</span>
        </div>
        <div className="font-mono text-[12px] font-semibold text-white/50">{clock}</div>

        <div className="ml-auto flex items-center gap-2">
          {(["F1","F2","F3","F4","F5","F12"] as const).map((k) => (
            <span key={k} className="rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-white/40">{k}</span>
          ))}
          <div className="ml-2 h-4 w-px bg-white/10" />
          <button type="button" onClick={clearCart}
                  className="rounded-md border border-white/15 bg-white/8 px-3 py-1 text-[12px] font-semibold text-white/60 hover:bg-white/15 transition-colors">
            Cancelar
          </button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────── */}
      <div className="relative flex-shrink-0 border-b border-card-border bg-white px-4 py-2.5">
        <div className="relative">
          <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDropOpen(true); setFocusedIdx(0); }}
            onFocus={() => query && setDropOpen(true)}
            onBlur={() => setTimeout(() => setDropOpen(false), 150)}
            onKeyDown={onSearchKey}
            placeholder="Buscar por nombre o código de barras…"
            className="h-[46px] w-full rounded-xl border-2 border-card-border bg-gray-50/60 pl-10 pr-32 text-[14px] text-foreground placeholder:text-muted outline-none transition-all focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,110,247,.12)]"
            autoFocus
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[11.5px] text-muted">
            {query ? (
              <button type="button" onClick={() => { setQuery(""); setDropOpen(false); searchRef.current?.focus(); }}
                      className="text-muted hover:text-foreground transition-colors">
                <IconX className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="text-muted/60">↵ para agregar</span>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {dropOpen && results.length > 0 && (
          <div className="absolute left-4 right-4 top-full z-20 mt-1 overflow-hidden rounded-xl border border-card-border bg-white shadow-xl">
            {results.map((p, i) => (
              <div key={p.id}
                   className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${i === focusedIdx ? "bg-accent/8" : "hover:bg-gray-50"}`}
                   onMouseEnter={() => setFocusedIdx(i)}
                   onMouseDown={() => addToCart(p)}>
                <span className="rounded-md px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{ background: CAT_COLORS[p.cat]?.bg ?? "#f1f5f9", color: CAT_COLORS[p.cat]?.color ?? "#475569" }}>
                  {p.cat}
                </span>
                <span className="flex-1 text-[13.5px] font-semibold text-foreground">{p.name}</span>
                <span className="font-mono text-[11px] text-muted">{p.code}</span>
                <span className={`text-[11px] font-semibold ${p.stock <= 2 ? "text-red-500" : "text-emerald-600"}`}>
                  {p.stock} uds.
                </span>
                <span className="min-w-[64px] text-right font-mono text-[13px] font-bold text-foreground">{fmtARS(p.price)}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 border-t border-card-border bg-gray-50/60 px-4 py-1.5 text-[11px] text-muted">
              <span>↑↓ navegar</span><span>↵ agregar</span><span>Esc cerrar</span>
            </div>
          </div>
        )}
        {dropOpen && query && results.length === 0 && (
          <div className="absolute left-4 right-4 top-full z-20 mt-1 rounded-xl border border-card-border bg-white px-4 py-4 text-center text-sm text-muted shadow-xl">
            Sin resultados para "{query}"
          </div>
        )}
      </div>

      {/* ── Body: Cart + Pay ────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Cart panel */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-card-border">
          {/* Table header */}
          <div className="grid flex-shrink-0 items-center gap-3 border-b border-card-border bg-white px-4 py-2"
               style={{ gridTemplateColumns: "1fr 110px 90px 90px 36px" }}>
            {["Producto","Cantidad","Precio unit.","Subtotal",""].map((h, i) => (
              <div key={i} className={`text-[10.5px] font-bold uppercase tracking-[.08em] text-muted ${i >= 2 ? "text-right" : ""}`}>{h}</div>
            ))}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-card-border">
                  <IconBag className="h-7 w-7 text-muted/40" />
                </div>
                <p className="text-[15px] font-semibold text-foreground/40">El carrito está vacío</p>
                <p className="text-xs text-muted/60">Buscá un producto arriba o escaneá un código</p>
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {cart.map((item) => {
                  const sel = item.cartId === selectedRow;
                  return (
                    <div key={item.cartId}
                         className={[
                           "grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
                           sel ? "border-l-[3px] border-accent bg-accent/5" : "border-l-[3px] border-transparent hover:bg-gray-50/80",
                         ].join(" ")}
                         style={{ gridTemplateColumns: "1fr 110px 90px 90px 36px" }}
                         onClick={() => setSelectedRow(item.cartId)}>
                      {/* Name */}
                      <div>
                        <p className="text-[13.5px] font-semibold text-foreground">{item.name}</p>
                        <p className="font-mono text-[11px] text-muted">{item.code}</p>
                      </div>
                      {/* Qty control */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateQty(item.cartId, -1)}
                                className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-card-border bg-white text-sm font-bold text-muted hover:bg-gray-50 transition-colors">
                          −
                        </button>
                        <input type="number" value={item.qty}
                               onChange={(e) => setQty(item.cartId, parseInt(e.target.value))}
                               className="h-[26px] w-9 rounded-md border border-card-border bg-white text-center font-mono text-[13px] font-semibold text-foreground outline-none focus:border-accent" />
                        <button type="button" onClick={() => updateQty(item.cartId, 1)}
                                disabled={item.qty >= item.stock}
                                className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-card-border bg-white text-sm font-bold text-muted hover:bg-gray-50 disabled:opacity-40 transition-colors">
                          +
                        </button>
                      </div>
                      {/* Price */}
                      <div className="text-right font-mono text-[13px] text-muted">{fmtARS(item.price)}</div>
                      {/* Subtotal */}
                      <div className="text-right font-mono text-[14px] font-bold text-foreground">{fmtARS(item.price * item.qty)}</div>
                      {/* Delete */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => removeItem(item.cartId)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-red-50 hover:text-red-500 transition-colors">
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart footer hints */}
          <div className="flex flex-shrink-0 items-center gap-4 border-t border-card-border bg-white px-4 py-2 text-[11px] text-muted">
            <span className="font-semibold text-foreground">
              {cart.length} producto{cart.length !== 1 ? "s" : ""} · {cart.reduce((s, i) => s + i.qty, 0)} uds.
            </span>
            <div className="ml-auto flex items-center gap-3">
              {[["↑↓","navegar"],["+ −","cantidad"],["Del","eliminar"]].map(([k,l]) => (
                <span key={k} className="flex items-center gap-1">
                  <kbd className="rounded border border-card-border bg-gray-50 px-1 py-0.5 font-mono text-[10px]">{k}</kbd>
                  <span>{l}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Payment panel */}
        <div className="flex w-[380px] flex-shrink-0 flex-col overflow-y-auto bg-white">
          <div className="flex flex-1 flex-col gap-0 px-5 py-5 space-y-4">

            {/* Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">Subtotal</span>
                <span className="font-mono font-semibold text-foreground">{fmtARS(subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted">Descuento</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {(["pct","amt"] as DiscType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setDiscType(t)}
                            className={`h-7 w-8 rounded-md border text-[12px] font-bold transition-colors ${discType === t ? "border-accent bg-accent text-white" : "border-card-border bg-white text-muted hover:border-gray-300"}`}>
                      {t === "pct" ? "%" : "$"}
                    </button>
                  ))}
                  <input type="number" min={0} value={discount}
                         onChange={(e) => setDiscount(e.target.value)}
                         placeholder="0"
                         className="h-7 w-16 rounded-md border border-card-border bg-white px-2 text-right font-mono text-[13px] font-semibold text-foreground outline-none focus:border-accent" />
                </div>
              </div>
              {discAmt > 0 && (
                <p className="text-right text-[12px] font-semibold text-emerald-600">
                  Ahorro: −{fmtARS(discAmt)}
                </p>
              )}
            </div>

            {/* Total */}
            <div className="rounded-xl border-2 border-accent/20 bg-accent/5 px-4 py-3">
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-muted">Total</p>
              <p className="font-mono text-[38px] font-extrabold leading-none tracking-tight text-accent">
                {fmtARS(total)}
              </p>
            </div>

            {/* Payment methods */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {(["efectivo","debito","credito"] as PayMethod[]).map((m) => (
                  <MethodBtn key={m} method={m} selected={method === m} onSelect={() => setMethod(m)} />
                ))}
                <div className="col-span-1">
                  <MethodBtn method="transf" selected={method === "transf"} onSelect={() => setMethod("transf")} />
                </div>
                <div className="col-span-2">
                  <MethodBtn method="mp" selected={method === "mp"} onSelect={() => setMethod("mp")} fullWidth />
                </div>
              </div>
            </div>

            {/* Cash input — only for efectivo */}
            {method === "efectivo" && (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-muted">Con cuánto paga</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-muted">$</span>
                    <input type="text" value={cash}
                           onChange={(e) => setCash(e.target.value)}
                           placeholder={String(total)}
                           className="h-[38px] w-full rounded-lg border border-card-border bg-white pl-7 font-mono text-[14px] font-semibold text-foreground outline-none focus:border-accent" />
                  </div>
                  {cash && (
                    <span className={`font-mono text-[13px] font-bold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {change >= 0 ? `Vuelto ${fmtARS(change)}` : "Insuficiente"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CASH_PRESETS.filter((p) => p >= total * 0.5).slice(0, 4).map((p) => (
                    <button key={p} type="button" onClick={() => setCash(String(p))}
                            className="rounded-md border border-card-border bg-gray-50 px-2.5 py-1 font-mono text-[12px] font-semibold text-foreground hover:bg-gray-100 transition-colors">
                      {fmtARS(p)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cobrar button */}
          <div className="flex-shrink-0 border-t border-card-border p-4">
            <button type="button" onClick={handleCobrar} disabled={cart.length === 0}
                    className="relative w-full rounded-xl py-3.5 text-[18px] font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90 active:scale-[0.99]"
                    style={{ background: cart.length > 0 ? "#4f6ef7" : undefined, boxShadow: cart.length > 0 ? "0 4px 14px rgba(79,110,247,.35)" : undefined }}>
              Cobrar {total > 0 && fmtARS(total)}
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-white/30 bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                F12
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────── */}
      <div className="flex h-6 flex-shrink-0 items-center gap-4 bg-sidebar px-4 text-[11px] text-white/40">
        <StatusItem label="Comercio" value="Kiosco El Puente" />
        <StatusItem label="Caja" value="Abierta" valueClass="text-emerald-400" />
        <StatusItem label="Usuario" value="Diego" />
        <div className="ml-auto flex items-center gap-3">
          {[["F1–F5","método pago"],["F12","cobrar"],["↑↓","navegar"],["+ −","cantidad"]].map(([k,l]) => (
            <span key={k} className="flex items-center gap-1">
              <kbd className="rounded border border-white/15 bg-white/8 px-1 py-px font-mono text-[9.5px]">{k}</kbd>
              <span>{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Success modal ────────────────────────────────────── */}
      {modal && <SuccessModal sale={modal} onNuevaVenta={handleNuevaVenta} />}
    </div>
  );
}

/* ── Method button ─────────────────────────────────────────────── */

function MethodBtn({ method, selected, onSelect, fullWidth }: {
  method: PayMethod; selected: boolean; onSelect: () => void; fullWidth?: boolean;
}) {
  const cfg = METHODS[method];
  return (
    <button type="button" onClick={onSelect}
            className={[
              "flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all",
              selected ? "shadow-sm" : "border-card-border bg-white hover:border-gray-300",
            ].join(" ")}
            style={selected ? { borderColor: cfg.border, background: cfg.bg } : undefined}>
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
           style={{ background: selected ? cfg.color : "rgba(0,0,0,.05)" }}>
        <span className="font-mono text-[9px] font-extrabold" style={{ color: selected ? "white" : "#888" }}>
          {cfg.kbd}
        </span>
      </div>
      <span className={`text-[12.5px] font-semibold ${selected ? "" : "text-foreground/70"}`}
            style={selected ? { color: cfg.color } : undefined}>
        {cfg.label}
      </span>
    </button>
  );
}

/* ── Success modal ─────────────────────────────────────────────── */

function SuccessModal({ sale, onNuevaVenta }: { sale: SaleModal; onNuevaVenta: () => void }) {
  const cfg = METHODS[sale.method];
  const shown = sale.items.slice(0, 4);
  const extra = sale.items.length - 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
         onClick={onNuevaVenta}>
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl"
           onClick={(e) => e.stopPropagation()}
           style={{ animation: "fadeSlideIn .25s ease" }}>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-card-border px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <IconCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[16px] font-bold text-foreground">Cobrado</p>
            <p className="text-[12.5px] text-muted">
              Venta #{String(sale.num).padStart(4,"0")} registrada correctamente
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2">
          {shown.map((item, i) => (
            <div key={i} className="flex justify-between text-[13px]">
              <span className="text-foreground/80">{item.name} × {item.qty}</span>
              <span className="font-mono font-semibold">{fmtARS(item.price * item.qty)}</span>
            </div>
          ))}
          {extra > 0 && <p className="text-[12px] text-muted">y {extra} producto{extra > 1 ? "s" : ""} más…</p>}
          {sale.discAmt > 0 && (
            <div className="flex justify-between text-[13px] text-emerald-600">
              <span>Descuento</span>
              <span className="font-mono font-semibold">−{fmtARS(sale.discAmt)}</span>
            </div>
          )}
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Método</span>
            <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
          {sale.change !== null && (
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Vuelto</span>
              <span className="font-mono font-semibold text-emerald-600">{fmtARS(Math.max(0, sale.change))}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-b border-card-border px-5 py-3">
          <span className="text-[14px] font-bold text-foreground">Total cobrado</span>
          <span className="font-mono text-[28px] font-extrabold text-foreground">{fmtARS(sale.total)}</span>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 py-4">
          <button type="button"
                  className="flex-1 rounded-xl border border-card-border py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors">
            Ticket
          </button>
          <button type="button" onClick={onNuevaVenta}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── StatusItem ────────────────────────────────────────────────── */

function StatusItem({ label, value, valueClass = "text-white/70" }: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <span>{label}:</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </span>
  );
}

/* ── Category colors ───────────────────────────────────────────── */

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Bebidas:    { bg:"rgba(219,234,254,.7)",  color:"#1d4ed8" },
  Golosinas:  { bg:"rgba(252,231,243,.7)",  color:"#9d174d" },
  Tabaco:     { bg:"rgba(254,243,199,.7)",  color:"#92400e" },
  Almacén:    { bg:"rgba(220,252,231,.7)",  color:"#166534" },
  Panadería:  { bg:"rgba(255,237,213,.7)",  color:"#9a3412" },
  Lácteos:    { bg:"rgba(254,226,226,.7)",  color:"#991b1b" },
};

/* ── Clock hook ────────────────────────────────────────────────── */
function useClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit", second:"2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ── Icons ─────────────────────────────────────────────────────── */

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3.5 3.5" />
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
function IconBag({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="3" />
      <path d="M8 7V5a4 4 0 018 0v2" />
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
function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10l4.5 4.5L16 6" />
    </svg>
  );
}
