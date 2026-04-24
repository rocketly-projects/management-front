"use client";

import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useCajaStore } from "@/lib/store/cajaStore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const fetchActiva = useCajaStore((s) => s.fetchActiva);

  useEffect(() => {
    fetchActiva();
  }, [fetchActiva]);

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-main-bg">{children}</main>
    </div>
  );
}
