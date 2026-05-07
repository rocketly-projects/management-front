"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

/* ── Constants ─────────────────────────────────────────────────── */

const RUBROS = [
  { id: "kiosco",       emoji: "🏪", label: "Kiosco" },
  { id: "almacen",      emoji: "🛒", label: "Almacén" },
  { id: "panaderia",    emoji: "🥐", label: "Panadería" },
  { id: "verduleria",   emoji: "🥦", label: "Verdulería" },
  { id: "carniceria",   emoji: "🥩", label: "Carnicería" },
  { id: "farmacia",     emoji: "💊", label: "Farmacia" },
  { id: "indumentaria", emoji: "👗", label: "Indumentaria" },
  { id: "otro",         emoji: "🏬", label: "Otro" },
];

const PROVINCIAS = [
  "Buenos Aires","CABA","Catamarca","Chaco","Chubut","Córdoba","Corrientes",
  "Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones",
  "Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe",
  "Santiago del Estero","Tierra del Fuego","Tucumán",
];

const PAISES = ["Argentina","Uruguay","Paraguay","Bolivia","Chile","Perú"];

const DAYS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DEFAULT_SCHEDULE = DAYS.map((day, i) => ({
  day,
  open: i < 6,
  from: "09:00",
  to: i === 5 ? "14:00" : "20:00",
}));

const STEPS = [
  { title: "Datos del comercio", sub: "Nombre y rubro" },
  { title: "Datos de acceso",    sub: "Email y contraseña" },
  { title: "Dirección",          sub: "Dónde estás ubicado" },
  { title: "Horarios",           sub: "Cuándo abrís" },
  { title: "Revisar y confirmar",sub: "Últimos detalles" },
];

/* ── Types ─────────────────────────────────────────────────────── */

interface ScheduleRow { day: string; open: boolean; from: string; to: string; }

interface FormData {
  // Step 1 — Perfil / Tenant
  nombreNegocio:   string;
  nombreDueno:     string;
  rubro:           string;
  taxId:           string;
  telefono:        string;
  email:           string;
  password:        string;
  confirmPassword: string;
  // Step 2 — Dirección
  calle:     string;
  ciudad:    string;
  provincia: string;
  cp:        string;
  pais:      string;
  // Step 3 — Horarios
  schedule: ScheduleRow[];
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const [step, setStep]   = useState(0);
  const [done, setDone]   = useState(false);
  const [form, setForm]   = useState<FormData>({
    nombreNegocio:   "",
    nombreDueno:     "",
    rubro:           "kiosco",
    taxId:           "",
    telefono:        "",
    email:           "",
    password:        "",
    confirmPassword: "",
    calle:           "",
    ciudad:          "Buenos Aires",
    provincia:       "Buenos Aires",
    cp:              "",
    pais:            "Argentina",
    schedule:        DEFAULT_SCHEDULE,
  });
  const [stepError, setStepError] = useState<string | null>(null);
  const { register, loading, error } = useAuth();

  function setField<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast   = step === STEPS.length - 1;

