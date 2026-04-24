"use client";

import { useCajaStore } from "../store/cajaStore";

export function useCaja() {
  return useCajaStore();
}
