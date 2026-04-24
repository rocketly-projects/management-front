# Plan de integración Frontend ↔ Backend

> Proyecto: Rocketly POS
> Fecha: 2026-04-24

---

## Arquitectura elegida

**Estructura en 3 capas:**

```
lib/
├── api/
│   ├── client.ts          ← fetch base con JWT, errores, headers
│   ├── auth.ts            ← login, register
│   ├── productos.ts       ← CRUD productos
│   ├── ventas.ts          ← crear, listar, anular
│   ├── caja.ts            ← abrir, cerrar, gastos
│   └── perfil.ts          ← get/put perfil
├── store/
│   ├── authStore.ts       ← token, perfil (Zustand + persist)
│   ├── cajaStore.ts       ← caja activa
│   └── productosStore.ts  ← catálogo compartido POS/productos
├── hooks/
│   ├── useAuth.ts
│   ├── useProductos.ts
│   ├── useVentas.ts
│   └── useCaja.ts
└── types/
    └── index.ts           ← tipos que espeja tu schema Prisma
```

**Estado global:** Zustand (con `persist` para auth).
**Data fetching:** hooks custom con `useState`/`useEffect`.

---

## Orden de las fases

Ordenado por **dependencia técnica** — cada fase desbloquea la siguiente.

1. Setup base
2. Auth (login + onboarding)
3. Productos
4. Caja
5. POS (la venta)
6. Historial de ventas
7. Cierre de caja
8. Dashboard
9. Endpoints de reportes (backend)

---

## Fase 0 — Setup base

**Objetivo:** dejar lista la infraestructura para que todas las fases siguientes solo agreguen código.

### Tareas

- Instalar dependencias: `zustand`
- Crear `.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:3001` (o el puerto que uses)
- Crear estructura de carpetas (ver arriba)
- Implementar `client.ts` con:
  - Función `apiFetch<T>()` genérica
  - Lectura del token desde `authStore`
  - Manejo de errores normalizado (clase `ApiError` con `status`, `message`, `fields?`)
  - Manejo especial del 401 → logout automático
- Definir tipos base en `lib/types/index.ts` espejando el schema Prisma:
  - `Tenant`, `Perfil`, `Producto`, `Venta`, `ItemVenta`, `Caja`, `Gasto`
  - Enums: `EstadoCaja`, `MetodoPago`, `EstadoVenta`

**Resultado:** podemos hacer requests al backend con auth, pero todavía no hay features conectadas.

---

## Fase 1 — Auth (login + onboarding + protección de rutas)

**Objetivo:** que un usuario real pueda registrarse, loguearse y que su sesión persista.

### Tareas

**1. `lib/store/authStore.ts`** con Zustand + middleware `persist`:
- Estado: `token`, `perfil`, `isAuthenticated`
- Acciones: `setAuth(token, perfil)`, `logout()`
- Persistencia en `localStorage`

**2. `lib/api/auth.ts`:**
- `register(data)` → POST `/auth/register`
- `login(email, password)` → POST `/auth/login`

**3. `lib/hooks/useAuth.ts`:** wrapper que expone `login()`, `register()`, `logout()` con `loading` y `error`.

**4. Conectar `/login`:**
- Reemplazar submit mock por `login()` real
- Mostrar error inline si falla
- Redirect a `/dashboard` si OK

**5. Conectar `/onboarding`:**
- En el paso 4 (Confirmar), llamar a `register()` con todo el payload acumulado
- El register crea tenant + perfil básico; después un PUT `/perfil` guarda el resto (dirección, horarios)
- **Nota:** el backend actualmente no tiene modelo de horarios — los dejamos como "pendiente de backend" por ahora
- Guardar JWT y redirect a pantalla de éxito

**6. Middleware de protección:**
- Crear `middleware.ts` en la raíz de Next que verifique el token en cookies para rutas del grupo `(app)`
- **Detalle importante:** como Zustand persiste en `localStorage` y el middleware de Next corre en el edge (no ve localStorage), hay dos opciones:
  - **A)** Guardar el token también en cookie (recomendado)
  - **B)** Hacer la protección client-side con un componente `<AuthGuard>` que redirija si no hay token
- Propuesta: **A** (más seguro y estándar)

**7. Conectar el Sidebar:**
- Leer `perfil.nombreNegocio` del store en lugar del hardcodeo "Mi Negocio"
- Agregar botón de logout

**Resultado:** el sistema tiene sesiones reales. Las fases siguientes asumen que hay un usuario autenticado.

---

## Fase 2 — Productos

