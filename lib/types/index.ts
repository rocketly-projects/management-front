// Mirrors the Prisma schema from management-back

export type EstadoCaja = "ABIERTA" | "CERRADA";
export type MetodoPago = "EFECTIVO" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "MERCADO_PAGO" | "FIADO";
export type MetodoPagoNoFiado = Exclude<MetodoPago, "FIADO">;
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
  tenantNombre: string;
  tenantNombreDisplay: string;
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
  creadoEn: string;
  actualizadoEn: string;
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
  clienteId: string | null;
  creadoEn: string;
  items?: ItemVenta[];
  cliente?: Pick<Cliente, "id" | "nombre">;
}

export interface Cliente {
  id: string;
  tenantId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  notas: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ClienteConDeuda extends Cliente {
  deuda: number;
}

export interface PagoFiado {
  id: string;
  tenantId: string;
  clienteId: string;
  ventaId: string | null;
  monto: number;
  metodoPago: MetodoPagoNoFiado;
  notas: string | null;
  creadoEn: string;
}

export type MovimientoCuenta =
  | {
      tipo: "VENTA_FIADO";
      id: string;
      fecha: string;
      monto: number;
      ventaNumero: number;
      estado: EstadoVenta;
    }
  | {
      tipo: "PAGO_FIADO";
      id: string;
      fecha: string;
      monto: number;
      metodoPago: MetodoPagoNoFiado;
      ventaId: string | null;
      notas: string | null;
    };

export interface ClienteCuenta {
  cliente: Cliente;
  deuda: number;
  movimientos: MovimientoCuenta[];
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
  creadoEn: string;
}

export interface GastoConCaja extends Gasto {
  cajaApertura: string | null;
}

export interface CajaConAgregados extends Caja {
  totalFacturado: number;
  cantVentas:     number;
  gastosTotal:    number;
}

export interface CajaResumen {
  caja: Caja;
  totales: {
    totalFacturado: number;
    cantVentas:     number;
    ticketPromedio: number;
  };
  porMetodo: Array<{ metodoPago: MetodoPago; total: number; cantidad: number; porcentaje: number }>;
  gastos: { lista: Gasto[]; total: number; cantidad: number };
}

// ── Reporte types ───────────────────────────────────────────────

export interface DashboardReporte {
  fecha: string;
  kpis: {
    totalFacturado: { valor: number; deltaVsAyer: number };
    cantidadVentas: { valor: number; deltaVsAyer: number };
    ticketPromedio: { valor: number; deltaVsAyer: number };
    productosVendidos: { valor: number; deltaVsAyer: number };
  };
  ventasPorHora: Array<{ hora: number; total: number; cantidad: number }>;
  topProductos: Array<{ productoId: string; nombre: string; cantidad: number; total: number }>;
}

export interface CierreCajaReporte {
  caja: { id: string; apertura: string; cierre?: string };
  totales: {
    totalFacturado: number;
    cantidadVentas: number;
    ticketPromedio: number;
    productosVendidos: number;
  };
  desglosePagos: Array<{ metodo: MetodoPago; monto: number; cantidad: number; porcentaje: number }>;
  topProductos: Array<{ productoId: string; nombre: string; cantidad: number; total: number }>;
  comparativoSemanal: Array<{ fecha: string; diaSemana: string; total: number; cantidadVentas: number }>;
  gastos: { total: number; cantidad: number };
}

export interface ComparativoSemanal {
  dias: Array<{ fecha: string; total: number }>;
  totalSemana: number;
  promedio: number;
}

export interface VentasAgregadasHora   { hora: number; total: number; cantidad: number }
export interface VentasAgregadasDia    { fecha: string; total: number; cantidad: number }
export interface VentasAgregadasMetodo { metodoPago: MetodoPago; total: number; cantidad: number; porcentaje: number }

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
