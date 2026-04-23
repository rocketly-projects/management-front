"use client";

import { useState, useRef, useEffect, useMemo } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface Product {
  id: number;
  name: string;
  brand: string;
  code: string;
  cat: string;
  price: number;
  cost: number;
  stock: number;
  active: boolean;
}

type SortKey = "name" | "code" | "cat" | "price" | "stock";
type SortDir = "asc" | "desc";
type StockFilter = "all" | "active" | "low" | "critical" | "noprice" | "inactive";

/* ── Mock data ─────────────────────────────────────────────────── */

const INIT_PRODUCTS: Product[] = [
  { id: 1,  name: "Coca-Cola 500ml",          brand: "Coca-Cola",     code: "7790895001010", cat: "Bebidas",   price: 850,  cost: 620,  stock: 24, active: true  },
  { id: 2,  name: "Agua mineral 500ml",        brand: "Villavicencio", code: "7791337002068", cat: "Bebidas",   price: 420,  cost: 280,  stock: 18, active: true  },
  { id: 3,  name: "Sprite 1.5L",               brand: "Coca-Cola",     code: "7790895000914", cat: "Bebidas",   price: 1400, cost: 980,  stock: 3,  active: true  },
  { id: 4,  name: "Alfajor Havanna x1",        brand: "Havanna",       code: "7791780000012", cat: "Golosinas", price: 1200, cost: 820,  stock: 30, active: true  },
  { id: 5,  name: "Chicles Trident menta",     brand: "Trident",       code: "7622210024039", cat: "Golosinas", price: 650,  cost: 440,  stock: 45, active: true  },
  { id: 6,  name: "Cigarrillos Marlboro",      brand: "Philip Morris", code: "5000159473139", cat: "Tabaco",    price: 2500, cost: 1900, stock: 1,  active: true  },
  { id: 7,  name: "Pan lactal Bimbo",          brand: "Bimbo",         code: "7792222000063", cat: "Almacén",   price: 1150, cost: 820,  stock: 12, active: true  },
  { id: 8,  name: "Yerba Mate 500g",           brand: "La Merced",     code: "7791195001013", cat: "Almacén",   price: 3200, cost: 2400, stock: 1,  active: true  },
  { id: 9,  name: "Nescafé sachets x5",        brand: "Nestlé",        code: "7613036742764", cat: "Almacén",   price: 800,  cost: 540,  stock: 22, active: true  },
  { id: 10, name: "Medias lunas x4",           brand: "",              code: "0000000000001", cat: "Panadería", price: 900,  cost: 600,  stock: 6,  active: true  },
  { id: 11, name: "Leche entera 1L",           brand: "La Serenísima", code: "7793100001013", cat: "Lácteos",   price: 1380, cost: 1040, stock: 15, active: true  },
  { id: 12, name: "Shampoo Head & Shoulders",  brand: "P&G",           code: "7500435139471", cat: "Limpieza",  price: 0,    cost: 0,    stock: 4,  active: false },
  { id: 13, name: "Flan casero",               brand: "",              code: "0000000000002", cat: "Panadería", price: 750,  cost: 480,  stock: 0,  active: false },
  { id: 14, name: "Sprite 500ml",              brand: "Coca-Cola",     code: "7790895001027", cat: "Bebidas",   price: 780,  cost: 560,  stock: 8,  active: true  },
  { id: 15, name: "Dulce de leche 400g",       brand: "Sancor",        code: "7798082640097", cat: "Lácteos",   price: 2200, cost: 1620, stock: 2,  active: true  },
];

const CATEGORIES: Record<string, { bg: string; color: string }> = {
  Bebidas:    { bg: "rgba(219,234,254,0.7)", color: "#1d4ed8" },
  Golosinas:  { bg: "rgba(252,231,243,0.7)", color: "#9d174d" },
  Tabaco:     { bg: "rgba(254,243,199,0.7)", color: "#92400e" },
  Almacén:    { bg: "rgba(220,252,231,0.7)", color: "#166534" },
  Panadería:  { bg: "rgba(255,237,213,0.7)", color: "#9a3412" },
  Lácteos:    { bg: "rgba(254,226,226,0.7)", color: "#991b1b" },
  Limpieza:   { bg: "rgba(241,245,249,0.7)", color: "#475569" },
};

const CAT_LIST = Object.keys(CATEGORIES);

/* ── Helpers ───────────────────────────────────────────────────── */

function getStockStatus(p: Product): "active" | "low" | "critical" | "noprice" | "inactive" {
  if (!p.active || p.stock === 0) return "inactive";
  if (p.price === 0) return "noprice";
  if (p.stock <= 1) return "critical";
  if (p.stock <= 5) return "low";
  return "active";
}

