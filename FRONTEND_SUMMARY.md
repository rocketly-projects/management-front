# Rocketly POS — Estado del Frontend

> Fecha: 2026-04-24

---

## Stack tecnologico

- **Next.js 16.2.4** (App Router) con **React 19.2.4**
- **TypeScript 5**
- **Tailwind CSS 4** (con `@tailwindcss/postcss`)
- Sin librerias de componentes externas (todo HTML/SVG custom)
- Sin estado global (solo `useState`/`useMemo` locales por pagina)
- Sin cliente HTTP ni integracion con backend — **todos los datos son mock hardcodeados**
- Fuentes: Inter (sans) + JetBrains Mono

---

## Design system

Tokens definidos en `globals.css`:

| Token | Valor |
|---|---|
| `sidebar` | #1a1f2e |
| `accent` | #4f6ef7 |
| `main-bg` | #f7f8fb |
| `muted` | #8892b0 |
| `card-border` | #e5e7eb |
| `foreground` | #111827 |

Animaciones globales: `fadeSlideIn`, `slideDown`, `slideLeft`

---

## Estructura de rutas

```
/                        → redirect a /dashboard
/(auth)/login            → login
/(auth)/onboarding       → alta de nuevo comercio (4 pasos)
/(app)/dashboard         → panel principal
/(app)/productos         → catalogo de productos
/(app)/ventas            → historial de ventas
/(app)/caja              → POS (punto de venta)
/(app)/cierre-caja       → cierre de caja diario
```

El layout `(app)` incluye el `Sidebar`. El layout `(auth)` no lo incluye.

---

## Paginas implementadas

### `/login`
- Panel izquierdo con branding + lista de features + tarjeta de testimonial (solo desktop)
- Formulario email/password con toggle de visibilidad
- Boton "Continuar con Google" (no funcional)
- Link a onboarding

### `/onboarding` (4 pasos)
1. **Datos del comercio** — nombre, nombre del dueno, rubro (grilla de 8 emojis), CUIT, telefono
2. **Direccion** — calle, ciudad, provincia (select con 24 provincias), CP, pais
3. **Horarios** — grilla de 7 dias con toggle abierto/cerrado e inputs de hora
4. **Confirmar** — resumen editable con boton "Editar" por seccion

Post-onboarding: pantalla de exito con 3 proximos pasos y boton "Ir a mi comercio".

Navegacion: progress bar superior, sidebar izquierdo con steps (done/active/pending), footer con "Atras"/"Continuar".

### `/dashboard`
- Header: saludo dinamico (segun hora), fecha, pill "Caja abierta", boton "Nueva venta"
- 4 KPI cards: ventas del dia, cantidad de ventas, ticket promedio, productos vendidos (con delta vs. ayer)
- Grafico de barras SVG de ventas por hora (8h a 15h, barra activa resaltada)
- Panel de acciones rapidas: cargar producto, cierre de caja, ver reportes
- Top 5 productos del dia con barra de progreso relativa
- Panel de alertas descartables (stock critico, stock bajo, sin precio)

### `/productos`
- Tabla con 15 productos mock (name, brand, code, cat, price, cost, stock, active)
- Busqueda por nombre/marca/codigo (shortcut de teclado `/`)
- Filtro por categoria (select) + chips de estado: Todos / Stock critico / Stock bajo / Sin precio / Inactivos
- Columnas ordenables: nombre, codigo, categoria, precio, stock
- Seleccion multiple con checkbox + bulk actions: ajuste de precio (%) y eliminar
- Precio inline editable directamente en la celda (click para editar, Enter/Escape)
- Acciones por fila: editar, duplicar, eliminar
- **Slide panel derecho** para crear/editar producto: imagen (drop zone), nombre, marca, categoria, codigo de barras, precio, costo, indicador de margen (verde/amarillo/rojo), stock, toggle activo/inactivo
- Modal de ajuste de precio bulk con porcentaje configurable

