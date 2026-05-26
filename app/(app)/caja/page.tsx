"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useProductosStore } from "@/lib/store/productosStore";
import { useCajaStore } from "@/lib/store/cajaStore";
import { useAuthStore } from "@/lib/store/authStore";
import { createVenta } from "@/lib/api/ventas";
import { createProducto } from "@/lib/api/productos";
import { getTicket, imprimirTicket } from "@/lib/api/tickets";
import type { TicketData, ImprimirConfig } from "@/lib/api/tickets";
import { descargarTicketPdf, whatsappTicketUrl, mailtoTicketUrl } from "@/lib/utils/ticket-pdf";
import { getGastos, createGasto } from "@/lib/api/caja";
import { getClientes, createCliente } from "@/lib/api/clientes";
import { ApiError } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useCierreCajaReporte } from "@/lib/hooks/useCierreCajaReporte";
import type { MetodoPago, Gasto, Cliente, ClienteConDeuda } from "@/lib/types";

/* ── Types ─────────────────────────────────────────────────────── */

interface CatalogItem {
  id: string; name: string; cat: string | null;
  code: string | null; price: number; stock: number;
}

interface CartItem extends CatalogItem {
  qty: number; cartId: number;
}

type PayMethod = "efectivo" | "debito" | "credito" | "transf" | "mp" | "fiado";
type DiscType  = "pct" | "amt";

interface SaleModal {
  ventaId: string;
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
  fiado:    { label:"Fiado",         kbd:"F6", color:"#b45309", bg:"rgba(245,158,11,.12)", border:"rgba(245,158,11,.4)" },
};

const METHOD_MAP: Record<PayMethod, MetodoPago> = {
  efectivo: "EFECTIVO",
  debito:   "DEBITO",
  credito:  "CREDITO",
  transf:   "TRANSFERENCIA",
  mp:       "MERCADO_PAGO",
  fiado:    "FIADO",
};