**Objetivo:** que `/productos` muestre y modifique datos reales.

### Tareas

**1. `lib/api/productos.ts`:**
`getProductos`, `getProducto`, `createProducto`, `updateProducto`, `deleteProducto`.

**2. `lib/store/productosStore.ts`:**
- Estado: `productos`, `loading`, `error`, `filtros`
- Acciones: `fetch()`, `create()`, `update()`, `remove()`, `setFiltros()`
- **Nota:** acá sí usamos store (no solo hook local) porque el POS también va a necesitar la lista de productos. Evitamos doble fetch.

**3. `lib/hooks/useProductos.ts`:** wrapper sobre el store para componentes.

**4. Conectar `/productos`:**
- Reemplazar array mock por `useProductos()`
- Loading state (skeleton en la tabla)
- Empty state si no hay productos
- Error state con retry
- Slide panel → conectar submit a `create()` / `update()`
- Precio inline editable → `update()` optimista
- Bulk actions → iterar calls (el back no tiene endpoint bulk, lo hacemos client-side)
- Bulk de ajuste de precio: múltiples PUT en paralelo con `Promise.all`

**5. Upload de imagen:** el backend acepta URL, no archivo. Por ahora dejamos un input de URL. **Marcar como limitación conocida.**

**Resultado:** catálogo completamente funcional con persistencia real.

---

## Fase 3 — Caja

**Objetivo:** que el sistema sepa si hay caja abierta, y permita abrirla/cerrarla.

### Tareas

**1. `lib/api/caja.ts`:**
`getCajaActiva`, `abrirCaja`, `cerrarCaja`, `getGastos`, `createGasto`.

**2. `lib/store/cajaStore.ts`:**
- Estado: `cajaActiva`, `loading`
- Acciones: `fetchActiva()`, `abrir(montoInicial)`, `cerrar(montoCierre, notas)`
- **Se carga al montar el layout `(app)`** para que esté disponible en todas las páginas

**3. Integrar en layout `(app)`:**
- Al montar, llamar a `fetchActiva()`
- Esto hace que el pill "Caja abierta" del dashboard y los guards del POS sean reales

**4. Dashboard header:** el pill de caja ahora refleja el estado real.

**5. POS guard:** si no hay caja abierta → modal "Abrí la caja primero" con input de monto inicial.

**Resultado:** el ciclo de vida de la caja funciona. El POS ya puede asumir que hay caja abierta cuando se accede.

---

## Fase 4 — POS (crear venta)

**Objetivo:** que `/caja` genere ventas reales en el backend.

### Tareas

**1. `lib/api/ventas.ts`** (parcial): `createVenta(payload)`.

**2. Búsqueda de productos en el POS:**
- Usar el `productosStore` ya cargado en Fase 2
- El autocomplete filtra del store local (no hace request por cada tecla)

**3. Conectar botón "Cobrar":**
- Payload: `{ items: [{ productoId, cantidad, precioUnitario }], descuento, metodoPago, cajaId }`
- Manejar errores específicos:
  - Stock insuficiente → toast con nombre del producto
  - Caja cerrada → redirect a abrir caja
  - Producto inactivo → toast
- Después del éxito: refrescar `productosStore` (los stocks cambiaron) y mostrar modal de éxito con el número de venta real del backend

**4. Carrito:** `useState` local en la página. No va al store global porque no lo usa nadie más.

**Resultado:** el corazón del sistema funciona. A partir de acá, lo demás es mostrar datos.

---

## Fase 5 — Historial de ventas

**Objetivo:** que `/ventas` muestre el historial real con filtros y detalle.

### Tareas

**1. `lib/api/ventas.ts`** (completar): `getVentas(filtros)`, `getVenta(id)`, `anularVenta(id)`.

**2. Hook local `useVentas(filtros)`:** no va a store porque es data de una sola página. Lista + paginación.

**3. Conectar `/ventas`:**
- Tabla con datos reales
- Filtros funcionando (periodo, método, estado, cajero — el último requiere saber si el backend expone users; si no, lo ocultamos)
- Paginación real (el back ya soporta `page` y `limit`)
- Drawer de detalle → `getVenta(id)` al abrir
- Acción "Anular" → `anularVenta(id)` con confirmación

**4. KPIs y widgets laterales** (sparklines, breakdown de pagos, top productos, heatmap):
- **Problema:** el backend no tiene endpoints de agregación todavía
- **Solución temporal:** calcular client-side a partir del listado paginado. No es ideal si hay muchas ventas, pero funciona para el MVP
- **Solución real (Fase 8):** crear endpoints de reportes

