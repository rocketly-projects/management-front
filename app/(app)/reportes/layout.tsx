"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Ventas",  href: "/reportes/ventas"  },
  { label: "Cierres", href: "/reportes/cierres" },
  { label: "Gastos",  href: "/reportes/gastos"  },
];

export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex flex-shrink-0 items-center border-b border-card-border bg-white px-6">
        <div className="mr-5 border-r border-card-border pr-5 py-3.5">
          <p className="text-[13px] font-bold text-foreground">Reportes</p>
        </div>
        <nav className="flex">
          {TABS.map(({ label, href }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative flex h-[46px] items-center px-4 text-[13.5px] font-semibold transition-colors",
                  active ? "text-foreground" : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-sm bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
