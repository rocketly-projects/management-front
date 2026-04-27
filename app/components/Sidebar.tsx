"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";

const nav = [
  {
    section: "PRINCIPAL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: IconDashboard },
      { label: "Productos", href: "/productos", icon: IconBox },
      { label: "Ventas", href: "/ventas", icon: IconBag },
      { label: "Caja", href: "/caja", icon: IconCash },
    ],
  },
  {
    section: "CONFIGURACIÓN",
    items: [
      { label: "Cierre de Caja", href: "/cierre-caja", icon: IconLock },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { perfil, logout } = useAuthStore();
  console.log('perfil', perfil)
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent">
          <span className="text-sm font-bold text-white">R</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Rocketly</p>
          <p className="text-xs text-muted">POS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {nav.map(({ section, items }) => (
          <div key={section}>
            <p className="mb-1 px-2 text-[10px] font-semibold tracking-widest text-muted">
              {section}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-accent font-medium text-white"
                          : "text-muted hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Workspace card */}
      <div className="m-3 rounded-xl bg-white/5 px-4 py-3">
        <p className="text-xs text-muted">Espacio de trabajo</p>
        <p className="mt-0.5 text-sm font-medium text-white">
          {perfil?.nombreNegocio ?? "Mi Negocio"}
        </p>
        {perfil?.nombreDueno && (
          <p className="mt-0.5 text-xs text-muted">{perfil.nombreDueno}</p>
        )}
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="mx-3 mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-white"
      >
        <IconLogout className="h-4 w-4 flex-shrink-0" />
        Cerrar sesión
      </button>
    </aside>
  );
}

/* ── Icons ─────────────────────────────────────────────────── */

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <path d="M13.5 5L8 2 2.5 5v6l5.5 3 5.5-3V5z" />
      <path d="M8 2v13M2.5 5l5.5 3 5.5-3" />
    </svg>
  );
}

function IconBag({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="5.5" width="12" height="9" rx="1.5" />
      <path d="M5.5 5.5V4a2.5 2.5 0 015 0v1.5" />
    </svg>
  );
}

function IconCash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1.5" y="4" width="13" height="9" rx="1.5" />
      <circle cx="8" cy="8.5" r="2" />
      <path d="M4.5 4V3M11.5 4V3" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="7.5" width="10" height="7" rx="1.5" />
      <path d="M5 7.5V5a3 3 0 016 0v2.5" />
      <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
