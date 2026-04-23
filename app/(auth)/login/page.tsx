"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden w-[420px] flex-shrink-0 flex-col bg-sidebar p-10 lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <span className="text-base font-bold text-white">R</span>
          </div>
          <span className="text-base font-semibold text-white">
            Rocketly POS
          </span>
        </div>

        {/* Feature list */}
        <div className="mt-auto space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Todo en un solo lugar
          </p>
          {[
            "Gestión de ventas e inventario en tiempo real",
            "Control de caja con cierre diario automatizado",
            "CRM de leads integrado con tu equipo comercial",
          ].map((feat) => (
            <div key={feat} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-accent/20">
                <svg
                  className="h-2.5 w-2.5 text-accent"
                  fill="currentColor"
                  viewBox="0 0 10 10"
                >
                  <path d="M8.5 2.5L4 7.5 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <p className="text-sm leading-snug text-white/60">{feat}</p>
            </div>
          ))}
        </div>

        {/* Testimonial card */}
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-relaxed text-white/80">
            "Desde que usamos Rocketly, el cierre de caja tarda 5 minutos en lugar de una hora."
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-accent/30" />
            <div>
              <p className="text-xs font-medium text-white">Carla Méndez</p>
              <p className="text-[11px] text-muted">Dueña, Ferretería El Perno</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-main-bg px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Rocketly POS
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Bienvenido de nuevo
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Ingresá a tu cuenta para continuar
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@negocio.com"
                className="w-full rounded-xl border border-card-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Contraseña
                </label>
                <Link
                  href="#"
                  className="text-xs text-accent hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-card-border bg-white px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
            >
              Ingresar
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-card-border bg-white py-3 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
            >
              Continuar con Google
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            ¿No tenés cuenta?{" "}
            <Link href="/onboarding" className="text-accent hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */

function IconEye({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0010 10M4.2 4.3C2.4 5.4 1 8 1 8s2.5 5 7 5c1.4 0 2.6-.4 3.7-1M6.3 3.1C6.8 3 7.4 3 8 3c4.5 0 7 5 7 5s-.6 1.2-1.7 2.4" />
    </svg>
  );
}
