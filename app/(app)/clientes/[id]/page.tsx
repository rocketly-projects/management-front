"use client";

import { use } from "react";
import Link from "next/link";
import { ClienteDetalleContent } from "../_components/ClienteDetalleContent";

export default function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-card-border bg-white px-6 py-2">
        <Link
          href="/clientes"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
          aria-label="Volver"
        >
          <IconArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-[12px] text-muted">Volver al listado</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <ClienteDetalleContent id={id} />
      </div>
    </div>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4l-4 4 4 4M6 8h8" />
    </svg>
  );
}