const METHOD_FROM_API: Record<MetodoPago, PayMethod> = {
  EFECTIVO:      "efectivo",
  DEBITO:        "debito",
  CREDITO:       "credito",
  TRANSFERENCIA: "transf",
  MERCADO_PAGO:  "mp",
  FIADO:         "fiado",
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
  const [abrirOpen,    setAbrirOpen]    = useState(false);
  const [abrirLoading, setAbrirLoading] = useState(false);
  const [abrirError,   setAbrirError]   = useState<string | null>(null);

  // Caja close modal state
  const [cerrarOpen, setCerrarOpen] = useState(false);

  // Gastos state
  const [gastosOpen,   setGastosOpen]   = useState(false);
  const [gastos,       setGastos]       = useState<Gasto[]>([]);
  const [gastoDesc,    setGastoDesc]    = useState("");
  const [gastoMonto,   setGastoMonto]   = useState("");
  const [gastoLoading, setGastoLoading] = useState(false);
  const [gastoError,   setGastoError]   = useState<string | null>(null);

  // Search state
  const [query,      setQuery]      = useState("");
  const [dropOpen,   setDropOpen]   = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // Barcode scanner buffer
  const barcodeBuffer    = useRef<string>("");
  const barcodeLastKeyAt = useRef<number>(0);

  // Cliente state
  const [selectedCliente, setSelectedCliente] = useState<ClienteConDeuda | null>(null);
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteDropOpen, setClienteDropOpen] = useState(false);
  const [clienteResults, setClienteResults] = useState<ClienteConDeuda[]>([]);
  const [clienteSearching, setClienteSearching] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const clienteSearchRef = useRef<HTMLInputElement>(null);
  const debouncedClienteQuery = useDebouncedValue(clienteQuery, 250);

  // Nuevo producto desde barcode (no encontrado en catálogo, buscado en Open Food Facts)
  const [nuevoProductoOpen, setNuevoProductoOpen] = useState(false);
  const [nuevoProductoScan, setNuevoProductoScan] = useState<{
    sku: string; nombre: string; marca: string; imagen: string;
  } | null>(null);
  const nuevoProductoOpenRef = useRef(false);
  useEffect(() => { nuevoProductoOpenRef.current = nuevoProductoOpen; }, [nuevoProductoOpen]);

  // Fetch matching clientes (with deuda) when the debounced query changes
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const q = debouncedClienteQuery.trim();
      if (!q) { setClienteResults([]); setClienteSearching(false); return; }
      setClienteSearching(true);
      getClientes({ search: q, conDeuda: true })
        .then((res) => { if (!cancelled) setClienteResults(res as ClienteConDeuda[]); })
        .catch(() => { if (!cancelled) setClienteResults([]); })
        .finally(() => { if (!cancelled) setClienteSearching(false); });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [debouncedClienteQuery]);

  // Ensure products are loaded when entering the POS (refreshes stock levels)
  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  /* ── Derived ─────────────────────────────────────────────── */

  const effectiveMethod: PayMethod = !selectedCliente && method === "fiado" ? "efectivo" : method;

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
    setSelectedCliente(null);
    setClienteQuery("");
    setClienteDropOpen(false);
  }

  /* ── Gastos ─────────────────────────────────────────────── */

  const fetchGastos = useCallback(async () => {
    if (!cajaActiva) return;
    try {
      const res = await getGastos(cajaActiva.id);
      setGastos(res ?? []);
    } catch {}
  }, [cajaActiva]);

  useEffect(() => {
    if (!gastosOpen || !cajaActiva) return;
    const id = cajaActiva.id;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try { const res = await getGastos(id); if (!cancelled) setGastos(res ?? []); } catch {}
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [gastosOpen, cajaActiva]);

  async function handleAddGasto() {
    if (!cajaActiva || !gastoDesc.trim() || !gastoMonto) return;
    const monto = parseFloat(gastoMonto);
    if (isNaN(monto) || monto <= 0) return;
    setGastoLoading(true);
    setGastoError(null);
    try {
      await createGasto(cajaActiva.id, gastoDesc.trim(), monto);
      setGastoDesc("");
      setGastoMonto("");
      await fetchGastos();
    } catch (e) {
      setGastoError(e instanceof ApiError ? e.message : "Error al registrar gasto");
    } finally {
      setGastoLoading(false);
    }
  }

  const gastoTotal = gastos.reduce((s, g) => s + g.monto, 0);

  /* ── Caja guard ──────────────────────────────────────────── */

  async function handleAbrirCaja(montoInicial: number) {
    setAbrirLoading(true);
    setAbrirError(null);
    try {
      await abrir(montoInicial);
      setAbrirOpen(false);
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
        metodoPago: METHOD_MAP[effectiveMethod],
        cajaId: cajaActiva.id,
        ...(selectedCliente ? { clienteId: selectedCliente.id } : {}),
      });
      setModal({
        ventaId: venta.id,
        num: venta.numero,
        method: effectiveMethod,
        total: venta.total,
        discAmt: venta.descuento,
        change: effectiveMethod === "efectivo" ? cashAmt - venta.total : null,
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

  /* ── Barcode scanner ────────────────────────────────────── */
  // Las pistolas USB HID tipean caracteres muy rápido (<50 ms entre teclas)
  // y terminan con Enter. Detectamos esa "ráfaga" y la redirigimos al buscador
  // sin importar qué elemento tenga el foco en ese momento.

  const catalogRef    = useRef(catalog);
  const addToCartRef  = useRef(addToCart);
  const modalRef      = useRef(modal);
  useEffect(() => { catalogRef.current   = catalog;    }, [catalog]);
  useEffect(() => { addToCartRef.current = addToCart;  }, [addToCart]);
  useEffect(() => { modalRef.current     = modal;      }, [modal]);

  useEffect(() => {
    const BURST_MS  = 100; // intervalo máximo entre teclas para considerarlas parte del escaneo
    const MIN_CHARS = 4;   // mínimo de caracteres para descartar pulsaciones accidentales

    function onBarcode(e: KeyboardEvent) {
      // No interceptar si hay un modal abierto
      if (modalRef.current || nuevoProductoOpenRef.current) return;

      // Solo caracteres imprimibles (largo 1) + Enter
      const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
      const isEnter     = e.key === "Enter";
      if (!isPrintable && !isEnter) return;

      const now = Date.now();
      const gap = now - barcodeLastKeyAt.current;
      barcodeLastKeyAt.current = now;

      if (isPrintable) {
        // Si el gap es demasiado grande, resetear el buffer (tipeo humano pausado)
        if (gap > 200) barcodeBuffer.current = "";
        barcodeBuffer.current += e.key;
        return;
      }

      // Es Enter — verificar si fue una ráfaga de scanner.
      // Dos condiciones para mayor compatibilidad con distintos modelos:
      // 1. timing: gap ≤ BURST_MS (rápido entre último char y Enter)
      // 2. longitud: exactamente 8 o 13 dígitos (EAN-8 / EAN-13)
      const digitCount = barcodeBuffer.current.replace(/\D/g, "").length;
      const isBarcode  = gap <= BURST_MS || digitCount >= 8;
      if (isEnter && isBarcode && barcodeBuffer.current.length >= MIN_CHARS) {
        const code = barcodeBuffer.current.trim();
        barcodeBuffer.current = "";

        e.preventDefault();

        // Limpiar el input (el scanner pudo haber tipeado el código ahí)
        setQuery("");
        setDropOpen(false);

        // Buscar coincidencia exacta por SKU primero
        const cat = catalogRef.current;
        const exact = cat.find(
          (p) => (p.code ?? "").toLowerCase() === code.toLowerCase()
        );

        if (exact) {
          // Coincidencia exacta → agregar al carrito directamente
          addToCartRef.current(exact);
        } else {
          // Sin coincidencia en catálogo → buscar en Open Food Facts
          void (async () => {
            try {
              const res = await fetch(
                `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,image_front_url`
              );
              if (res.ok) {
                const data = await res.json();
                if (data.status === 1) {
                  const p = data.product;
                  setNuevoProductoScan({
                    sku: code,
                    nombre: p.product_name ?? "",
                    marca:  p.brands ?? "",
                    imagen: p.image_front_url ?? "",
                  });
                  setNuevoProductoOpen(true);
                  return;
                }
              }
            } catch { /* ignorar errores de red */ }
            // No encontrado en OFF ni en catálogo → mostrar en buscador
            setQuery(code);
            setDropOpen(true);
            setFocusedIdx(0);
            searchRef.current?.focus();
          })();
        }
      } else {
        // Enter que no es de scanner → limpiar buffer
        barcodeBuffer.current = "";
      }
    }

    window.addEventListener("keydown", onBarcode, { capture: true });
    return () => window.removeEventListener("keydown", onBarcode, { capture: true });
  // Solo se monta/desmonta una vez — los refs se mantienen actualizados
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Keyboard ────────────────────────────────────────────── */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (modal) {
        if (e.key === "Escape") { handleNuevaVenta(); }
        return;
      }
      if (quickCreateOpen) {
        if (e.key === "Escape") { setQuickCreateOpen(false); }
        return;
      }
      if (nuevoProductoOpen) {
        if (e.key === "Escape") { setNuevoProductoOpen(false); setNuevoProductoScan(null); }
        return;
      }
      const fMap: Record<string, PayMethod> = { F1:"efectivo", F2:"debito", F3:"credito", F4:"transf", F5:"mp" };
      if (fMap[e.key]) { e.preventDefault(); setMethod(fMap[e.key]); return; }
      if (e.key === "F6") { e.preventDefault(); if (selectedCliente) setMethod("fiado"); return; }
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
  }, [cart, selectedRow, modal, total, method, cajaActiva, submitting, selectedCliente, quickCreateOpen, nuevoProductoOpen]);

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
          {(["F1","F2","F3","F4","F5","F6","F12"] as const).map((k) => (
            <span key={k} className="rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-white/40">{k}</span>
          ))}
          <div className="ml-2 h-4 w-px bg-white/10" />
          <button type="button" onClick={clearCart}
                  className="rounded-md border border-white/15 bg-white/8 px-3 py-1 text-[12px] font-semibold text-white/60 hover:bg-white/15 transition-colors">
            Cancelar
          </button>
          {cajaActiva ? (
            <button type="button" onClick={() => setCerrarOpen(true)}
                    className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1 text-[12px] font-semibold text-white hover:bg-white/20 transition-colors">
              <IconLockSmall className="h-3 w-3" />
              Cerrar caja
            </button>
          ) : !cajaLoading ? (
            <button type="button" onClick={() => { setAbrirOpen(true); setAbrirError(null); }}
                    className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1 text-[12px] font-semibold text-white hover:opacity-90 transition-opacity">
              <IconCash className="h-3 w-3" />
              Abrir caja
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Error bar ─────────────────────────────────────── */}
      {submitError && (
        <div className="flex items-center justify-between bg-red-600 px-5 py-2 text-[12.5px] font-semibold text-white">
          {submitError}
          <button type="button" onClick={() => setSubmitError(null)} className="text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {!cajaLoading && !cajaActiva ? (
        /* ── Caja cerrada empty state ─────────────────────── */
        <div className="flex flex-1 items-center justify-center bg-main-bg">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <IconCash className="h-6 w-6 text-muted" />
            </div>
            <p className="text-[16px] font-extrabold text-foreground">La caja está cerrada</p>
            <p className="text-[13px] text-muted">
              Abrí una caja para empezar a registrar ventas. También podés navegar a otras secciones desde el menú.
            </p>
            <button type="button" onClick={() => { setAbrirOpen(true); setAbrirError(null); }}
                    className="mt-1 flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              <IconCash className="h-4 w-4" />
              Abrir caja
            </button>
          </div>
        </div>
      ) : <>

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
        <div className="flex w-[380px] flex-shrink-0 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto">

            {/* Total — anchor */}
            <div className="border-b border-card-border px-5 pt-5 pb-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted">Total a cobrar</p>
              <p className="mt-1.5 font-mono text-[44px] font-extrabold leading-none tracking-tight text-foreground">
                {fmtARS(total)}
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[12px] text-muted">
                <span>Subtotal <span className="font-mono text-foreground/70">{fmtARS(subtotal)}</span></span>
                {discAmt > 0 && (
                  <span className="font-semibold text-emerald-600">−{fmtARS(discAmt)}</span>
                )}
              </div>
            </div>

            {/* Cliente */}
            <div className="border-b border-card-border px-5 py-4">
              <ClienteSelector
                cliente={selectedCliente}
                query={clienteQuery}
                setQuery={setClienteQuery}
                dropOpen={clienteDropOpen}
                setDropOpen={setClienteDropOpen}
                results={clienteResults}
                searching={clienteSearching}
                inputRef={clienteSearchRef}
                onSelect={(c) => {
                  setSelectedCliente(c);
                  setClienteQuery("");
                  setClienteDropOpen(false);
                }}
                onClear={() => {
                  setSelectedCliente(null);
                  setClienteQuery("");
                }}
                onOpenQuickCreate={() => setQuickCreateOpen(true)}
              />
            </div>

            {/* Method */}
            <div className="border-b border-card-border px-5 py-4">
              <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted">Método de pago</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["efectivo","debito","credito","transf","mp","fiado"] as PayMethod[]).map((m) => (
                  <MethodBtn
                    key={m}
                    method={m}
                    selected={effectiveMethod === m}
                    onSelect={() => {
                      if (m === "fiado" && !selectedCliente) return;
                      setMethod(m);
                    }}
                    disabled={m === "fiado" && !selectedCliente}
                  />
                ))}
              </div>
              {!selectedCliente && (
                <p className="mt-2 text-[11px] text-muted">Seleccioná un cliente para habilitar fiado.</p>
              )}
            </div>

            {/* Per-method block */}
            {effectiveMethod === "efectivo" && (
              <div className="border-b border-card-border px-5 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted">Con cuánto paga</p>
                  {cash && (
                    <span className={`font-mono text-[12px] font-bold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {change >= 0 ? `Vuelto ${fmtARS(change)}` : "Insuficiente"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-muted">$</span>
                  <input type="text" value={cash}
                         onChange={(e) => setCash(e.target.value)}
                         placeholder={String(total)}
                         className="h-[40px] w-full rounded-lg border border-card-border bg-white pl-7 font-mono text-[15px] font-semibold text-foreground outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CASH_PRESETS.filter((p) => p >= total * 0.5).slice(0, 4).map((p) => (
                    <button key={p} type="button" onClick={() => setCash(String(p))}
                            className="rounded-md border border-card-border bg-gray-50 px-2.5 py-1 font-mono text-[12px] font-semibold text-foreground/80 hover:bg-gray-100 hover:text-foreground transition-colors">
                      {fmtARS(p)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {effectiveMethod === "fiado" && selectedCliente && (
              <div className="border-b border-card-border bg-amber-50/50 px-5 py-3.5">
                <p className="text-[12px] font-semibold text-amber-800">
                  Se sumará a la deuda de {selectedCliente.nombre}.
                </p>
                <p className="mt-1 font-mono text-[11.5px] text-amber-700/90">
                  {fmtARS(selectedCliente.deuda ?? 0)} → <span className="font-bold">{fmtARS((selectedCliente.deuda ?? 0) + total)}</span>
                </p>
              </div>
            )}

            {/* Discount — secondary */}
            <div className="border-b border-card-border px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted">Descuento</p>
                <div className="flex items-center gap-1.5">
                  {(["pct","amt"] as DiscType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setDiscType(t)}
                            className={`h-7 w-7 rounded-md border text-[12px] font-bold transition-colors ${discType === t ? "border-accent bg-accent text-white" : "border-card-border bg-white text-muted hover:border-gray-300"}`}>
                      {t === "pct" ? "%" : "$"}
                    </button>
                  ))}
                  <input type="number" min={0} value={discount}
                         onChange={(e) => setDiscount(e.target.value)}
                         placeholder="0"
                         className="h-7 w-16 rounded-md border border-card-border bg-white px-2 text-right font-mono text-[13px] font-semibold text-foreground outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          </div>

          {/* Gastos del turno */}
          {cajaActiva && (
            <div className="flex-shrink-0 border-t border-card-border">
              <button type="button"
                      onClick={() => setGastosOpen((v) => !v)}
                      className="flex w-full items-center justify-between px-5 py-3 text-[12.5px] font-semibold text-foreground hover:bg-gray-50 transition-colors">
                <span className="flex items-center gap-2">
                  <IconExpense className="h-3.5 w-3.5 text-muted" />
                  Gastos del turno
                  {gastos.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      {gastos.length}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-muted">
                  {gastoTotal > 0 && <span className="font-mono text-amber-600">−{fmtARS(gastoTotal)}</span>}
                  <span className={`transition-transform ${gastosOpen ? "rotate-180" : ""}`}>▾</span>
                </span>
              </button>

              {gastosOpen && (
                <div className="border-t border-card-border bg-gray-50/60 px-5 py-4 space-y-3">
                  {/* Form */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={gastoDesc}
                      onChange={(e) => setGastoDesc(e.target.value)}
                      placeholder="Descripción (ej: pago de servicio)"
                      className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted outline-none focus:border-accent"
                    />
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-muted">$</span>
                        <input
                          type="number"
                          min={0}
                          value={gastoMonto}
                          onChange={(e) => setGastoMonto(e.target.value)}
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-card-border bg-white pl-7 font-mono text-[13px] font-semibold text-foreground outline-none focus:border-accent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddGasto}
                        disabled={gastoLoading || !gastoDesc.trim() || !gastoMonto}
                        className="rounded-lg bg-accent px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {gastoLoading ? "…" : "Agregar"}
                      </button>
                    </div>
                    {gastoError && <p className="text-[12px] font-semibold text-red-600">{gastoError}</p>}
                  </div>

                  {/* List */}
                  {gastos.length > 0 && (
                    <div className="space-y-1.5">
                      {gastos.map((g) => (
                        <div key={g.id} className="flex items-center justify-between rounded-lg border border-card-border bg-white px-3 py-2 text-[12.5px]">
                          <span className="truncate text-foreground">{g.descripcion}</span>
                          <span className="ml-3 flex-shrink-0 font-mono font-semibold text-amber-600">−{fmtARS(g.monto)}</span>
                        </div>
                      ))}
                      <p className="text-right text-[11.5px] font-bold text-amber-700">
                        Total gastos: {fmtARS(gastoTotal)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
      </>}

      {/* ── Status bar ──────────────────────────────────────── */}
      <div className="flex h-6 flex-shrink-0 items-center gap-4 bg-sidebar px-4 text-[11px] text-white/40">
        <StatusItem label="Comercio" value={perfil?.tenantNombreDisplay || perfil?.tenantNombre || "—"} />
        <StatusItem
          label="Caja"
          value={cajaLoading ? "Cargando…" : cajaActiva ? "Abierta" : "Cerrada"}
          valueClass={cajaActiva ? "text-emerald-400" : "text-red-400"}
        />
        <StatusItem label="Usuario" value={perfil?.nombreDueno ?? "—"} />
        <div className="ml-auto flex items-center gap-3">
          {[["F1–F5","método pago"],["F6","fiado"],["F12","cobrar"],["↑↓","navegar"],["+ −","cantidad"]].map(([k,l]) => (
            <span key={k} className="flex items-center gap-1">
              <kbd className="rounded border border-white/15 bg-white/8 px-1 py-px font-mono text-[9.5px]">{k}</kbd>
              <span>{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Abrir caja modal ─────────────────────────────────── */}
      {abrirOpen && (
        <AbrirCajaModal
          onAbrir={handleAbrirCaja}
          onClose={() => { setAbrirOpen(false); setAbrirError(null); }}
          loading={abrirLoading}
          error={abrirError}
        />
      )}

      {/* ── Cerrar caja modal ────────────────────────────────── */}
      {cerrarOpen && cajaActiva && (
        <CerrarCajaModal
          cajaId={cajaActiva.id}
          onClose={() => setCerrarOpen(false)}
          onCerrada={() => setCerrarOpen(false)}
        />
      )}

      {/* ── Success modal ────────────────────────────────────── */}
      {modal && <SuccessModal sale={modal} onNuevaVenta={handleNuevaVenta} />}

      {/* ── Quick-create cliente modal ───────────────────────── */}
      {quickCreateOpen && (
        <ClienteQuickCreateModal
          onClose={() => setQuickCreateOpen(false)}
          onCreated={(c) => {
            setSelectedCliente({ ...c, deuda: 0 });
            setQuickCreateOpen(false);
            setClienteQuery("");
            setClienteDropOpen(false);
          }}
        />
      )}

      {/* ── Nuevo producto desde barcode (Open Food Facts) ──── */}
      {nuevoProductoOpen && nuevoProductoScan && (
        <NuevoProductoCajaModal
          sku={nuevoProductoScan.sku}
          nombre={nuevoProductoScan.nombre}
          marca={nuevoProductoScan.marca}
          imagen={nuevoProductoScan.imagen}
          onClose={() => { setNuevoProductoOpen(false); setNuevoProductoScan(null); }}
          onCreated={(p) => {
            fetchProductos();
            addToCart(p);
            setNuevoProductoOpen(false);
            setNuevoProductoScan(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Cliente selector ──────────────────────────────────────────── */

function ClienteSelector({
  cliente, query, setQuery, dropOpen, setDropOpen, results, searching,
  inputRef, onSelect, onClear, onOpenQuickCreate,
}: {
  cliente: ClienteConDeuda | null;
  query: string;
  setQuery: (v: string) => void;
  dropOpen: boolean;
  setDropOpen: (v: boolean) => void;
  results: ClienteConDeuda[];
  searching: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (c: ClienteConDeuda) => void;
  onClear: () => void;
  onOpenQuickCreate: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">Cliente</p>

      {cliente ? (
        <div className="flex items-center gap-2 rounded-lg border border-card-border bg-gray-50/60 px-3 py-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <IconUser className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{cliente.nombre}</p>
            {(cliente.deuda ?? 0) > 0 ? (
              <p className="text-[11px] text-amber-600">
                Deuda: <span className="font-mono font-semibold">{fmtARS(cliente.deuda)}</span>
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600">Al día</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
            aria-label="Quitar cliente"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)}
                onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                placeholder="Buscar cliente…"
                className="h-9 w-full rounded-lg border border-card-border bg-white pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <button
              type="button"
              onClick={onOpenQuickCreate}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-card-border bg-white text-muted hover:bg-gray-50 hover:text-foreground transition-colors"
              aria-label="Crear cliente"
              title="Crear cliente"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>

          {dropOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-card-border bg-white shadow-xl">
              {searching ? (
                <div className="px-4 py-3 text-[12px] text-muted">Buscando…</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-[12px] text-muted">
                  Sin resultados.
                  <button
                    type="button"
                    onMouseDown={onOpenQuickCreate}
                    className="ml-1 font-semibold text-accent hover:underline"
                  >
                    Crear &ldquo;{query.trim()}&rdquo;
                  </button>
                </div>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => onSelect(c)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-muted">
                      <IconUser className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-foreground">{c.nombre}</p>
                      {c.telefono && <p className="font-mono text-[10.5px] text-muted">{c.telefono}</p>}
                    </div>
                    {c.deuda > 0 && (
                      <span className="font-mono text-[11px] font-semibold text-amber-600">
                        {fmtARS(c.deuda)}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Nuevo producto desde barcode ──────────────────────────────── */

function NuevoProductoCajaModal({
  sku, nombre: nombreInit, marca: marcaInit, imagen: imagenInit,
  onClose, onCreated,
}: {
  sku: string;
  nombre: string;
  marca: string;
  imagen: string;
  onClose: () => void;
  onCreated: (p: CatalogItem) => void;
}) {
  const [nombre,    setNombre]    = useState(nombreInit);
  const [marca,     setMarca]     = useState(marcaInit);
  const [imagen,    setImagen]    = useState(imagenInit);
  const [precio,    setPrecio]    = useState("");
  const [costo,     setCosto]     = useState("");
  const [stock,     setStock]     = useState("0");
  const [categoria, setCategoria] = useState("Bebidas");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit() {
    if (!nombre.trim()) { setError("El nombre es requerido"); return; }
    const precioNum = parseFloat(precio);
    if (!precio || isNaN(precioNum) || precioNum <= 0) { setError("El precio es requerido"); return; }
    setSaving(true); setError(null);
    try {
      const p = await createProducto({
        nombre:    nombre.trim(),
        marca:     marca.trim() || null,
        imagen:    imagen.trim() || null,
        sku:       sku || null,
        precio:    precioNum,
        costo:     costo ? parseFloat(costo) : null,
        stock:     parseInt(stock) || 0,
        categoria: categoria || null,
        activo:    true,
      });
      onCreated({ id: p.id, name: p.nombre, cat: p.categoria, code: p.sku, price: p.precio, stock: p.stock });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeSlideIn .25s ease" }}
      >
        <div className="border-b border-card-border px-6 py-5">
          <h2 className="text-[16px] font-bold text-foreground">Nuevo producto</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Código: <span className="font-mono font-semibold text-foreground">{sku}</span>
          </p>
        </div>

        {(imagen || nombre || marca) && (
          <div className="flex items-center gap-3 border-b border-card-border bg-accent/5 px-6 py-3">
            {imagen && (
              <img
                src={imagen}
                alt=""
                className="h-14 w-14 flex-shrink-0 rounded-lg border border-card-border bg-white object-contain"
              />
            )}
            <div>
              <p className="text-[11.5px] font-semibold text-accent">Datos de Open Food Facts</p>
              {nombre && <p className="text-[13px] font-bold text-foreground">{nombre}</p>}
              {marca  && <p className="text-[12px] text-muted">{marca}</p>}
            </div>
          </div>
        )}

        <div className="space-y-3 px-6 py-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">Marca</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
                Precio <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                autoFocus
                min={0}
                step={0.01}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">Costo</label>
              <input
                type="number"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                min={0}
                step={0.01}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                min={0}
                step={1}
                className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              >
                <option value="">Sin categoría</option>
                <option>Bebidas</option>
                <option>Golosinas</option>
                <option>Tabaco</option>
                <option>Almacén</option>
                <option>Panadería</option>
                <option>Lácteos</option>
              </select>
            </div>
          </div>

          {error && <p className="text-[12.5px] font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-card-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !nombre.trim() || !precio}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Guardando…" : "Guardar y agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Quick-create cliente modal ─────────────────────────────────── */

function ClienteQuickCreateModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Cliente) => void;
}) {
  const [nombre, setNombre]     = useState("");
  const [telefono, setTelefono] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit() {
    if (!nombre.trim()) { setError("El nombre es requerido"); return; }
    setSubmitting(true); setError(null);
    try {
      const c = await createCliente({
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
      });
      onCreated(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear cliente");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeSlideIn .25s ease" }}
      >
        <div className="border-b border-card-border px-6 py-5">
          <h2 className="text-[16px] font-bold text-foreground">Nuevo cliente</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">Solo el nombre es obligatorio.</p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
              className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Teléfono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
          {error && <p className="text-[12.5px] font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-card-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-card-border bg-white py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !nombre.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Creando…" : "Crear y seleccionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Cerrar caja modal ─────────────────────────────────────────── */

function CerrarCajaModal({
  cajaId, onClose, onCerrada,
}: {
  cajaId: string;
  onClose: () => void;
  onCerrada: () => void;
}) {
  const { cerrar } = useCajaStore();
  const { data: reporte, loading: reporteLoading } = useCierreCajaReporte(cajaId);

  const [cashCounted, setCashCounted] = useState("");
  const [note,        setNote]        = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const totales     = reporte?.totales;
  const efectivoRow = reporte?.porMetodo.find((r) => r.metodoPago === "EFECTIVO");
  const efectivoAmt = efectivoRow?.total ?? 0;

  const cashNum  = parseFloat(cashCounted) || null;
  const cashDiff = cashNum !== null ? cashNum - efectivoAmt : null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await cerrar(cashNum ?? 0, note || undefined);
      onCerrada();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al cerrar la caja");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[3px]"
         onClick={() => !submitting && onClose()}>
      <div className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
           onClick={(e) => e.stopPropagation()}
           style={{ animation: "fadeSlideIn .2s ease" }}>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-card-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sidebar">
              <IconCloseLock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-foreground">Cerrar caja del día</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Registra el resumen definitivo del turno. No se podrán agregar más ventas.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting}
                  className="rounded-md p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {reporteLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted">Cargando resumen…</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2">
                <CerrarKPI label="Facturado"
                  value={fmtARS(totales?.totalFact ?? 0)}
                  sub={`${totales?.cantVentas ?? 0} venta${(totales?.cantVentas ?? 0) !== 1 ? "s" : ""}`} accent />
                <CerrarKPI label="Ticket promedio"
                  value={(totales?.cantVentas ?? 0) > 0 ? fmtARS(totales?.ticketPromedio ?? 0) : "—"}
                  sub="Por venta" />
                <CerrarKPI label="Efectivo en caja"
                  value={fmtARS(efectivoAmt)}
                  sub={`${efectivoRow?.cantidad ?? 0} cobros`} />
              </div>

              {/* Desglose */}
              {reporte && reporte.porMetodo.length > 0 && (
                <div>
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.1em] text-muted">Desglose por método</p>
                  <div className="space-y-2 rounded-xl border border-card-border p-3.5">
                    {reporte.porMetodo.map((row) => {
                      const cfg = METHOD_DISPLAY[METHOD_FROM_API[row.metodoPago]];
                      const totalFact = totales?.totalFact ?? 0;
                      const pct = totalFact > 0 ? Math.round((row.total / totalFact) * 100) : 0;
                      return (
                        <div key={row.metodoPago}>
                          <div className="mb-1 flex items-center justify-between text-[12px] font-semibold">
                            <span style={{ color: cfg.color }}>{cfg.label}</span>
                            <span className="font-mono text-foreground">{fmtARS(row.total)} <span className="text-muted">· {pct}%</span></span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full transition-all duration-300"
                                 style={{ width: `${pct}%`, background: cfg.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Anulaciones */}
              {(totales?.anuladasCount ?? 0) > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div>
                    <p className="text-[12px] font-bold text-red-700">Anulaciones</p>
                    <p className="text-[11.5px] text-red-600/80">{totales!.anuladasCount} venta{totales!.anuladasCount !== 1 ? "s" : ""} anulada{totales!.anuladasCount !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="font-mono text-[14px] font-extrabold text-red-600">{fmtARS(totales!.totalAnulado)}</p>
                </div>
              )}

              {/* Conteo de efectivo */}
              <div>
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[.1em] text-muted">Conteo de efectivo</p>
                <div className="space-y-3 rounded-xl border border-card-border p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <CashSlot label="Sistema" value={fmtARS(efectivoAmt)} muted />
                    <CashSlot label="Contado" value={cashNum !== null ? fmtARS(cashNum) : "—"}
                      tone={cashNum !== null ? (cashDiff! >= 0 ? "ok" : "bad") : "muted"} />
                    <CashSlot label="Diferencia"
                      value={cashDiff === null ? "—" : cashDiff === 0 ? "Exacto" : `${cashDiff > 0 ? "+" : ""}${fmtARS(cashDiff)}`}
                      tone={cashDiff === null ? "muted" : cashDiff > 0 ? "ok" : cashDiff < 0 ? "bad" : "neutral"} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold uppercase tracking-[.06em] text-foreground/60">
                      ¿Cuánto contaste en la caja?
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-muted">$</span>
                      <input
                        type="number" min={0} value={cashCounted}
                        onChange={(e) => setCashCounted(e.target.value)}
                        placeholder={String(Math.round(efectivoAmt))}
                        autoFocus
                        className="h-[44px] w-full rounded-lg border border-card-border bg-white pl-8 font-mono text-[16px] font-bold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase tracking-[.06em] text-foreground/60">
                  Observaciones <span className="font-medium normal-case tracking-normal text-muted">(opcional)</span>
                </label>
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  placeholder="Ej: Faltante por cambio de $500 que quedó pendiente…"
                  className="w-full resize-none rounded-lg border border-card-border bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>

              {error && <p className="text-[12.5px] font-semibold text-red-600">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-card-border px-6 py-4">
          <button type="button" onClick={onClose} disabled={submitting}
                  className="flex-1 rounded-lg border border-card-border bg-white py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={submitting || reporteLoading}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-sidebar py-2.5 text-sm font-extrabold text-white hover:bg-sidebar-dark transition-colors disabled:opacity-50">
            <IconCloseLock className="h-4 w-4" />
            {submitting ? "Cerrando…" : "Cerrar caja del día"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CerrarKPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-card-border bg-gray-50/60 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[.06em] text-muted">{label}</p>
      <p className={`mt-0.5 font-mono text-[15px] font-extrabold leading-tight ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
      <p className="text-[10.5px] text-muted">{sub}</p>
    </div>
  );
}

function CashSlot({ label, value, tone, muted }: { label: string; value: string; tone?: "ok" | "bad" | "neutral" | "muted"; muted?: boolean }) {
  const t = tone ?? (muted ? "muted" : "neutral");
  const cls =
    t === "ok"      ? "text-emerald-600" :
    t === "bad"     ? "text-red-500"     :
    t === "muted"   ? "text-muted"       :
                      "text-foreground";
  return (
    <div className="rounded-lg border border-card-border bg-white px-3 py-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[.06em] text-muted">{label}</p>
      <p className={`mt-0.5 font-mono text-[13px] font-extrabold leading-tight ${cls}`}>{value}</p>
    </div>
  );
}

/* ── Abrir caja modal ──────────────────────────────────────────── */

function AbrirCajaModal({
  onAbrir, onClose, loading, error,
}: {
  onAbrir: (monto: number) => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [monto, setMonto] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px]"
         onClick={() => !loading && onClose()}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl"
           onClick={(e) => e.stopPropagation()}
           style={{ animation: "fadeSlideIn .2s ease" }}>
        <button type="button" onClick={onClose} disabled={loading}
                className="absolute right-3 top-3 rounded-md p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground disabled:opacity-40">
          <IconX className="h-4 w-4" />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-sidebar">
          <IconCash className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-[18px] font-extrabold tracking-tight text-foreground">Abrir caja</h2>
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

function MethodBtn({ method, selected, onSelect, disabled }: {
  method: PayMethod; selected: boolean; onSelect: () => void; disabled?: boolean;
}) {
  const cfg = METHOD_DISPLAY[method];
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={[
        "relative flex h-[54px] w-full flex-col items-center justify-center rounded-lg border text-[12px] font-semibold transition-all",
        selected
          ? "text-white shadow-sm"
          : "border-card-border bg-white text-foreground/75 hover:border-gray-300 hover:bg-gray-50",
        disabled ? "cursor-not-allowed opacity-30 hover:border-card-border hover:bg-white" : "",
      ].join(" ")}
      style={selected ? { background: cfg.color, borderColor: cfg.color } : undefined}
    >
      <span className="leading-tight">{cfg.label}</span>
      <span
        className={`mt-0.5 font-mono text-[9.5px] tracking-wide ${selected ? "text-white/70" : "text-muted/60"}`}
      >
        {cfg.kbd}
      </span>
    </button>
  );
}

/* ── Success modal ─────────────────────────────────────────────── */

function SuccessModal({ sale, onNuevaVenta }: { sale: SaleModal; onNuevaVenta: () => void }) {
  const cfg   = METHOD_DISPLAY[sale.method];
  const shown = sale.items.slice(0, 4);
  const extra = sale.items.length - 4;

  const [ticketOpen,    setTicketOpen]    = useState(false);
  const [ticketData,    setTicketData]    = useState<TicketData | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError,   setTicketError]   = useState<string | null>(null);

  async function handleVerTicket() {
    if (ticketData) { setTicketOpen(true); return; }
    setTicketLoading(true);
    setTicketError(null);
    try {
      const data = await getTicket(sale.ventaId);
      setTicketData(data);
      setTicketOpen(true);
    } catch {
      setTicketError("No se pudo cargar el ticket");
    } finally {
      setTicketLoading(false);
    }
  }

  return (
    <>
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
            {ticketError && (
              <p className="text-[12px] font-semibold text-red-500">{ticketError}</p>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-b border-card-border px-5 py-3">
            <span className="text-[14px] font-bold text-foreground">Total cobrado</span>
            <span className="font-mono text-[28px] font-extrabold text-foreground">{fmtARS(sale.total)}</span>
          </div>
          <div className="flex gap-2.5 px-5 py-4">
            <button
              type="button"
              onClick={handleVerTicket}
              disabled={ticketLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-card-border py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              <IconReceipt className="h-4 w-4" />
              {ticketLoading ? "Cargando…" : "Ticket"}
            </button>
            <button type="button" onClick={onNuevaVenta}
                    className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              Nueva venta
            </button>
          </div>
        </div>
      </div>

      {ticketOpen && ticketData && (
        <TicketModal
          data={ticketData}
          onClose={() => setTicketOpen(false)}
        />
      )}
    </>
  );
}

/* ── Ticket modal ──────────────────────────────────────────────── */

const METODO_TICKET: Record<string, string> = {
  EFECTIVO:      "Efectivo",
  DEBITO:        "Tarjeta Débito",
  CREDITO:       "Tarjeta Crédito",
  TRANSFERENCIA: "Transferencia",
  MERCADO_PAGO:  "Mercado Pago",
  FIADO:         "Fiado",
};

function TicketModal({ data, onClose }: { data: TicketData; onClose: () => void }) {
  const { negocio, venta } = data;

  const [printOpen,    setPrintOpen]    = useState(false);
  const [printing,     setPrinting]     = useState(false);
  const [printError,   setPrintError]   = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState(false);

  // Config de impresión
  const [conexion, setConexion] = useState<"network" | "usb">("network");
  const [ip,       setIp]       = useState("");
  const [puerto,   setPuerto]   = useState("9100");

  const fecha = new Date(venta.creadoEn).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const hora = new Date(venta.creadoEn).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit",
  });

  async function handleImprimir() {
    setPrinting(true);
    setPrintError(null);
    setPrintSuccess(false);
    try {
      const config: ImprimirConfig = {
        conexion,
        ...(conexion === "network" ? { ip: ip.trim(), puerto: parseInt(puerto) || 9100 } : {}),
      };
      await imprimirTicket(venta.id, config);
      setPrintSuccess(true);
    } catch (e: any) {
      setPrintError(e?.message ?? "Error al imprimir");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeSlideIn .2s ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <div className="flex items-center gap-2">
            <IconReceipt className="h-5 w-5 text-muted" />
            <p className="text-[15px] font-bold text-foreground">
              Ticket #{String(venta.numero).padStart(4, "0")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Previsualización del ticket — estilo rollo térmico */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div
            className="mx-auto max-w-[300px] rounded-lg bg-white p-5 shadow-sm"
            style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "1.6" }}
          >
            {/* Negocio */}
            <div className="mb-2 text-center">
              <p className="text-[15px] font-extrabold uppercase">{negocio.nombre}</p>
              {negocio.taxId     && <p>CUIT: {negocio.taxId}</p>}
              {negocio.direccion && <p>{negocio.direccion}</p>}
              {negocio.telefono  && <p>Tel: {negocio.telefono}</p>}
            </div>

            <p className="border-t border-dashed border-gray-300 pt-2 text-center text-[11px] text-gray-400">
              {"─".repeat(30)}
            </p>

            {/* Número y fecha */}
            <div className="flex justify-between py-1">
              <span className="font-bold">Ticket #{String(venta.numero).padStart(4, "0")}</span>
              <span className="text-gray-500">{fecha} {hora}</span>
            </div>

            <p className="border-t border-dashed border-gray-300" />

            {/* Items */}
            <div className="py-2 space-y-1.5">
              {venta.items.map((item) => (
                <div key={item.id}>
                  <p className="font-semibold">{item.producto.nombre}</p>
                  <div className="flex justify-between text-[11px] text-gray-600">
                    <span>{item.cantidad} x {fmtARS(item.precioUnitario)}</span>
                    <span className="font-semibold text-foreground">{fmtARS(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="border-t border-dashed border-gray-300" />

            {/* Totales */}
            <div className="py-2 space-y-1">
              {venta.descuento > 0 && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span>Subtotal</span>
                    <span>{fmtARS(venta.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-600">
                    <span>Descuento</span>
                    <span>-{fmtARS(venta.descuento)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-[14px] font-extrabold">
                <span>TOTAL</span>
                <span>{fmtARS(venta.total)}</span>
              </div>
            </div>

            <p className="border-t border-dashed border-gray-300" />

            {/* Método + cierre */}
            <div className="pt-2 text-center">
              <p className="text-[11px] font-semibold uppercase">
                {METODO_TICKET[venta.metodoPago] ?? venta.metodoPago}
              </p>
              <p className="mt-2 text-[10px] text-gray-400">{"·".repeat(30)}</p>
              <p className="mt-1 text-[11px] text-gray-500">¡Gracias por su compra!</p>
            </div>
          </div>
        </div>

        {/* Acciones: PDF, WhatsApp, Email */}
        <div className="flex gap-2 border-t border-card-border px-5 py-3">
          <button
            type="button"
            onClick={() => descargarTicketPdf(data)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-card-border py-2.5 text-[12.5px] font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            <IconDownload className="h-3.5 w-3.5" />
            PDF
          </button>
          <a
            href={whatsappTicketUrl(data)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-card-border py-2.5 text-[12.5px] font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            <IconWhatsApp className="h-3.5 w-3.5" />
            WhatsApp
          </a>
          <a
            href={mailtoTicketUrl(data)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-card-border py-2.5 text-[12.5px] font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            <IconMail className="h-3.5 w-3.5" />
            Email
          </a>
        </div>

        {/* Configuración de impresión (colapsable) */}
        <div className="border-t border-card-border">
          <button
            type="button"
            onClick={() => setPrintOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-[12.5px] font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <IconPrinter className="h-3.5 w-3.5 text-muted" />
              Configuración de impresión
            </span>
            <span className={`text-muted transition-transform ${printOpen ? "rotate-180" : ""}`}>▾</span>
          </button>

          {printOpen && (
            <div className="border-t border-card-border bg-gray-50/60 px-5 py-4 space-y-3">
              {/* Tipo de conexión */}
              <div className="flex gap-2">
                {(["network", "usb"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConexion(t)}
                    className={[
                      "flex-1 rounded-lg border py-2 text-[12px] font-semibold transition-colors",
                      conexion === t
                        ? "border-accent bg-accent text-white"
                        : "border-card-border bg-white text-foreground hover:border-gray-300",
                    ].join(" ")}
                  >
                    {t === "network" ? "🌐 Red / Ethernet" : "🔌 USB directo"}
                  </button>
                ))}
              </div>

              {/* IP (solo para network) */}
              {conexion === "network" && (
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-foreground/60">
                      IP de la impresora
                    </label>
                    <input
                      type="text"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="ej: 192.168.1.100"
                      className="h-9 w-full rounded-lg border border-card-border bg-white px-3 font-mono text-[13px] outline-none focus:border-accent"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-foreground/60">
                      Puerto
                    </label>
                    <input
                      type="text"
                      value={puerto}
                      onChange={(e) => setPuerto(e.target.value)}
                      className="h-9 w-full rounded-lg border border-card-border bg-white px-3 font-mono text-[13px] outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              {conexion === "usb" && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">
                  La impresora debe estar conectada por USB a esta PC. En Windows puede requerir instalar el driver WinUSB con Zadig.
                </p>
              )}

              {printError   && <p className="text-[12px] font-semibold text-red-600">{printError}</p>}
              {printSuccess && <p className="text-[12px] font-semibold text-emerald-600">✓ Ticket impreso correctamente</p>}

              <button
                type="button"
                onClick={handleImprimir}
                disabled={printing || (conexion === "network" && !ip.trim())}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sidebar py-2.5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <IconPrinter className="h-4 w-4" />
                {printing ? "Imprimiendo…" : "Imprimir ticket"}
              </button>
            </div>
          )}
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
function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M5 7l3 3 3-3M2 13h12" />
    </svg>
  );
}
function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 7.5c0 3.04-2.69 5.5-6 5.5a6.54 6.54 0 01-2.9-.68L2 13.5l.94-2.9A5.27 5.27 0 012 7.5C2 4.46 4.69 2 8 2s6 2.46 6 5.5z" />
    </svg>
  );
}
function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 5.5l6.5 4 6.5-4" />
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
function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="6" r="2.6" />
      <path d="M3 13c0-2.5 2.2-4 5-4s5 1.5 5 4" />
    </svg>
  );
}
function IconExpense({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v12M4 6l4-4 4 4M4 13h8" />
    </svg>
  );
}
function IconLockSmall({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  );
}
function IconCloseLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="11" rx="2" />
      <path d="M17 11V7a5 5 0 00-10 0v4" />
    </svg>
  );
}
function IconReceipt({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 2.5 2L12 20l2.5 2L17 20l3 2V2" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </svg>
  );
}
function IconPrinter({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