const STATUS_MAP = {
  active:   { label: "Activo",         dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  low:      { label: "Stock bajo",     dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700"     },
  critical: { label: "Stock crítico",  dot: "bg-red-500",     badge: "bg-red-50 text-red-700"         },
  noprice:  { label: "Sin precio",     dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700"       },
  inactive: { label: "Inactivo",       dot: "bg-gray-300",    badge: "bg-gray-100 text-gray-500"      },
};

function fmt(n: number) {
  return n === 0 ? "—" : `$${n.toLocaleString("es-AR")}`;
}

function margin(price: number, cost: number) {
  if (!price || !cost) return null;
  return Math.round(((price - cost) / price) * 100);
}

function nextId(products: Product[]) {
  return Math.max(0, ...products.map((p) => p.id)) + 1;
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function ProductosPage() {
  const [products, setProducts]   = useState<Product[]>(INIT_PRODUCTS);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [sortKey, setSortKey]     = useState<SortKey>("name");
  const [sortDir, setSortDir]     = useState<SortDir>("asc");
  const [panel, setPanel]         = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [bulkModal, setBulkModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / → focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Filtered + sorted products
  const visible = useMemo(() => {
    let list = products.filter((p) => {
      const q = search.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.code.includes(q)) return false;
      if (catFilter !== "all" && p.cat !== catFilter) return false;
      if (stockFilter !== "all" && getStockStatus(p) !== stockFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let va: string | number = a[sortKey];
      let vb: string | number = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return list;
  }, [products, search, catFilter, stockFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleSelect(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map((p) => p.id)));
  }

  function handlePriceSave(id: number, price: number) {
    setProducts((ps) => ps.map((p) => p.id === id ? { ...p, price } : p));
  }

  function handleDelete(id: number) {
    setProducts((ps) => ps.filter((p) => p.id !== id));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  function handleDeleteSelected() {
    setProducts((ps) => ps.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
  }

  function handleDuplicate(p: Product) {
    setProducts((ps) => [...ps, { ...p, id: nextId(ps), name: `${p.name} (copia)` }]);
  }

  function handleSavePanel(p: Product) {
    if (p.id === 0) {
      setProducts((ps) => [...ps, { ...p, id: nextId(ps) }]);
    } else {
      setProducts((ps) => ps.map((x) => x.id === p.id ? p : x));
    }
    setPanel({ open: false, product: null });
  }

  function handleBulkPrice(pct: number) {
    setProducts((ps) =>
      ps.map((p) =>
        selected.has(p.id)
          ? { ...p, price: Math.round(p.price * (1 + pct / 100)) }
          : p
      )
    );
    setBulkModal(false);
  }

  const allSelected = visible.length > 0 && selected.size === visible.length;

  return (
    <div className="flex h-full flex-col">

      {/* ── Page header ───────────────────────────────────────── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-7">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">Productos</h1>
          <p className="text-xs text-muted">{products.length} productos en catálogo</p>
        </div>
        <button
          type="button"
          onClick={() => setPanel({ open: true, product: null })}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <IconPlus className="h-4 w-4" />
          Nuevo producto
        </button>
      </header>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-card-border bg-main-bg px-7 py-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar producto… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-card-border bg-white pl-9 pr-8 text-[13px] text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <IconX className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-9 rounded-lg border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground outline-none cursor-pointer transition-colors hover:border-gray-300"
        >
          <option value="all">Todas las categorías</option>
          {CAT_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Stock filter chips */}
        <div className="flex items-center gap-1.5">
          {(["all", "critical", "low", "noprice", "inactive"] as const).map((f) => {
            const labels: Record<string, string> = {
              all: "Todos", critical: "Stock crítico", low: "Stock bajo",
              noprice: "Sin precio", inactive: "Inactivos",
            };
            return (
              <button
                key={f}
                type="button"
                onClick={() => setStockFilter(f)}
                className={[
                  "h-9 rounded-lg border px-3.5 text-[12.5px] font-semibold transition-all",
                  stockFilter === f
                    ? "border-accent bg-accent text-white"
                    : "border-card-border bg-white text-foreground/70 hover:border-gray-300",
                ].join(" ")}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <span className="ml-auto text-xs text-muted">
          {visible.length} resultado{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Bulk actions bar ──────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex flex-shrink-0 items-center gap-3 bg-accent px-7 py-2.5"
             style={{ animation: "slideDown 0.15s ease" }}>
          <button type="button" onClick={() => setSelected(new Set())}
                  className="text-white/70 hover:text-white transition-colors">
            <IconX className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-white">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div className="ml-2 flex items-center gap-2">
            <button type="button" onClick={() => setBulkModal(true)}
                    className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
              Ajustar precio
            </button>
            <button type="button" onClick={handleDeleteSelected}
                    className="rounded-md border border-red-300/30 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500/30 transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 border-b border-card-border bg-white">
            <tr>
              {/* Select all */}
              <th className="w-10 px-4 py-2.5">
                <Checkbox checked={allSelected} onChange={toggleAll} />
              </th>
              {/* Photo */}
              <th className="w-12 px-3 py-2.5" />
              {/* Columns */}
              {(
                [
                  { key: "name" as SortKey, label: "Producto" },
                  { key: "code" as SortKey, label: "Código" },
                  { key: "cat"  as SortKey, label: "Categoría" },
                ] as { key: SortKey; label: string }[]
              ).map(({ key, label }) => (
                <th key={key} className="px-3.5 py-2.5 text-left" onClick={() => toggleSort(key)}>
                  <span className="flex cursor-pointer select-none items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted hover:text-foreground transition-colors">
                    {label}
                    <SortIcon active={sortKey === key} dir={sortDir} />
                  </span>
                </th>
              ))}
              <th className="px-3.5 py-2.5 text-right" onClick={() => toggleSort("price")}>
                <span className="flex cursor-pointer select-none items-center justify-end gap-1 text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted hover:text-foreground transition-colors">
                  Precio venta
                  <SortIcon active={sortKey === "price"} dir={sortDir} />
                </span>
              </th>
              <th className="px-3.5 py-2.5 text-right" onClick={() => toggleSort("stock")}>
                <span className="flex cursor-pointer select-none items-center justify-end gap-1 text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted hover:text-foreground transition-colors">
                  Stock
                  <SortIcon active={sortKey === "stock"} dir={sortDir} />
                </span>
              </th>
              <th className="px-3.5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted">
                Estado
              </th>
              <th className="w-28 px-3.5 py-2.5" />
            </tr>
          </thead>

          <tbody className="divide-y divide-card-border">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-sm text-muted">
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              visible.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  selected={selected.has(p.id)}
                  onSelect={() => toggleSelect(p.id)}
                  onPriceSave={handlePriceSave}
                  onEdit={(pr) => setPanel({ open: true, product: pr })}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Slide panel ───────────────────────────────────────── */}
      {panel.open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
               onClick={() => setPanel({ open: false, product: null })} />
          <ProductPanel
            product={panel.product}
            onSave={handleSavePanel}
            onClose={() => setPanel({ open: false, product: null })}
          />
        </>
      )}

      {/* ── Bulk price modal ──────────────────────────────────── */}
      {bulkModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setBulkModal(false)} />
          <BulkPriceModal
            count={selected.size}
            onApply={handleBulkPrice}
            onClose={() => setBulkModal(false)}
          />
        </>
      )}
    </div>
  );
}

/* ── Product row ───────────────────────────────────────────────── */

function ProductRow({
  product, selected, onSelect, onPriceSave, onEdit, onDelete, onDuplicate,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
  onPriceSave: (id: number, price: number) => void;
  onEdit: (p: Product) => void;
  onDelete: (id: number) => void;
  onDuplicate: (p: Product) => void;
}) {
  const status = getStockStatus(product);
  const { label, dot, badge } = STATUS_MAP[status];
  const cat = CATEGORIES[product.cat] ?? { bg: "#f1f5f9", color: "#475569" };

  const stockColor =
    status === "critical" ? "text-red-600 font-bold" :
    status === "low"      ? "text-amber-600 font-semibold" :
    "text-foreground";

  return (
    <tr
      className={`group cursor-pointer transition-colors hover:bg-gray-50/70 ${selected ? "bg-accent/4" : ""}`}
      onClick={onSelect}
    >
      {/* Checkbox */}
      <td className="w-10 px-4 py-0" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <Checkbox checked={selected} onChange={onSelect} />
      </td>

      {/* Photo */}
      <td className="px-3 py-0">
        <PhotoThumb name={product.name} />
      </td>

      {/* Name + brand */}
      <td className="px-3.5 py-0">
        <p className="text-[13px] font-semibold text-foreground leading-snug">{product.name}</p>
        {product.brand && (
          <p className="text-[11.5px] text-muted leading-snug">{product.brand}</p>
        )}
      </td>

      {/* Code */}
      <td className="px-3.5 py-0">
        <span className="font-mono text-[11.5px] text-muted">{product.code}</span>
      </td>

      {/* Category */}
      <td className="px-3.5 py-0">
        <span
          className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold"
          style={{ background: cat.bg, color: cat.color }}
        >
          {product.cat}
        </span>
      </td>

      {/* Price — inline editable */}
      <td className="px-3.5 py-0 text-right" onClick={(e) => e.stopPropagation()}>
        <PriceCell
          value={product.price}
          onSave={(v) => onPriceSave(product.id, v)}
        />
      </td>

      {/* Stock */}
      <td className="px-3.5 py-0 text-right">
        <span className={`text-[13px] ${stockColor}`}>{product.stock}</span>
        <span className="ml-1 text-[11px] text-muted">uds.</span>
      </td>

      {/* Status */}
      <td className="px-3.5 py-0">
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold ${badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
          {label}
        </span>
      </td>

      {/* Row actions */}
      <td className="px-3.5 py-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <RowActionBtn title="Editar"    onClick={() => onEdit(product)}>
            <IconEdit className="h-3.5 w-3.5" />
          </RowActionBtn>
          <RowActionBtn title="Duplicar" onClick={() => onDuplicate(product)}>
            <IconCopy className="h-3.5 w-3.5" />
          </RowActionBtn>
          <RowActionBtn title="Eliminar" onClick={() => onDelete(product.id)} danger>
            <IconTrash className="h-3.5 w-3.5" />
          </RowActionBtn>
        </div>
      </td>
    </tr>
  );
}

/* ── Inline price cell ─────────────────────────────────────────── */

function PriceCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setRaw(value === 0 ? "" : String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (!isNaN(n)) onSave(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-24 rounded border border-accent bg-white px-2 py-0.5 text-right font-mono text-[13px] font-semibold text-foreground outline-none focus:ring-2 focus:ring-accent/20"
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="rounded px-2 py-0.5 text-right font-mono text-[13px] font-semibold text-foreground transition-colors hover:bg-accent/8 hover:text-accent"
      title="Clic para editar"
    >
      {fmt(value)}
    </button>
  );
}

/* ── Product panel (slide-in) ──────────────────────────────────── */

const EMPTY_PRODUCT: Product = {
  id: 0, name: "", brand: "", code: "", cat: "Bebidas",
  price: 0, cost: 0, stock: 0, active: true,
};

function ProductPanel({
  product,
  onSave,
  onClose,
}: {
  product: Product | null;
  onSave: (p: Product) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Product>(product ?? EMPTY_PRODUCT);

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const m = margin(form.price, form.cost);
  const isNew = !product;

  return (
    <aside
      className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white shadow-2xl"
      style={{ animation: "slideLeft 0.2s ease" }}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-card-border px-6 py-4">
        <h2 className="text-[15px] font-bold text-foreground">
          {isNew ? "Nuevo producto" : "Editar producto"}
        </h2>
        <button type="button" onClick={onClose}
                className="text-muted transition-colors hover:text-foreground">
          <IconX className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        {/* Photo drop zone */}
        <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-card-border bg-gray-50/60 transition-colors hover:border-accent/40 hover:bg-accent/4">
          <div className="flex flex-col items-center gap-1.5 text-muted">
            <IconImage className="h-6 w-6" />
            <span className="text-xs font-medium">Arrastrá una imagen o hacé clic</span>
          </div>
        </div>

        {/* Name */}
        <PanelField label="Nombre del producto" required>
          <input
            type="text"
            className={panelInput}
            placeholder="Ej: Coca-Cola 500ml"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            autoFocus
          />
        </PanelField>

        {/* Brand + Category */}
        <div className="grid grid-cols-2 gap-3">
          <PanelField label="Marca">
            <input type="text" className={panelInput} placeholder="Ej: Coca-Cola"
                   value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </PanelField>
          <PanelField label="Categoría">
            <select className={panelInput} value={form.cat}
                    onChange={(e) => set("cat", e.target.value)}>
              {CAT_LIST.map((c) => <option key={c}>{c}</option>)}
            </select>
          </PanelField>
        </div>

        {/* Code */}
        <PanelField label="Código de barras / SKU">
          <input type="text" className={`${panelInput} font-mono`}
                 placeholder="7790895001010"
                 value={form.code} onChange={(e) => set("code", e.target.value)} />
        </PanelField>

        {/* Price + Cost */}
        <div className="grid grid-cols-2 gap-3">
          <PanelField label="Precio de venta" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">$</span>
              <input type="number" min={0} className={`${panelInput} pl-7`}
                     placeholder="0"
                     value={form.price || ""}
                     onChange={(e) => set("price", parseInt(e.target.value) || 0)} />
            </div>
          </PanelField>
          <PanelField label="Costo">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">$</span>
              <input type="number" min={0} className={`${panelInput} pl-7`}
                     placeholder="0"
                     value={form.cost || ""}
                     onChange={(e) => set("cost", parseInt(e.target.value) || 0)} />
            </div>
          </PanelField>
        </div>

        {/* Margin indicator */}
        {m !== null && (
          <div className={`-mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
            m >= 30 ? "bg-emerald-50 text-emerald-700" :
            m >= 10 ? "bg-amber-50 text-amber-700" :
            "bg-red-50 text-red-700"
          }`}>
            <IconChart className="h-3.5 w-3.5" />
            Margen: {m}%
          </div>
        )}

        {/* Stock */}
        <PanelField label="Stock inicial">
          <input type="number" min={0} className={panelInput}
                 placeholder="0"
                 value={form.stock || ""}
                 onChange={(e) => set("stock", parseInt(e.target.value) || 0)} />
        </PanelField>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-xl border border-card-border bg-gray-50/50 px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Producto activo</p>
            <p className="text-xs text-muted">Visible y disponible para la venta</p>
          </div>
          <Toggle checked={form.active} onChange={(v) => set("active", v)} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-shrink-0 items-center justify-end gap-2.5 border-t border-card-border px-6 py-4">
        <button type="button" onClick={onClose}
                className="rounded-lg border border-card-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => { if (form.name.trim()) onSave(form); }}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {isNew ? "Agregar producto" : "Guardar cambios"}
        </button>
      </div>
    </aside>
  );
}

/* ── Bulk price modal ──────────────────────────────────────────── */

function BulkPriceModal({
  count, onApply, onClose,
}: {
  count: number;
  onApply: (pct: number) => void;
  onClose: () => void;
}) {
  const [pct, setPct] = useState(10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-white p-6 shadow-2xl">
        <h3 className="text-[15px] font-bold text-foreground">Ajuste de precio</h3>
        <p className="mt-1 text-sm text-muted">
          Modificar precio de <span className="font-semibold text-foreground">{count}</span> producto{count !== 1 ? "s" : ""} seleccionado{count !== 1 ? "s" : ""}.
        </p>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-bold text-foreground/60">
            Variación porcentual
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="w-24 rounded-lg border border-card-border bg-white px-3 py-2 text-center font-mono text-sm font-semibold text-foreground outline-none focus:border-accent"
            />
            <span className="text-sm font-semibold text-foreground">%</span>
            <span className="text-xs text-muted">
              {pct > 0 ? `+${pct}% aumento` : pct < 0 ? `${pct}% descuento` : "sin cambio"}
            </span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onClose}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={() => onApply(pct)}
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared small components ───────────────────────────────────── */

function PhotoThumb({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-gray-50 text-[10px] font-semibold text-muted">
      {initials}
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={[
        "flex h-4 w-4 items-center justify-center rounded border transition-all",
        checked ? "border-accent bg-accent" : "border-gray-300 bg-white hover:border-accent/50",
      ].join(" ")}
    >
      {checked && (
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 10 10"
             stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 5l3 3 4-5" />
        </svg>
      )}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-gray-200",
      ].join(" ")}
    >
      <span className={[
        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
        checked ? "left-[22px]" : "left-0.5",
      ].join(" ")} />
    </button>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`text-[10px] ${active ? "text-accent" : "text-muted/40"}`}>
      {!active ? "↕" : dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function RowActionBtn({
  children, title, onClick, danger,
}: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
        danger
          ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
          : "border-card-border bg-white text-muted hover:bg-gray-50 hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PanelField({
  label, required, children,
}: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-foreground/60">
        {label}
        {required && <span className="ml-0.5 text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

const panelInput =
  "h-10 w-full rounded-[9px] border border-card-border bg-white px-3 text-sm font-medium text-foreground placeholder:text-muted outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-accent/10";

/* ── Icons ─────────────────────────────────────────────────────── */

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}
function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l3.5 3.5" />
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
function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" />
    </svg>
  );
}
function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="8" height="9" rx="1.5" />
      <path d="M2 9.5V2.5A1 1 0 013 1.5h7" />
    </svg>
  );
}
function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5h10M4.5 3.5V2.5a1 1 0 011-1h3a1 1 0 011 1v1M5.5 6.5v4M8.5 6.5v4M3 3.5l.5 8a1 1 0 001 1h5a1 1 0 001-1l.5-8" />
    </svg>
  );
}
function IconImage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10l3-3 2.5 2.5L10 5l3 2" />
    </svg>
  );
}