  async function handleNext() {
    setStepError(null);

    if (step === 0) {
      if (!form.nombreNegocio.trim()) {
        setStepError("El nombre del comercio es obligatorio.");
        return;
      }
    }

    if (step === 1) {
      if (!form.email.trim()) {
        setStepError("El email es obligatorio.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setStepError("Ingresá un email válido.");
        return;
      }
      if (form.password.length < 8) {
        setStepError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setStepError("Las contraseñas no coinciden.");
        return;
      }
    }

    if (isLast) {
      const direccion = [form.calle, form.ciudad, form.provincia, form.cp, form.pais]
        .filter(Boolean)
        .join(", ");
      try {
        await register({
          email:         form.email,
          password:      form.password,
          nombreNegocio: form.nombreNegocio,
          nombreDueno:   form.nombreDueno || undefined,
          telefono:      form.telefono || undefined,
          taxId:         form.taxId || undefined,
          direccion:     direccion || undefined,
        });
        setDone(true);
      } catch {
        // error displayed via `error` state
      }
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  if (done) return <SuccessScreen name={form.nombreNegocio} />;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left nav ───────────────────────────────────────────── */}
      <div className="hidden w-[280px] flex-shrink-0 flex-col bg-sidebar lg:flex"
           style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-white/5 px-7 py-8">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] bg-accent"
               style={{ boxShadow: "0 3px 10px rgba(79,110,247,0.35)" }}>
            <span className="text-[15px] font-extrabold text-white">R</span>
          </div>
          <div>
            <p className="text-base font-extrabold leading-none text-white">Rocketly</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
              Nuevo comercio
            </p>
          </div>
        </div>

        {/* Steps */}
        <nav className="flex flex-col gap-1 px-5 py-7">
          {STEPS.map((s, i) => {
            const isDone   = i < step;
            const isActive = i === step;
            const cls      = isDone ? "done" : isActive ? "active" : "pending";
            return (
              <div key={i}>
                <div
                  className={[
                    "flex cursor-default items-start gap-3 rounded-[9px] px-3 py-2.5 transition-colors",
                    isDone ? "cursor-pointer hover:bg-white/5" : "",
                  ].join(" ")}
                  onClick={isDone ? () => setStep(i) : undefined}
                >
                  {/* Indicator */}
                  <div
                    className={[
                      "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-all",
                      isDone
                        ? "bg-accent text-white"
                        : isActive
                          ? "bg-accent text-white shadow-[0_0_0_4px_rgba(79,110,247,0.2)]"
                          : "border border-white/10 bg-white/5 text-muted",
                    ].join(" ")}
                  >
                    {isDone ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12"
                           stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-6" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <p className={[
                      "text-[13px] font-bold leading-none",
                      isActive ? "text-white" : isDone ? "text-white/50" : "text-white/25",
                    ].join(" ")}>
                      {s.title}
                    </p>
                    <p className={[
                      "mt-1 text-[11.5px] font-medium",
                      isActive ? "text-muted" : "text-white/20",
                    ].join(" ")}>
                      {s.sub}
                    </p>
                  </div>
                </div>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="ml-[22px] h-3 w-px bg-white/8" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer — time estimate */}
        <div className="mt-auto border-t border-white/5 px-7 py-5">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5">
            <svg className="h-[15px] w-[15px] flex-shrink-0 text-accent" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-semibold text-muted">
              Tiempo estimado:{" "}
              <span className="font-bold text-white/70">~2 min</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-main-bg">
        {/* Progress bar */}
        <div className="h-[3px] flex-shrink-0 bg-card-border">
          <div
            className="h-full rounded-r-sm bg-accent transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[560px] px-6 py-[52px]">
            {step === 0 && <Step1 form={form} setField={setField} />}
            {step === 1 && <StepCredentials form={form} setField={setField} />}
            {step === 2 && <Step2 form={form} setField={setField} />}
            {step === 3 && <Step3 form={form} setField={setField} />}
            {step === 4 && <Step4 form={form} onEdit={setStep} />}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-card-border bg-main-bg">
          {(stepError || error) && (
            <div className="px-10 pt-3 text-sm text-red-500">{stepError || error}</div>
          )}
          <div className="flex items-center justify-between px-10 py-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-[9px] border border-card-border bg-white px-[18px] py-2.5 text-[13.5px] font-bold text-foreground/60 transition-colors hover:border-gray-300"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14"
                     stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 1L3 7l6 6" />
                </svg>
                Atrás
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-muted hover:text-foreground transition-colors"
              >
                ← Volver al login
              </Link>
            )}

            <span className="text-[12.5px] font-semibold text-muted">
              Paso <span className="font-extrabold text-foreground">{step + 1}</span>{" "}
              de{" "}
              <span className="font-extrabold text-foreground">{STEPS.length}</span>
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className={[
                "flex items-center gap-2 rounded-[9px] border-none px-7 py-3 text-sm font-extrabold text-white transition-colors disabled:opacity-60",
                isLast
                  ? "bg-sidebar hover:bg-sidebar-dark"
                  : "bg-accent hover:bg-accent/90",
              ].join(" ")}
              style={{
                boxShadow: isLast
                  ? "0 3px 12px rgba(26,31,46,0.3)"
                  : "0 3px 12px rgba(79,110,247,0.3)",
              }}
            >
              {isLast && loading ? "Creando..." : isLast ? "Crear mi comercio" : "Continuar"}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16"
                   stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M9 3l5 5-5 5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Datos del comercio ───────────────────────────────── */

function Step1({
  form,
  setField,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div>
      <p className={eyebrow}>Paso 1 de 5</p>
      <h1 className={headline}>Contanos sobre tu comercio</h1>
      <p className={sub}>
        Tomará menos de un minuto. Estos datos aparecerán en tus tickets y reportes.
      </p>

      <FormGroup label="Nombre del comercio" required htmlFor="nombreNegocio">
        <input
          id="nombreNegocio"
          className={inputCls}
          placeholder="Ej: Kiosco El Puente"
          value={form.nombreNegocio}
          onChange={(e) => setField("nombreNegocio", e.target.value)}
          autoFocus
        />
      </FormGroup>

      <FormGroup
        label="Tu nombre"
        htmlFor="nombreDueno"
        hint="como querés que te llame el sistema"
      >
        <input
          id="nombreDueno"
          className={inputCls}
          placeholder="Ej: Diego"
          value={form.nombreDueno}
          onChange={(e) => setField("nombreDueno", e.target.value)}
        />
      </FormGroup>

      <FormGroup label="Rubro" required htmlFor="rubro-grid">
        <div className="mt-0.5 grid grid-cols-4 gap-2" id="rubro-grid">
          {RUBROS.map((r) => {
            const selected = form.rubro === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setField("rubro", r.id)}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-[9px] border px-2 py-2.5 transition-all",
                  selected
                    ? "border-accent bg-accent/8 shadow-[0_0_0_2.5px_rgba(79,110,247,0.15)]"
                    : "border-card-border bg-white hover:border-gray-300 hover:bg-gray-50/80",
                ].join(" ")}
              >
                <span className="text-[22px] leading-none">{r.emoji}</span>
                <span
                  className={[
                    "text-center text-[11.5px] font-bold",
                    selected ? "text-accent" : "text-foreground/70",
                  ].join(" ")}
                >
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </FormGroup>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <FormGroup label="CUIT" htmlFor="taxId" hint="opcional">
          <input
            id="taxId"
            className={inputCls}
            placeholder="20-12345678-9"
            value={form.taxId}
            onChange={(e) => setField("taxId", e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Teléfono de contacto" htmlFor="telefono" hint="opcional">
          <input
            id="telefono"
            className={inputCls}
            placeholder="+54 9 11 1234-5678"
            value={form.telefono}
            onChange={(e) => setField("telefono", e.target.value)}
          />
        </FormGroup>
      </div>
    </div>
  );
}

/* ── Step Credentials: Datos de acceso ────────────────────────── */

function StepCredentials({
  form,
  setField,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div>
      <p className={eyebrow}>Paso 2 de 5</p>
      <h1 className={headline}>Creá tu acceso</h1>
      <p className={sub}>
        Con estos datos vas a iniciar sesión en Rocketly. Usá una contraseña segura.
      </p>

      <FormGroup label="Email" required htmlFor="email">
        <input
          id="email"
          type="email"
          className={inputCls}
          placeholder="tu@email.com"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          autoComplete="email"
          autoFocus
        />
      </FormGroup>

      <FormGroup label="Contraseña" required htmlFor="password">
        <div className="relative">
          <input
            id="password"
            type={showPwd ? "text" : "password"}
            className={inputCls + " pr-10"}
            placeholder="Mín. 8 caracteres"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
          >
            {showPwd ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </FormGroup>

      <FormGroup label="Repetir contraseña" required htmlFor="confirmPassword">
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            className={inputCls + " pr-10"}
            placeholder="Repetí tu contraseña"
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
          >
            {showConfirm ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </FormGroup>
    </div>
  );
}

/* ── Step 2: Dirección ────────────────────────────────────────── */

function Step2({
  form,
  setField,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div>
      <p className={eyebrow}>Paso 3 de 5</p>
      <h1 className={headline}>¿Dónde está tu comercio?</h1>
      <p className={sub}>
        Usamos la dirección para configurar la zona horaria y los reportes locales.
      </p>

      <FormGroup label="Calle y número" required htmlFor="calle">
        <input
          id="calle"
          className={inputCls}
          placeholder="Av. Corrientes 1234"
          value={form.calle}
          onChange={(e) => setField("calle", e.target.value)}
          autoFocus
        />
      </FormGroup>

      <div className="grid grid-cols-2 gap-3.5">
        <FormGroup label="Ciudad" required htmlFor="ciudad">
          <input
            id="ciudad"
            className={inputCls}
            placeholder="Buenos Aires"
            value={form.ciudad}
            onChange={(e) => setField("ciudad", e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Provincia" required htmlFor="provincia">
          <select
            id="provincia"
            className={inputCls}
            value={form.provincia}
            onChange={(e) => setField("provincia", e.target.value)}
          >
            {PROVINCIAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </FormGroup>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <FormGroup label="Código postal" htmlFor="cp">
          <input
            id="cp"
            className={inputCls}
            placeholder="1414"
            value={form.cp}
            onChange={(e) => setField("cp", e.target.value)}
          />
        </FormGroup>
        <FormGroup label="País" htmlFor="pais">
          <select
            id="pais"
            className={inputCls}
            value={form.pais}
            onChange={(e) => setField("pais", e.target.value)}
          >
            {PAISES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </FormGroup>
      </div>

      {/* Info box */}
      <div className="mt-2 flex items-start gap-2.5 rounded-[9px] border border-accent/20 bg-accent/6 px-3.5 py-3">
        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <p className="text-[12.5px] font-medium leading-snug text-accent/80">
          Podés agregar más sucursales después desde Configuración → Ubicaciones.
        </p>
      </div>
    </div>
  );
}

/* ── Step 3: Horarios ─────────────────────────────────────────── */

function Step3({
  form,
  setField,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  function toggleDay(i: number) {
    const s = [...form.schedule];
    s[i] = { ...s[i], open: !s[i].open };
    setField("schedule", s);
  }
  function setTime(i: number, field: "from" | "to", val: string) {
    const s = [...form.schedule];
    s[i] = { ...s[i], [field]: val };
    setField("schedule", s);
  }

  return (
    <div>
      <p className={eyebrow}>Paso 4 de 5</p>
      <h1 className={headline}>¿Cuándo abrís?</h1>
      <p className={sub}>
        Configurá los horarios de atención. Podés cambiarlos cuando quieras desde Configuración.
      </p>

      <div className="flex flex-col gap-1.5">
        {form.schedule.map((row, i) => (
          <div
            key={i}
            className={[
              "flex items-center gap-2.5 rounded-lg border border-card-border bg-white px-3 py-2 transition-opacity",
              row.open ? "opacity-100" : "opacity-50",
            ].join(" ")}
          >
            <span className="w-9 flex-shrink-0 text-[12.5px] font-bold text-foreground">
              {row.day}
            </span>

            {row.open ? (
              <div className="flex flex-1 items-center justify-end gap-1.5">
                <input
                  type="time"
                  value={row.from}
                  onChange={(e) => setTime(i, "from", e.target.value)}
                  className="h-[30px] w-[72px] rounded-md border border-card-border bg-gray-50 text-center font-mono text-[13px] font-bold text-foreground outline-none transition-colors focus:border-accent"
                />
                <span className="text-xs font-semibold text-muted">a</span>
                <input
                  type="time"
                  value={row.to}
                  onChange={(e) => setTime(i, "to", e.target.value)}
                  className="h-[30px] w-[72px] rounded-md border border-card-border bg-gray-50 text-center font-mono text-[13px] font-bold text-foreground outline-none transition-colors focus:border-accent"
                />
              </div>
            ) : (
              <div className="flex-1 text-right">
                <span className="text-xs font-semibold italic text-muted">Cerrado</span>
              </div>
            )}

            {/* Toggle */}
            <button
              type="button"
              onClick={() => toggleDay(i)}
              className="ml-2 flex items-center gap-1.5"
            >
              <div
                className={[
                  "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all",
                  row.open
                    ? "border-accent bg-accent"
                    : "border-card-border bg-white",
                ].join(" ")}
              >
                {row.open && (
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 10 10"
                       stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1.5 5l3 3 4-5" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-muted">
                {row.open ? "Abierto" : "Cerrado"}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 4: Confirmar ────────────────────────────────────────── */

function Step4({
  form,
  onEdit,
}: {
  form: FormData;
  onEdit: (step: number) => void;
}) {
  const rubro       = RUBROS.find((r) => r.id === form.rubro);
  const openDays    = form.schedule.filter((d) => d.open);
  const addressParts = [form.calle, form.ciudad, form.provincia].filter(Boolean);

  return (
    <div>
      <p className={eyebrow}>Paso 5 de 5</p>
      <h1 className={headline}>
        Todo listo, {form.nombreDueno || "bienvenido"}
      </h1>
      <p className={sub}>
        Revisá los datos antes de crear tu comercio. Podés editar cualquier sección haciendo clic en &ldquo;Editar&rdquo;.
      </p>

      {/* Comercio */}
      <ConfirmCard title="Comercio" onEdit={() => onEdit(0)}>
        <ConfirmRow label="Nombre" value={form.nombreNegocio || <Empty />} />
        <ConfirmRow label="Rubro" value={rubro ? `${rubro.emoji} ${rubro.label}` : "—"} />
        {form.nombreDueno && <ConfirmRow label="Responsable" value={form.nombreDueno} />}
        {form.telefono    && <ConfirmRow label="Teléfono"    value={form.telefono}    />}
        {form.taxId       && <ConfirmRow label="CUIT"        value={form.taxId}       />}
        <ConfirmRow label="Email" value={form.email || <Empty />} />
        <ConfirmRow label="Contraseña" value="••••••••" />
      </ConfirmCard>

      {/* Dirección */}
      <ConfirmCard title="Dirección" onEdit={() => onEdit(2)}>
        <ConfirmRow
          label="Dirección"
          value={addressParts.length ? addressParts.join(", ") : <Empty />}
        />
        {form.cp && <ConfirmRow label="Código postal" value={form.cp} />}
        <ConfirmRow label="País" value={form.pais} />
      </ConfirmCard>

      {/* Horarios */}
      <ConfirmCard title={`Horarios — ${openDays.length} días abierto`} onEdit={() => onEdit(3)}>
        {openDays.map((d, i) => (
          <ConfirmRow key={i} label={d.day} value={`${d.from} – ${d.to}`} />
        ))}
      </ConfirmCard>
    </div>
  );
}

/* ── Success screen ───────────────────────────────────────────── */

function SuccessScreen({ name }: { name: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-0 bg-main-bg px-10 py-10"
         style={{ animation: "fadeUp 0.4s ease" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <span className="mb-5 text-5xl" style={{ animation: "bounce 0.6s ease" }}>🚀</span>
      <style>{`@keyframes bounce{0%,100%{transform:scale(1)}40%{transform:scale(1.2)}}`}</style>

      <h1 className="mb-2.5 text-center text-[32px] font-extrabold leading-tight tracking-tight text-foreground">
        ¡{name || "Tu comercio"} está listo!
      </h1>
      <p className="mb-9 max-w-[440px] text-center text-[15px] font-medium leading-relaxed text-muted">
        Configuramos todo para que puedas empezar a vender de inmediato. Estos son tus próximos pasos:
      </p>

      {/* Next steps */}
      <div className="mb-9 grid max-w-[560px] grid-cols-3 gap-3">
        {[
          { emoji: "📦", title: "Cargá tus productos",  sub: "Agregá el catálogo con precios y stock" },
          { emoji: "💰", title: "Abrí la caja",          sub: "Y procesá tu primera venta" },
          { emoji: "📊", title: "Revisá los reportes",   sub: "Al final del día desde Cierre de Caja" },
        ].map((card, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[11px] border border-card-border bg-white p-4">
            <span className="text-[22px]">{card.emoji}</span>
            <p className="text-[13px] font-extrabold tracking-tight text-foreground">{card.title}</p>
            <p className="text-xs font-medium leading-snug text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      <Link
        href="/"
        className="flex items-center gap-2 rounded-[11px] px-9 py-3.5 text-base font-extrabold tracking-tight text-white transition-colors"
        style={{
          background: "#4f6ef7",
          boxShadow: "0 4px 18px rgba(79,110,247,0.35)",
        }}
      >
        Ir a mi comercio
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 18 18"
             stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h12M9 3l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

/* ── Shared helpers ───────────────────────────────────────────── */

function FormGroup({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold tracking-[0.1px] text-foreground/60">
        {label}
        {required && <span className="ml-0.5 text-red-500"> *</span>}
        {hint && (
          <span className="ml-1.5 font-medium text-foreground/40">({hint})</span>
        )}
      </label>
      {children}
    </div>
  );
}

function ConfirmCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 rounded-xl border border-card-border bg-white px-[22px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.5px] text-muted">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11.5px] font-bold text-accent hover:text-accent/70 transition-colors"
        >
          Editar
        </button>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-[120px] flex-shrink-0 pt-px text-[12.5px] font-medium text-muted">{label}</span>
      <span className="flex-1 text-[13px] font-bold text-foreground">{value}</span>
    </div>
  );
}

function Empty() {
  return <span className="font-medium italic text-muted/70">Sin completar</span>;
}

/* ── Style tokens ─────────────────────────────────────────────── */

const eyebrow  = "mb-2 text-[11px] font-extrabold uppercase tracking-[0.8px] text-accent";
const headline = "mb-2 text-[26px] font-extrabold leading-tight tracking-tight text-foreground";
const sub      = "mb-8 text-sm font-medium leading-relaxed text-muted";
const inputCls =
  "h-11 w-full rounded-[9px] border border-card-border bg-white px-3.5 font-sans text-sm font-medium text-foreground placeholder:text-muted outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,110,247,0.11)]";
