import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Perfil } from "../types";

interface AuthState {
  token: string | null;
  perfil: Perfil | null;
  isAuthenticated: boolean;
  setAuth: (token: string, perfil: Perfil) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      perfil: null,
      isAuthenticated: false,
      setAuth: (token, perfil) => {
        // Also set cookie so Next.js middleware can read it
        document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        set({ token, perfil, isAuthenticated: true });
      },
      logout: () => {
        document.cookie = "auth-token=; path=/; max-age=0";
        set({ token: null, perfil: null, isAuthenticated: false });
      },
    }),
    { name: "auth-store" }
  )
);
