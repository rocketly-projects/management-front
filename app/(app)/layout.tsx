"use client";

import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useCajaStore } from "@/lib/store/cajaStore";
import { useAuthStore } from "@/lib/store/authStore";
import { getPerfil } from "@/lib/api/perfil";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const fetchActiva = useCajaStore((s) => s.fetchActiva);
  const { perfil, token, setAuth } = useAuthStore();

  useEffect(() => {
    fetchActiva();
  }, [fetchActiva]);

  useEffect(() => {
    if (!perfil && token) {
      getPerfil().then((p) => setAuth(token, p)).catch(() => {});
    }
  }, [perfil, token, setAuth]);

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-main-bg">{children}</main>
    </div>
  );
}
