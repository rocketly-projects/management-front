"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { getPerfil, updatePerfil } from "@/lib/api/perfil";
import { getConfiguracion, updateConfiguracion } from "@/lib/api/configuracion";
import { ApiError } from "@/lib/api/client";
import type { Perfil, Configuracion } from "@/lib/types";

type Toast = { kind: "success" | "error"; msg: string } | null;

export default function ConfiguracionPage() {
  const { perfil, token, setAuth } = useAuthStore();

  const [perfilForm, setPerfilForm] = useState<Partial<Perfil>>({
    nombreDueno: "",
    telefono: "",
    direccion: "",
    taxId: "",
  });
  const [config, setConfig] = useState<Configuracion | null>(null);

  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getPerfil()
      .then((p) => {
        setPerfilForm({
          nombreDueno: p.nombreDueno,
          telefono: p.telefono ?? "",
          direccion: p.direccion ?? "",
          taxId: p.taxId ?? "",
        });
        if (token) setAuth(token, p);
      })
      .catch((e) => showToast("error", e instanceof ApiError ? e.message : "Error al cargar el perfil"))
      .finally(() => setLoadingPerfil(false));

    getConfiguracion()
      .then((c) => setConfig(c))
      .catch((e) => showToast("error", e instanceof ApiError ? e.message : "Error al cargar la configuración"))
      .finally(() => setLoadingConfig(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(kind: "success" | "error", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function setPerfilField<K extends keyof Perfil>(key: K, value: string) {
    setPerfilForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  function validatePerfil(): boolean {
    const next: Record<string, string> = {};
    if (!perfilForm.nombreDueno?.trim()) next.nombreDueno = "El nombre del dueño es obligatorio";
    if (perfilForm.telefono && !/^[0-9+()\-\s]{6,}$/.test(perfilForm.telefono)) {
      next.telefono = "Teléfono inválido";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSavePerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePerfil()) return;
    setSavingPerfil(true);
    try {
      const updated = await updatePerfil({
        nombreDueno: perfilForm.nombreDueno,
        telefono: perfilForm.telefono || undefined,
        direccion: perfilForm.direccion || undefined,
        taxId: perfilForm.taxId || undefined,
      });
      if (token) setAuth(token, updated);
      showToast("success", "Datos del negocio actualizados");
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Error al guardar el perfil");
    } finally {
      setSavingPerfil(false);
    }
  }

  async function handleChangeTema(tema: "LIGHT" | "DARK") {
    if (!config || config.tema === tema) return;
    setSavingConfig(true);
    const previous = config;
    setConfig({ ...config, tema });
    try {
      const updated = await updateConfiguracion({ tema });
      setConfig(updated);
      showToast("success", `Tema actualizado a ${tema === "LIGHT" ? "claro" : "oscuro"}`);
    } catch (err) {
      setConfig(previous);
      showToast("error", err instanceof ApiError ? err.message : "Error al actualizar el tema");
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-card-border bg-white px-7">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">Configuración</h1>
          <p className="text-xs text-muted">
            Gestioná los datos de tu negocio y las preferencias de la app
          </p>
        </div>
      </header>

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`flex flex-shrink-0 items-center justify-between px-7 py-2.5 text-sm ${
            toast.kind === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {toast.msg}
          <button
            type="button"
            onClick={() => setToast(null)}
            className={toast.kind === "success" ? "text-emerald-400 hover:text-emerald-600" : "text-red-400 hover:text-red-600"}
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-main-bg px-7 py-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Datos del negocio */}
          <section className="rounded-2xl border border-card-border bg-white">
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-[14px] font-bold text-foreground">Datos del negocio</h2>
              <p className="mt-0.5 text-xs text-muted">
                Información que aparece en comprobantes y el sidebar
              </p>
            </div>

            {loadingPerfil ? (
              <SectionSkeleton />
            ) : (
              <form className="space-y-4 px-6 py-5" onSubmit={handleSavePerfil}>
                <Field label="Nombre del negocio">
                  <div className="flex h-10 w-full items-center gap-2 rounded-[9px] border border-card-border bg-main-bg px-3">
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {perfil?.tenantNombreDisplay ?? "—"}
                    </span>
                    <span className="rounded-md bg-card-border/60 px-2 py-0.5 text-[11px] font-semibold text-muted">
                      Solo lectura
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted">
                    Tu URL de catálogo:{" "}
                    <a
                      href={`/${perfil?.tenantNombre}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-accent hover:underline"
                    >
                      /{perfil?.tenantNombre}
                    </a>
                  </p>
                </Field>

                <Field label="Nombre del dueño" required error={errors.nombreDueno}>
                  <input
                    type="text"
                    value={perfilForm.nombreDueno ?? ""}
                    onChange={(e) => setPerfilField("nombreDueno", e.target.value)}
                    className={inputCls(!!errors.nombreDueno)}
                    placeholder="Ej: María Pérez"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Teléfono" error={errors.telefono}>
                    <input
                      type="tel"
                      value={perfilForm.telefono ?? ""}
                      onChange={(e) => setPerfilField("telefono", e.target.value)}
                      className={inputCls(!!errors.telefono)}
                      placeholder="Ej: +54 11 1234-5678"
                    />
                  </Field>

                  <Field label="CUIT / Tax ID">
                    <input
                      type="text"
                      value={perfilForm.taxId ?? ""}
                      onChange={(e) => setPerfilField("taxId", e.target.value)}
                      className={inputCls(false)}
                      placeholder="Ej: 20-12345678-9"
                    />
                  </Field>
                </div>

                <Field label="Dirección fiscal">
                  <input
                    type="text"
                    value={perfilForm.direccion ?? ""}
                    onChange={(e) => setPerfilField("direccion", e.target.value)}
                    className={inputCls(false)}
                    placeholder="Ej: Av. Corrientes 1234, CABA"
                  />
                </Field>

                <div className="flex items-center justify-end gap-2.5 border-t border-card-border pt-4">
                  <span className="mr-auto text-xs text-muted" />
                  <button
                    type="submit"
                    disabled={savingPerfil}
                    className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {savingPerfil ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Preferencias */}
          <section className="rounded-2xl border border-card-border bg-white">
            <div className="border-b border-card-border px-6 py-4">
              <h2 className="text-[14px] font-bold text-foreground">Preferencias</h2>
              <p className="mt-0.5 text-xs text-muted">
                Personalizá cómo se ve la app
              </p>
            </div>

            {loadingConfig ? (
              <SectionSkeleton />
            ) : config ? (
              <div className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Tema</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Elegí entre claro u oscuro
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-card-border bg-main-bg p-1">
                    <ThemeChip
                      active={config.tema === "LIGHT"}
                      disabled={savingConfig}
                      onClick={() => handleChangeTema("LIGHT")}
                      icon={<IconSun className="h-3.5 w-3.5" />}
                      label="Claro"
                    />
                    <ThemeChip
                      active={config.tema === "DARK"}
                      disabled={savingConfig}
                      onClick={() => handleChangeTema("DARK")}
                      icon={<IconMoon className="h-3.5 w-3.5" />}
                      label="Oscuro"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-sm text-muted">
                No se pudo cargar la configuración
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Subcomponents ────────────────────────────────────────────── */

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-foreground/60">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11.5px] text-red-600">{error}</p>}
    </div>
  );
}

function ThemeChip({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || active}
      className={[
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-all",
        active
          ? "bg-white text-foreground shadow-sm"
          : "text-muted hover:text-foreground disabled:opacity-50",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5">
      <div className="h-4 w-32 rounded bg-gray-100" />
      <div className="h-10 w-full rounded-lg bg-gray-100" />
      <div className="h-4 w-32 rounded bg-gray-100" />
      <div className="h-10 w-full rounded-lg bg-gray-100" />
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  [
    "h-10 w-full rounded-[9px] border bg-white px-3 text-sm font-medium text-foreground placeholder:text-muted outline-none transition-[border-color,box-shadow]",
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
      : "border-card-border focus:border-accent focus:ring-2 focus:ring-accent/10",
  ].join(" ");

/* ── Icons ────────────────────────────────────────────────────── */

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.2 3.2l1 1M11.8 11.8l1 1M3.2 12.8l1-1M11.8 4.2l1-1" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 9.5A6 6 0 016.5 2.5a6 6 0 107 7z" />
    </svg>
  );
}