### `/ventas`
- 4 KPI cards con sparklines SVG: facturado, cantidad de ventas, ticket promedio, devoluciones
- Filtros: segmented control de periodo (Hoy/Ayer/Semana/Mes), busqueda (shortcut Cmd+K), metodo de pago, estado, usuario cajero
- Tabla de 12 ventas mock: ID, productos, metodo de pago (pill coloreada), estado, total, menu de contexto
- **Drawer lateral** de detalle de venta: lista de items con precios unitarios, subtotal + impuestos (21%) + descuento + total, datos del comprobante y cajero, acciones: reimprimir / enviar / anular
- Panel lateral derecho con 3 widgets:
  - Breakdown de metodos de pago con barras de porcentaje
  - Top 5 productos mas vendidos
  - Heatmap de ventas por hora (8h–19h, intensidad por concentracion)

### `/caja` (POS)
- Header oscuro con numero de venta correlativo y reloj en tiempo real
- Barra de busqueda de productos con dropdown autocomplete (busqueda por nombre o codigo de barras), navegacion por teclado (arriba/abajo/Enter/Escape)
- Tabla de carrito: producto, cantidad (control +/−/input), precio unitario, subtotal, eliminar
- Footer del carrito con conteo de productos/unidades y atajos de teclado
- Panel de pago derecho:
  - Subtotal + descuento (toggle % o monto fijo)
  - Total en grande con color accent
  - 5 metodos de pago con teclas de funcion (F1–F5)
  - Input de efectivo con calculo de vuelto en tiempo real + presets rapidos ($500, $1000, etc.)
  - Boton "Cobrar" (F12 / Ctrl+Enter)
- Keyboard shortcuts completos: F1–F5 metodos, F12 cobrar, flechas navegar carrito, +/− cantidad, Delete eliminar item
- Modal de exito post-cobro con resumen de items, descuento, metodo, vuelto, botones "Ticket" y "Nueva venta"
- Status bar inferior oscura con info del comercio, caja y usuario

### `/cierre-caja`
- Header con estado de caja (abierta/cerrada), link a caja
- 4 KPI cards del dia: total facturado, cantidad de ventas, ticket promedio, productos vendidos
- Desglose por metodo de pago con barras de porcentaje y montos
- Top 5 productos del dia con ranking y revenue
- Grafico comparativo de la semana (barras SVG + linea de promedio punteada + leyenda)
- Seccion de conteo de efectivo:
  - 3 boxes: sistema registra / contado en caja / diferencia (con colores segun sobrante/faltante)
  - Input de monto contado con diferencia en tiempo real y badge sobrante/faltante
  - Textarea de observaciones opcional
- CTA de cierre con boton "Cerrar caja del dia"
- Modal de confirmacion post-cierre con resumen completo de la jornada y opcion de imprimir reporte

---

## Componentes compartidos

### `Sidebar`
- Navegacion lateral con 2 secciones:
  - PRINCIPAL: Dashboard, Productos, Ventas, Caja
  - CONFIGURACION: Cierre de Caja
- Active state detectado por `usePathname()`
- Card de workspace al fondo ("Mi Negocio" — hardcodeado)

### `TopBar`
- Existe el archivo (`app/components/TopBar.tsx`) pero **no esta integrado en ningun layout**

### Iconos
- Todos los iconos son SVG inline definidos como funciones dentro de cada archivo de pagina. No se usa ninguna libreria de iconos.

---

## Lo que NO esta hecho / pendiente

### Integracion
- **Sin autenticacion real** — login y onboarding no llaman a ninguna API
- **Sin integracion con backend** — 100% de los datos son mock en memoria
- **Sin persistencia** — los cambios se pierden al recargar la pagina
- **Sin manejo de errores ni loading/skeleton states**
- **Sin estado global** — no hay Context, Zustand, Redux ni nada similar

### Paginas faltantes
- Configuracion del negocio (editar datos del onboarding)
- Gestion de usuarios / cajeros
- Reportes historicos (mas alla del dia actual)
- CRM de clientes / leads
- Gestion de sucursales / ubicaciones

### Issues menores
- `TopBar.tsx` existe pero no se usa
- El sidebar muestra "Mi Negocio" hardcodeado (no conectado al tenant del onboarding)
- Los numeros de venta, fechas y KPIs estan hardcodeados con datos de ejemplo
- La paginacion en `/ventas` es decorativa (3 botones sin logica real)
- El boton "Exportar" en `/ventas` no hace nada
- El boton "Imprimir reporte" en `/cierre-caja` no hace nada
- El boton "Continuar con Google" en `/login` no hace nada
