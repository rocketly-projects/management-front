"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useProductosStore } from "@/lib/store/productosStore";
import { useCajaStore } from "@/lib/store/cajaStore";
import { useAuthStore } from "@/lib/store/authStore";
import { createVenta } from "@/lib/api/ventas";
import { ApiError } from "@/lib/api/client";
import type { MetodoPago } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────── */

interface CatalogItem {
  id: string; name: string; cat: string | null;
  code: string | null; price: number; stock: number;
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

/* ── Constants ─────────────────────────────────────────────────── */

const METHOD_DISPLAY: Record<PayMethod, { label: string; kbd: string; color: string; bg: string; border: string }> = {
  efectivo: { label:"Efectivo",      kbd:"F1", color:"#047857", bg:"rgba(16,185,129,.1)", border:"rgba(16,185,129,.4)" },
  debito:   { label:"Débito",        kbd:"F2", color:"#1e40af", bg:"rgba(59,130,246,.1)", border:"rgba(59,130,246,.4)" },
  credito:  { label:"Crédito",       kbd:"F3", color:"#6d28d9", bg:"rgba(139,92,246,.1)", border:"rgba(139,92,246,.4)" },
  transf:   { label:"Transferencia", kbd:"F4", color:"#0e7490", bg:"rgba(6,182,212,.1)",  border:"rgba(6,182,212,.4)"  },
  mp:       { label:"Mercado Pago",  kbd:"F5", color:"#075985", bg:"rgba(14,165,233,.12)", border:"rgba(14,165,233,.4)" },
};

const METHOD_MAP: Record<PayMethod, MetodoPago> = {
  efectivo: "EFECTIVO",
  debito:   "DEBITO",
  credito:  "CREDITO",
  transf:   "TRANSFERENCIA",
  mp:       "MERCADO_PAGO",
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Bebidas:   { bg:"rgba(219,234,254,.7)", color:"#1d4ed8" },
  Golosinas: { bg:"rgba(252,231,243,.7)", color:"#9d174d" },
  Tabaco:    { bg:"rgba(254,243,199,.7)", color:"#92400e" },
  Almacén:   { bg:"rgba(220,252,231,.7)", color:"#166534" },
  Panadería: { bg:"rgba(255,237,213,.7)", color:"#9a3412" },
  Lácteos:   { bg:"rgba(254,226,226,.7)", color:"#991b1b" },
};

const CASH_PRESETS = [500, 1000, 2000, 5000, 10000];

/* ── Helpers ───────────────────────────────────────────────────── */

const fmtARS = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/* ── Page ─────────────────────────────────────────────────────── */

export default function CajaPage() {
  const clock       = useClock();
  const { cajaActiva, loading: cajaLoading, abrir } = useCajaStore();
  const { productos, fetch: fetchProductos }         = useProductosStore();
  const { perfil }                                   = useAuthStore();

  // Derive searchable catalog from store
  const catalog: CatalogItem[] = useMemo(
    () => productos
      .filter((p) => p.activo)
      .map((p) => ({ id: p.id, name: p.nombre, cat: p.categoria, code: p.sku, price: p.precio, stock: p.stock })),
    [productos]
  );

  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [discount,    setDiscount]    = useState("");
  const [discType,    setDiscType]    = useState<DiscType>("pct");
  const [method,      setMethod]      = useState<PayMethod>("efectivo");
  const [cash,        setCash]        = useState("");
  const [modal,       setModal]       = useState<SaleModal | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Caja open modal state
  const [abrirLoading, setAbrirLoading] = useState(false);
  const [abrirError,   setAbrirError]   = useState<string | null>(null);

  // Search state
  const [query,      setQuery]      = useState("");
  const [dropOpen,   setDropOpen]   = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ensure products are loaded when entering the POS (refreshes stock levels)
  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  /* ── Derived ─────────────────────────────────────────────── */

  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return [];
    return catalog.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.code ?? "").includes(q)
    ).slice(0, 8);
  }, [query, catalog]);

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
      const idx  = prev.findIndex((c) => c.cartId === cartId);
      const next = prev.filter((c) => c.cartId !== cartId);
      if (next.length === 0) { setSelectedRow(null); return next; }
      setSelectedRow(next[Math.min(idx, next.length - 1)].cartId);
      return next;
    });
  }

  function clearCart() {
    setCart([]);
    setSelectedRow(null);
    setDiscount("");
    setCash("");
    setSubmitError(null);
  }

  /* ── Caja guard ──────────────────────────────────────────── */

  async function handleAbrirCaja(montoInicial: number) {
    setAbrirLoading(true);
    setAbrirError(null);
    try {
      await abrir(montoInicial);
    } catch (e) {
      setAbrirError(e instanceof ApiError ? e.message : "Error al abrir la caja");
    } finally {
      setAbrirLoading(false);
    }
  }

  /* ── Payment ─────────────────────────────────────────────── */

  async function handleCobrar() {
    if (cart.length === 0 || !cajaActiva || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const venta = await createVenta({
        items: cart.map((item) => ({ productoId: item.id, cantidad: item.qty })),
        descuento: discAmt,
        metodoPago: METHOD_MAP[method],
        cajaId: cajaActiva.id,
      });
      setModal({
        num: venta.numero,
        method,
        total: venta.total,
        discAmt: venta.descuento,
        change: method === "efectivo" ? cashAmt - venta.total : null,
        items: cart,
      });
      // Refresh stocks after sale
      fetchProductos();
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "Error al procesar la venta");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNuevaVenta() {
    clearCart();
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
      const fMap: Record<string, PayMethod> = { F1:"efectivo", F2:"debito", F3:"credito", F4:"transf", F5:"mp" };
      if (fMap[e.key]) { e.preventDefault(); setMethod(fMap[e.key]); return; }
      if (e.key === "F12" || (e.ctrlKey && e.key === "Enter")) { e.preventDefault(); handleCobrar(); return; }
      if (tag === "INPUT") return;
      if (cart.length === 0) return;
      const selIdx = cart.findIndex((c) => c.cartId === selectedRow);
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedRow(cart[Math.min(selIdx + 1, cart.length - 1)].cartId); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedRow(cart[Math.max(selIdx - 1, 0)].cartId); }
      if (selectedRow !== null) {
        if (e.key === "+" || e.key === "=") { e.preventDefault(); updateQty(selectedRow,  1); }
        if (e.key === "-")                  { e.preventDefault(); updateQty(selectedRow, -1); }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeItem(selectedRow); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, selectedRow, modal, total, method, cajaActiva, submitting]);

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

      {/* ── POS Header ────────────────────────────────────── */}
      <div className="flex h-12 flex-shrink-0 items-center gap-4 bg-sidebar px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-extrabold text-white">R</div>
          <span className="text-[13px] font-bold text-white">Rocketly</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-white/60">Venta</span>
          <span className="font-mono text-[13px] font-bold text-white">#{modal ? String(modal.num).padStart(4,"0") : "—"}</span>
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

      {/* ── Error bar ─────────────────────────────────────── */}
      {submitError && (
        <div className="flex items-center justify-between bg-red-600 px-5 py-2 text-[12.5px] font-semibold text-white">
          {submitError}
          <button type="button" onClick={() => setSubmitError(null)} className="text-white/70 hover:text-white">✕</button>
        </div>
      )}

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

        {dropOpen && results.length > 0 && (
          <div className="absolute left-4 right-4 top-full z-20 mt-1 overflow-hidden rounded-xl border border-card-border bg-white shadow-xl">
            {results.map((p, i) => (
              <div key={p.id}
                   className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${i === focusedIdx ? "bg-accent/8" : "hover:bg-gray-50"}`}
                   onMouseEnter={() => setFocusedIdx(i)}
                   onMouseDown={() => addToCart(p)}>
                {p.cat && (
                  <span className="rounded-md px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{ background: CAT_COLORS[p.cat]?.bg ?? "#f1f5f9", color: CAT_COLORS[p.cat]?.color ?? "#475569" }}>
                    {p.cat}
                  </span>
                )}
                <span className="flex-1 text-[13.5px] font-semibold text-foreground">{p.name}</span>
                {p.code && <span className="font-mono text-[11px] text-muted">{p.code}</span>}
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
            Sin resultados para &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* ── Body: Cart + Pay ────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Cart panel */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-card-border">
          <div className="grid flex-shrink-0 items-center gap-3 border-b border-card-border bg-white px-4 py-2"
               style={{ gridTemplateColumns: "1fr 110px 90px 90px 36px" }}>
            {["Producto","Cantidad","Precio unit.","Subtotal",""].map((h, i) => (
              <div key={i} className={`text-[10.5px] font-bold uppercase tracking-[.08em] text-muted ${i >= 2 ? "text-right" : ""}`}>{h}</div>
            ))}
          </div>

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
                      <div>
                        <p className="text-[13.5px] font-semibold text-foreground">{item.name}</p>
                        {item.code && <p className="font-mono text-[11px] text-muted">{item.code}</p>}
                      </div>
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
                      <div className="text-right font-mono text-[13px] text-muted">{fmtARS(item.price)}</div>
                      <div className="text-right font-mono text-[14px] font-bold text-foreground">{fmtARS(item.price * item.qty)}</div>
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

            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">Subtotal</span>
                <span className="font-mono font-semibold text-foreground">{fmtARS(subtotal)}</span>
              </div>
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
                <p className="text-right text-[12px] font-semibold text-emerald-600">Ahorro: −{fmtARS(discAmt)}</p>
              )}
            </div>

            <div className="rounded-xl border-2 border-accent/20 bg-accent/5 px-4 py-3">
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-muted">Total</p>
              <p className="font-mono text-[38px] font-extrabold leading-none tracking-tight text-accent">{fmtARS(total)}</p>
            </div>

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

          <div className="flex-shrink-0 border-t border-card-border p-4">
            <button type="button" onClick={handleCobrar}
                    disabled={cart.length === 0 || submitting || !cajaActiva}
                    className="relative w-full rounded-xl py-3.5 text-[18px] font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90 active:scale-[0.99]"
                    style={{ background: (cart.length > 0 && !submitting && cajaActiva) ? "#4f6ef7" : undefined, boxShadow: (cart.length > 0 && !submitting) ? "0 4px 14px rgba(79,110,247,.35)" : undefined }}>
              {submitting ? "Procesando…" : `Cobrar ${total > 0 ? fmtARS(total) : ""}`}
              {!submitting && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-white/30 bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                  F12
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────── */}
      <div className="flex h-6 flex-shrink-0 items-center gap-4 bg-sidebar px-4 text-[11px] text-white/40">
        <StatusItem label="Comercio" value={perfil?.nombreNegocio ?? "—"} />
        <StatusItem
          label="Caja"
          value={cajaLoading ? "Cargando…" : cajaActiva ? "Abierta" : "Cerrada"}
          valueClass={cajaActiva ? "text-emerald-400" : "text-red-400"}
        />
        <StatusItem label="Usuario" value={perfil?.nombreDueno ?? "—"} />
        <div className="ml-auto flex items-center gap-3">
          {[["F1–F5","método pago"],["F12","cobrar"],["↑↓","navegar"],["+ −","cantidad"]].map(([k,l]) => (
            <span key={k} className="flex items-center gap-1">
              <kbd className="rounded border border-white/15 bg-white/8 px-1 py-px font-mono text-[9.5px]">{k}</kbd>
              <span>{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Caja guard modal ─────────────────────────────────── */}
      {!cajaLoading && !cajaActiva && (
        <AbrirCajaModal
          onAbrir={handleAbrirCaja}
          loading={abrirLoading}
          error={abrirError}
        />
      )}

      {/* ── Success modal ────────────────────────────────────── */}
      {modal && <SuccessModal sale={modal} onNuevaVenta={handleNuevaVenta} />}
    </div>
  );
}

/* ── Abrir caja modal ──────────────────────────────────────────── */

function AbrirCajaModal({
  onAbrir, loading, error,
}: {
  onAbrir: (monto: number) => void; loading: boolean; error: string | null;
}) {
  const [monto, setMonto] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-sidebar">
          <IconCash className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-[18px] font-extrabold tracking-tight text-foreground">Abrí la caja primero</h2>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-muted">
          Ingresá el monto inicial de efectivo para comenzar el turno.
        </p>
        <div className="mt-5 space-y-2">
          <label className="text-[11.5px] font-bold uppercase tracking-[.04em] text-foreground/60">
            Monto inicial
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg font-bold text-muted">$</span>
            <input
              type="number"
              min={0}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAbrir(parseFloat(monto) || 0)}
              placeholder="0"
              className="h-[52px] w-full rounded-xl border-2 border-card-border bg-white pl-9 font-mono text-[22px] font-extrabold text-foreground outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,110,247,.12)]"
              autoFocus
            />
          </div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => onAbrir(parseFloat(monto) || 0)}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 text-[15px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Abriendo…" : "Abrir caja"}
        </button>
      </div>
    </div>
  );
}

/* ── Method button ─────────────────────────────────────────────── */

function MethodBtn({ method, selected, onSelect, fullWidth }: {
  method: PayMethod; selected: boolean; onSelect: () => void; fullWidth?: boolean;
}) {
  const cfg = METHOD_DISPLAY[method];
  return (
    <button type="button" onClick={onSelect}
            className={[
              "flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all",
              selected ? "shadow-sm" : "border-card-border bg-white hover:border-gray-300",
              fullWidth ? "col-span-2" : "",
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
  const cfg   = METHOD_DISPLAY[sale.method];
  const shown = sale.items.slice(0, 4);
  const extra = sale.items.length - 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
         onClick={onNuevaVenta}>
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl"
           onClick={(e) => e.stopPropagation()}
           style={{ animation: "fadeSlideIn .25s ease" }}>
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
        <div className="flex items-center justify-between border-t border-b border-card-border px-5 py-3">
          <span className="text-[14px] font-bold text-foreground">Total cobrado</span>
          <span className="font-mono text-[28px] font-extrabold text-foreground">{fmtARS(sale.total)}</span>
        </div>
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
      <rect x="2" y="7" width="20" height="14" rx="3" /><path d="M8 7V5a4 4 0 018 0v2" />
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
function IconCash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="13" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 6V4M18 6V4" />
    </svg>
  );
}