**Resultado:** historial operativo. KPIs parcialmente mock hasta Fase 8.

---

## Fase 6 — Cierre de caja

**Objetivo:** que `/cierre-caja` muestre el resumen real del día y permita cerrar la caja.

### Tareas

**1. Obtener datos del día:** listar ventas filtradas por `cajaId = cajaActiva.id`.

**2. Calcular client-side** (hasta tener endpoint de reportes):
- Total facturado, cantidad, ticket promedio
- Breakdown por método de pago
- Top 5 productos del día

**3. Comparativo semanal:** deferir a Fase 8 (requiere endpoint histórico). Por ahora dejar mock con nota "próximamente".

**4. Conteo de efectivo:** ya es UI pura, solo calcula diferencia.

**5. Botón "Cerrar caja":**
- Llamar a `cajaStore.cerrar(montoContado, observaciones)`
- Modal de confirmación con resumen
- Después del cierre: redirect a dashboard

**Resultado:** ciclo diario completo (abrir → vender → cerrar).

---

## Fase 7 — Dashboard

**Objetivo:** reemplazar los mocks del dashboard con datos reales.

### Tareas

**1. Datos del día:** reutilizar la lógica de Fase 6 (ventas filtradas por caja activa).

**2. KPIs, gráfico de barras por hora, top productos:** calcular client-side.

**3. Deltas vs. ayer:** requiere comparar con ayer. **Dos opciones:**
- Client-side: traer ventas de ayer también (doble request)
- Server-side: endpoint de reportes (Fase 8)
- **Propuesta MVP:** client-side con un query que filtre por rango de fechas

**4. Alertas:** stock bajo/crítico se puede calcular desde `productosStore` sin pedir nada al back.

**Resultado:** dashboard operativo. Performance aceptable para un MVP.

---

## Fase 8 — Endpoints de reportes (backend)

**Objetivo:** cerrar la deuda técnica de calcular KPIs client-side.

### Tareas del backend

1. `GET /reportes/dashboard?fecha=YYYY-MM-DD` → totales del día, ventas por hora, top productos, deltas vs. ayer
2. `GET /reportes/cierre-caja/:cajaId` → resumen completo para cierre
3. `GET /reportes/comparativo-semanal` → barras de los últimos 7 días
4. `GET /reportes/ventas-agregadas?desde=X&hasta=Y&agrupar=hora|dia|metodo` → para el heatmap y breakdowns de `/ventas`

### Tareas del frontend

Reemplazar cálculos client-side por estos endpoints.

**Resultado:** sistema optimizado. Se puede escalar a miles de ventas sin problema de performance en el front.

---

## Resumen de entregables por fase

| Fase | Tiempo estimado | Entregable usable |
|---|---|---|
| 0 — Setup | 1 día | Infra lista (nada visible) |
| 1 — Auth | 2-3 días | Login y onboarding reales |
| 2 — Productos | 2 días | Catálogo real |
| 3 — Caja | 1 día | Apertura/cierre funcional |
| 4 — POS | 2-3 días | **MVP vendible** ← hito clave |
| 5 — Ventas | 2 días | Historial real |
| 6 — Cierre | 1 día | Ciclo diario completo |
| 7 — Dashboard | 1-2 días | Panel real |
| 8 — Reportes | 2-3 días (back+front) | Versión optimizada |

**Después de la Fase 4 ya tenés un producto que podés mostrar y usar.** Las fases 5–7 son "completar el resto", y la 8 es optimización.

---

## Decisiones pendientes de confirmar

1. **Middleware de protección:** ¿cookie (A) o client-side guard (B)? Recomendación: A.
2. **Onboarding:** los horarios del paso 3 no tienen modelo en el back. ¿Los guardamos como JSON en un campo nuevo, los ignoramos por ahora, o agregamos modelo?
3. **Upload de imágenes:** ¿dejamos input de URL hasta tener storage (S3/Supabase Storage), o lo implementamos ahora?
4. **Reportes:** ¿preferís hacer las Fases 5–7 con cálculo client-side y después optimizar, o implementar los endpoints de la Fase 8 primero?

---

## Stack de integración

- **Estado global:** Zustand (con middleware `persist` para auth)
- **Data fetching:** hooks custom con `useState`/`useEffect`
- **HTTP:** `fetch` nativo wrapeado en `client.ts`
- **Tipos:** TypeScript espejando el schema Prisma del backend
- **Auth:** JWT en `localStorage` (vía Zustand persist) + cookie para middleware de Next
