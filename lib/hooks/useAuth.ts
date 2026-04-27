"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import { login as apiLogin, register as apiRegister } from "../api/auth";
import type { RegisterPayload } from "../api/auth";
import { ApiError, apiFetch } from "../api/client";
import type { Perfil } from "../types";

export function useAuth() {
  const { setAuth, logout: storeLogout, perfil, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPerfilWithToken(token: string): Promise<Perfil> {
    return apiFetch<Perfil>("/perfil", {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const { token, perfil: perfilFromLogin } = await apiLogin(email, password);
      const perfil = perfilFromLogin ?? await fetchPerfilWithToken(token);
      setAuth(token, perfil);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function register(data: RegisterPayload) {
    setLoading(true);
    setError(null);
    try {
      const { token, perfil: perfilFromRegister } = await apiRegister(data);
      const perfil = perfilFromRegister ?? await fetchPerfilWithToken(token);
      setAuth(token, perfil);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear la cuenta");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    storeLogout();
    router.push("/login");
  }

  return { login, register, logout, loading, error, perfil, isAuthenticated };
}
