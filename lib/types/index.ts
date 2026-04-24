// Mirrors the Prisma schema from management-back

export type EstadoCaja = "ABIERTA" | "CERRADA";
export type MetodoPago = "EFECTIVO" | "TARJETA_DEBITO" | "TARJETA_CREDITO" | "TRANSFERENCIA" | "OTRO";
export type EstadoVenta = "COMPLETADA" | "ANULADA";

export interface Tenant {
  id: string;
  email: string;
  nombre: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface Perfil {
  id: string;
  tenantId: string;
  nombreNegocio: string;
  nombreDueno: string;
  telefono: string | null;
  direccion: string | null;
  taxId: string | null;
  moneda: string;
  logo: string | null;
}

export interface Configuracion {
  id: string;
  tenantId: string;
  tema: "LIGHT" | "DARK";
  accentColor: string;
}

export interface Producto {
  id: string;
  tenantId: string;
  sku: string | null;
  nombre: string;
  marca: string | null;
  precio: number;
  costo: number | null;
  stock: number;
  stockAlert: number | null;
  categoria: string | null;
  imagen: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemVenta {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto?: Pick<Producto, "nombre" | "sku">;
}

export interface Venta {
  id: string;
  tenantId: string;
  numero: number;
  total: number;
  descuento: number;
  metodoPago: MetodoPago;
  estado: EstadoVenta;
  cajaId: string;
  createdAt: string;
  items?: ItemVenta[];
}

export interface Caja {
  id: string;
  tenantId: string;
  montoInicial: number;
  montoCierre: number | null;
  apertura: string;
  cierre: string | null;
  estado: EstadoCaja;
  notas: string | null;
}

export interface Gasto {
  id: string;
  cajaId: string;
  descripcion: string;
  monto: number;
  createdAt: string;
}

// API response wrappers
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthResponse {
  token: string;
  perfil: Perfil;
}
