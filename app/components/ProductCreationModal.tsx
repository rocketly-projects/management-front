"use client";

import { useEffect, useRef, useState } from "react";
import {
  createProductoFromExternal,
  getProducto,
} from "@/lib/api/productos";
import { ApiError } from "@/lib/api/client";
import type { Producto, ProductDraft } from "@/lib/types";

export interface ProductCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Llamado con el Producto creado (201) o el Producto ya existente recuperado
   * tras un 409. El consumidor decide qué hacer (agregar al carrito, toast, etc.).
   * `wasExisting === true` cuando el backend respondió 409.
   */
  onSuccess: (createdProduct: Producto, opts: { wasExisting: boolean }) => void;

  /** Payload pre-cargado. Forma normalizada, NO atada a OFF. */
  initialData: ProductDraft;

  /** Texto informativo en el header. Ej. "Importar desde Open Food Facts". */
  sourceLabel?: string;
}

/**
 * Modal de creación de producto reutilizable. NO conoce la fuente del payload:
 * recibe un ProductDraft ya normalizado y delega el side-effect al consumidor.
 *
 * Para sumar una nueva fuente (scanner, importación, etc.) basta con crear un
 * mapper hacia ProductDraft sin tocar este componente.
 */
export default function ProductCreationModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  sourceLabel,
}: ProductCreationModalProps) {
  // El padre monta/desmonta el modal cada vez (ver caja/page.tsx: {createOpen && createDraft && …}),
  // por eso podemos inicializar el estado directamente desde props sin un effect de sync.
  const [name, setName] = useState(initialData.name ?? "");
  const [brand, setBrand] = useState(initialData.brand ?? "");
  const [imageUrl, setImageUrl] = useState(initialData.imageUrl ?? "");
  const [categories, setCategories] = useState<string[]>(initialData.categories ?? []);
  const [barcode, setBarcode] = useState(initialData.barcode ?? "");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [newCategory, setNewCategory] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imgFailed, setImgFailed] = useState(false);

  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => priceRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  function addCategory() {
    const v = newCategory.trim();
    if (!v) return;
    if (!categories.includes(v)) setCategories([...categories, v]);
    setNewCategory("");
  }

  function removeCategory(c: string) {
    setCategories(categories.filter((x) => x !== c));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Requerido";
    if (!barcode.trim()) errs.barcode = "Requerido";
    const p = parseFloat(price);
    if (!price || isNaN(p) || p <= 0) errs.price = "Debe ser mayor a 0";
    const s = parseInt(initialStock || "0", 10);
    if (isNaN(s) || s < 0) errs.initialStock = "No puede ser negativo";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      barcode: barcode.trim(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      imageUrl: imgFailed ? undefined : imageUrl.trim() || undefined,
      categories: categories.length > 0 ? categories : undefined,
      price: parseFloat(price),
      initialStock: parseInt(initialStock || "0", 10),
      externalSource: initialData.externalSource,
    };

    try {
      const created = await createProductoFromExternal(payload);
      onSuccess(created, { wasExisting: false });
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const productoId =
          (e.data as { productoId?: string } | undefined)?.productoId;
        if (productoId) {
          try {
            const existing = await getProducto(productoId);
            onSuccess(existing, { wasExisting: true });
            onClose();
            return;
          } catch {
            setError("El producto ya existe pero no se pudo recuperar. Recargá el catálogo.");
          }
        } else {
          setError(e.message || "Ya existe un producto con ese código.");
        }
      } else if (e instanceof ApiError && e.status === 422) {
        setError(e.message || "Datos inválidos");
        if (e.fields) {
          const fe: Record<string, string> = {};
          for (const [k, v] of Object.entries(e.fields)) {
            fe[k] = Array.isArray(v) ? v[0] : String(v);
          }
          setFieldErrors((prev) => ({ ...prev, ...fe }));
        }
      } else {
        setError(e instanceof ApiError ? e.message : "Error al crear el producto");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[3px]"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-creation-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeSlideIn .2s ease" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-card-border px-6 py-4">
          <div>
            <h2 id="product-creation-title" className="text-[16px] font-bold text-foreground">
              Nuevo producto
            </h2>
            {sourceLabel && (
              <p className="mt-0.5 text-[12px] font-semibold text-accent">{sourceLabel}</p>
            )}
            <p className="mt-1 text-[12.5px] text-muted">
              Ingresá el precio para sumarlo a tu catálogo y al carrito.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar"
            className="rounded-md p-1 text-muted transition-colors hover:bg-gray-100 hover:text-foreground disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Imagen + nombre */}
          <div className="flex gap-3">
            {imageUrl && !imgFailed ? (
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-card-border bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={name || "Producto"}
                  loading="lazy"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  aria-label="Quitar imagen"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                >
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-card-border bg-gray-50/60 text-[10px] font-semibold text-muted">
                Sin imagen
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              {fieldErrors.name && <p className="text-[11.5px] font-semibold text-red-600">{fieldErrors.name}</p>}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
                  Marca
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="h-9 w-full rounded-lg border border-card-border bg-white px-3 text-[13px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </div>
            </div>
          </div>

          {/* Barcode (editable si vino vacío, sino read-only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Código de barras <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              readOnly={!!initialData.barcode}
              className={`h-9 w-full rounded-lg border bg-white px-3 font-mono text-[13px] text-foreground outline-none ${
                initialData.barcode
                  ? "border-card-border bg-gray-50/60 text-foreground/70"
                  : "border-card-border focus:border-accent focus:ring-2 focus:ring-accent/15"
              }`}
            />
            {fieldErrors.barcode && <p className="text-[11.5px] font-semibold text-red-600">{fieldErrors.barcode}</p>}
          </div>

          {/* Precio + stock — precio es el campo crítico */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
                Precio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-muted">$</span>
                <input
                  ref={priceRef}
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="0"
                  className="h-10 w-full rounded-lg border-2 border-card-border bg-white pl-7 font-mono text-[15px] font-bold text-foreground outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,110,247,.12)]"
                />
              </div>
              {fieldErrors.price && <p className="text-[11.5px] font-semibold text-red-600">{fieldErrors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
                Stock inicial
              </label>
              <input
                type="number"
                min={0}
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="h-10 w-full rounded-lg border border-card-border bg-white px-3 font-mono text-[14px] font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              {fieldErrors.initialStock && <p className="text-[11.5px] font-semibold text-red-600">{fieldErrors.initialStock}</p>}
            </div>
          </div>

          {/* Categorías */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-foreground/60">
              Categorías
            </label>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[11.5px] font-semibold text-accent"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCategory(c)}
                      aria-label={`Quitar ${c}`}
                      className="text-accent/70 hover:text-accent"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCategory(); }
                }}
                placeholder="Agregar categoría…"
                className="h-8 flex-1 rounded-md border border-card-border bg-white px-2 text-[12.5px] text-foreground outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={!newCategory.trim()}
                className="rounded-md border border-card-border bg-white px-3 text-[12.5px] font-semibold text-foreground hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-card-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-card-border bg-white py-2.5 text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex flex-[1.4] items-center justify-center rounded-lg bg-accent py-2.5 text-sm font-extrabold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Guardando…" : "Crear y agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
