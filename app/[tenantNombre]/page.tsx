"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getNegocio,
  getProductosCatalogo,
  getCategoriasCatalogo,
  type CatalogoNegocio,
  type CatalogoProducto,
} from "@/lib/api/catalogo";

/* ── Font injection ─────────────────────────────────────────────── */
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');`;

/* ── Page ───────────────────────────────────────────────────────── */

export default function CatalogoPage() {
  const params = useParams();
  const tenantNombre = (params.tenantNombre as string).toLowerCase();

  const [negocio, setNegocio] = useState<CatalogoNegocio | null>(null);
  const [productos, setProductos] = useState<CatalogoProducto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([getNegocio(tenantNombre), getCategoriasCatalogo(tenantNombre)])
      .then(([neg, cats]) => {
        setNegocio(neg);
        setCategorias(cats);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [tenantNombre]);

  const fetchProductos = useCallback(() => {
    setLoadingProductos(true);
    getProductosCatalogo(tenantNombre, {
      categoria: categoriaActiva ?? undefined,
      busqueda: busqueda || undefined,
    })
      .then(setProductos)
      .catch(() => {})
      .finally(() => setLoadingProductos(false));
  }, [tenantNombre, categoriaActiva, busqueda]);

  useEffect(() => {
    if (!loading && !notFound) fetchProductos();
  }, [fetchProductos, loading, notFound]);

  if (loading) return <LoadingScreen />;
  if (notFound) return <NotFoundScreen />;

  const moneda = negocio?.moneda ?? "ARS";
  const inicial = negocio?.nombreDisplay?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <style>{`
        .catalogo * { font-family: 'Sora', sans-serif; }
        .catalogo-body { font-family: 'DM Sans', sans-serif; }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.10); }
      `}</style>

      <div className="catalogo min-h-screen" style={{ background: "#F8F7F4" }}>

        {/* ── Hero header ─────────────────────────────────────────── */}
        <header style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative blobs */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute", top: "-60px", right: "-60px",
              width: "220px", height: "220px", borderRadius: "50%",
              background: "rgba(99,102,241,0.18)", filter: "blur(60px)",
            }} />
            <div style={{
              position: "absolute", bottom: "-40px", left: "10%",
              width: "160px", height: "160px", borderRadius: "50%",
              background: "rgba(251,191,36,0.12)", filter: "blur(50px)",
            }} />
          </div>

          <div style={{
            maxWidth: "1080px", margin: "0 auto",
            padding: "40px 24px 36px",
            position: "relative", zIndex: 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {/* Avatar */}
              {negocio?.logo ? (
                <img
                  src={negocio.logo}
                  alt={negocio.nombreDisplay}
                  style={{
                    width: "72px", height: "72px", borderRadius: "18px",
                    objectFit: "cover", flexShrink: 0,
                    border: "2px solid rgba(255,255,255,0.15)",
                  }}
                />
              ) : (
                <div style={{
                  width: "72px", height: "72px", borderRadius: "18px",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: "28px", fontWeight: 800, color: "#fff",
                  border: "2px solid rgba(255,255,255,0.15)",
                }}>
                  {inicial}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{
                  margin: 0, fontSize: "clamp(22px, 4vw, 32px)",
                  fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}>
                  {negocio?.nombreDisplay}
                </h1>
                {negocio?.direccion && (
                  <p style={{
                    margin: "6px 0 0", fontSize: "13px",
                    color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center", gap: "5px",
                  }}>
                    <IconMapPin style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                    {negocio.direccion}
                  </p>
                )}
              </div>

              {/* Teléfono */}
              {negocio?.telefono && (
                <a
                  href={`tel:${negocio.telefono}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 16px", borderRadius: "12px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff", fontSize: "13px", fontWeight: 600,
                    textDecoration: "none", flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                >
                  <IconPhone style={{ width: "14px", height: "14px" }} />
                  <span className="catalogo-body">{negocio.telefono}</span>
                </a>
              )}
            </div>
          </div>
        </header>

        {/* ── Filter bar ──────────────────────────────────────────── */}
        <div style={{
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0 1px 12px rgba(0,0,0,0.05)",
        }}>
          <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "14px 24px" }}>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: categorias.length > 0 ? "12px" : "0" }}>
              <IconSearch style={{
                position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                width: "15px", height: "15px", color: "#9ca3af",
              }} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar productos…"
                className="catalogo-body"
                style={{
                  width: "100%", height: "42px",
                  paddingLeft: "38px", paddingRight: "16px",
                  border: "1.5px solid #e5e7eb", borderRadius: "10px",
                  background: "#f9fafb", fontSize: "14px", fontWeight: 500,
                  color: "#111827", outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.background = "#fff";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#f9fafb";
                }}
              />
            </div>

            {/* Categorías */}
            {categorias.length > 0 && (
              <div className="cat-scroll" style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
                <CategoryPill
                  label="Todo"
                  active={categoriaActiva === null}
                  onClick={() => setCategoriaActiva(null)}
                />
                {categorias.map((cat) => (
                  <CategoryPill
                    key={cat}
                    label={cat}
                    active={categoriaActiva === cat}
                    onClick={() => setCategoriaActiva(cat)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Grid de productos ───────────────────────────────────── */}
        <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 24px 48px" }}>
          {loadingProductos ? (
            <ProductosSkeleton />
          ) : productos.length === 0 ? (
            <EmptyState busqueda={busqueda} />
          ) : (
            <>
              <p className="catalogo-body" style={{
                fontSize: "13px", color: "#9ca3af", fontWeight: 500,
                marginBottom: "16px",
              }}>
                {productos.length} {productos.length === 1 ? "producto" : "productos"}
                {categoriaActiva ? ` en ${categoriaActiva}` : ""}
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "16px",
              }}>
                {productos.map((p, i) => (
                  <div key={p.id} className="fade-up" style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}>
                    <ProductoCard producto={p} moneda={moneda} />
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          padding: "20px 24px",
          textAlign: "center",
        }}>
          <p className="catalogo-body" style={{ fontSize: "12px", color: "#d1d5db" }}>
            Catálogo generado con{" "}
            <span style={{ fontWeight: 700, color: "#c7d2fe" }}>Rocketly</span>
          </p>
        </footer>
      </div>
    </>
  );
}

/* ── ProductoCard ───────────────────────────────────────────────── */

function ProductoCard({ producto, moneda }: { producto: CatalogoProducto; moneda: string }) {
  const sinStock = producto.stock <= 0;

  return (
    <div
      className="card-hover"
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.07)",
        opacity: sinStock ? 0.65 : 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Imagen — altura fija para uniformidad */}
      <div style={{ position: "relative", height: "180px", flexShrink: 0, background: "#f3f4f6" }}>
        {producto.imagen ? (
          <img
            src={producto.imagen}
            alt={producto.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconBox style={{ width: "36px", height: "36px", color: "#d1d5db" }} />
          </div>
        )}

        {/* Categoría badge */}
        {producto.categoria && (
          <span style={{
            position: "absolute", top: "10px", left: "10px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(6px)",
            borderRadius: "6px",
            padding: "3px 8px",
            fontSize: "10px", fontWeight: 700,
            color: "#4f46e5", letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            {producto.categoria}
          </span>
        )}

        {sinStock && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: "999px",
              padding: "5px 12px",
              fontSize: "11px", fontWeight: 700, color: "#374151",
            }}>
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        <p style={{
          margin: 0, fontSize: "14px", fontWeight: 700,
          color: "#111827", lineHeight: 1.3,
        }}>
          {producto.nombre}
        </p>
        {producto.marca && (
          <p className="catalogo-body" style={{
            margin: 0, fontSize: "12px", color: "#9ca3af", fontWeight: 500,
          }}>
            {producto.marca}
          </p>
        )}
        <p style={{
          margin: "8px 0 0", fontSize: "18px", fontWeight: 800,
          color: "#111827", letterSpacing: "-0.3px",
        }}>
          {formatPrecio(producto.precio, moneda)}
        </p>
      </div>
    </div>
  );
}

/* ── CategoryPill ───────────────────────────────────────────────── */

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "6px 14px",
        borderRadius: "999px",
        border: active ? "1.5px solid #4f46e5" : "1.5px solid #e5e7eb",
        background: active ? "#4f46e5" : "#ffffff",
        color: active ? "#ffffff" : "#6b7280",
        fontSize: "12.5px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {label}
    </button>
  );
}

/* ── Loading ────────────────────────────────────────────────────── */

function LoadingScreen() {
  return (
    <>
      <style>{FONT_IMPORT}</style>
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#F8F7F4", fontFamily: "'Sora', sans-serif",
        gap: "16px",
      }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          border: "3px solid #e5e7eb",
          borderTopColor: "#4f46e5",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "14px", color: "#9ca3af", fontWeight: 500 }}>Cargando catálogo…</p>
      </div>
    </>
  );
}

/* ── Not Found ──────────────────────────────────────────────────── */

function NotFoundScreen() {
  return (
    <>
      <style>{FONT_IMPORT}</style>
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#F8F7F4", fontFamily: "'Sora', sans-serif",
        padding: "24px", textAlign: "center",
      }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "20px",
          background: "#f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px",
        }}>
          <IconBox style={{ width: "32px", height: "32px", color: "#d1d5db" }} />
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "#111827" }}>
          Negocio no encontrado
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#9ca3af", maxWidth: "320px", lineHeight: 1.6 }}>
          La dirección que ingresaste no corresponde a ningún negocio registrado.
        </p>
      </div>
    </>
  );
}

/* ── Empty State ────────────────────────────────────────────────── */

function EmptyState({ busqueda }: { busqueda: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "64px 24px", textAlign: "center",
    }}>
      <div style={{
        width: "60px", height: "60px", borderRadius: "16px",
        background: "#f3f4f6",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "16px",
      }}>
        <IconSearch style={{ width: "24px", height: "24px", color: "#d1d5db" }} />
      </div>
      <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#374151" }}>
        {busqueda ? `Sin resultados para "${busqueda}"` : "No hay productos disponibles"}
      </p>
      {busqueda && (
        <p className="catalogo-body" style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>
          Probá con otro término de búsqueda.
        </p>
      )}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────── */

function ProductosSkeleton() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: "16px",
    }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          background: "#fff", borderRadius: "16px",
          border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden",
        }}>
          <div style={{
            height: "180px", background: "#f3f4f6",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ height: "12px", width: "80%", borderRadius: "6px", background: "#f3f4f6", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: "14px", width: "60%", borderRadius: "6px", background: "#f3f4f6", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: "20px", width: "45%", borderRadius: "6px", background: "#f3f4f6", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatPrecio(precio: number, moneda: string) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(precio);
  } catch {
    return `${moneda} ${precio}`;
  }
}

/* ── Icons ──────────────────────────────────────────────────────── */

function IconSearch({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function IconBox({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <path d="M13.5 5L8 2 2.5 5v6l5.5 3 5.5-3V5z" />
      <path d="M8 2v13M2.5 5l5.5 3 5.5-3" />
    </svg>
  );
}

function IconPhone({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2.5C2 2.5 3 5 5.5 7.5S11 12 11 12l2-2-3-2.5-1 1s-2-1-3.5-2.5S4 4 4 4L5 3 2.5 0 .5 2s0 .5 1.5 1.5z" />
    </svg>
  );
}

function IconMapPin({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5A4.5 4.5 0 0113.5 6c0 3.5-5.5 9-5.5 9S2.5 9.5 2.5 6A4.5 4.5 0 018 1.5z" />
      <circle cx="8" cy="6" r="1.5" />
    </svg>
  );
}
