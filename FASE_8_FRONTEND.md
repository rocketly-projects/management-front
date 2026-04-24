# Fase 8 — Frontend (Integración de endpoints de reportes)

> Proyecto: Rocketly POS
> Fecha: 2026-04-24

---

## Objetivo

Reemplazar todos los cálculos client-side hechos en las Fases 5–7 por llamadas a los endpoints de reportes del backend. Eliminar lógica de agregación del frontend.

---

## Precondición

Los endpoints del backend deben estar implementados (ver `FASE_8_BACKEND.md`). Se recomienda integrar de a un endpoint end-to-end.

---

## 1. Tipos (`lib/types/index.ts`)

Agregar los siguientes tipos:

- `DashboardReporte`
- `CierreCajaReporte`
- `ComparativoSemanal`
- `VentasAgregadas` (union type según `agrupar`)

Los tipos deben espejar exactamente las responses del backend. Si el back cambia el contrato, el tipo se actualiza y TypeScript nos avisa dónde hay que tocar.

---

## 2. `lib/api/reportes.ts`

```ts
export const getDashboardReporte = (fecha?: string) => ...
export const getCierreCajaReporte = (cajaId: string) => ...
export const getComparativoSemanal = (fechaFin?: string) => ...
export const getVentasAgregadas = (params: {
  desde: string
  hasta: string
  agrupar: 'hora' | 'dia' | 'metodo'
  estado?: EstadoVenta
}) => ...
```

Todas usan `apiFetch` del `client.ts` base.

---

## 3. Hooks

**Decisión:** hooks locales, no store.

Los reportes son datos de lectura específicos de cada página, no se comparten entre vistas. Usar hooks locales mantiene la simetría con el resto del proyecto.

Hooks a crear:

- `useDashboardReporte(fecha)`
- `useCierreCajaReporte(cajaId)`
- `useVentasAgregadas(params)` — con key derivada de params para evitar re-fetch innecesarios

Cada hook expone `{ data, loading, error, refetch }`.

---

## 4. Conectar `/dashboard`

### Cambios

- Reemplazar todos los cálculos client-side por `useDashboardReporte()`
- Los deltas ahora vienen del backend (eliminar la lógica de comparar con ayer hecha en el front)
- Loading skeleton mientras carga
- Manejar `deltaVsAyer: null` → mostrar "—" en lugar de "+0%"
- El gráfico de barras por hora ahora usa `ventasPorHora` del response
- Top productos viene listo del response

### Código a eliminar

- Funciones utilitarias de cálculo de KPIs del día
- Lógica de comparación con ayer
- Agrupación de ventas por hora hecha en JS

---

## 5. Conectar `/cierre-caja`

### Cambios

- Reemplazar cálculos por `useCierreCajaReporte(cajaActiva.id)`
- El gráfico comparativo semanal (que estaba mock) ahora usa `comparativoSemanal` del response, incluida la línea de promedio
- Los 4 KPIs, breakdown de pagos y top productos todos del mismo response — un solo fetch
- Input de conteo de efectivo sigue siendo UI pura

### Código a eliminar

- Cálculo de totales del día client-side
- Breakdown de métodos de pago calculado en JS
- Top productos calculado en JS
- Mock del comparativo semanal

---

## 6. Conectar `/ventas`

Múltiples reportes según el widget:

- **KPI sparklines** → `getVentasAgregadas({ agrupar: 'dia', desde: hace7dias, hasta: hoy })`
- **Breakdown de métodos de pago** → `getVentasAgregadas({ agrupar: 'metodo', desde, hasta })` con el rango del filtro de periodo
- **Heatmap ventas por hora** → `getVentasAgregadas({ agrupar: 'hora', desde, hasta })`
- **Top productos del panel lateral** → puede reusar `getDashboardReporte` si es del día, o agregar un endpoint específico si el rango varía

### Código a eliminar

- Funciones de agregación que iteraban sobre el listado paginado
- Workarounds para "simular" sparklines con data incompleta

---

## 7. Cleanup

- Borrar las funciones de cálculo client-side que quedaron de las fases 5–7
- Revisar que no haya doble fetch (la misma data pedida desde dos lados)
- Agregar cache simple en los hooks si una misma query se repite (ej: navegar entre páginas y volver al dashboard)

---

## 8. Loading y error states

- Cada página con reporte necesita skeleton específico (las KPI cards ya tienen estructura, solo "vacíarlas" con placeholders)
- Error state con botón de reintentar
- Empty state si el tenant es nuevo y no tiene ventas aún

---

## Orden de implementación sugerido

Integrar de a un endpoint end-to-end con el backend:

1. `/dashboard` ↔ `GET /reportes/dashboard`
2. `/cierre-caja` ↔ `GET /reportes/cierre-caja/:cajaId`
3. Widgets de `/ventas` ↔ `GET /reportes/ventas-agregadas`
4. Refactor interno (comparativo-semanal)

Por cada fase:

1. Tipo + función en `lib/api/reportes.ts`
2. Hook correspondiente
3. Conectar la vista
4. Verificar visualmente que todo cuadra
5. Borrar el código client-side viejo

---

## Checklist de implementación

- [ ] Tipos agregados en `lib/types/index.ts`
- [ ] `lib/api/reportes.ts` con las 4 funciones
- [ ] `useDashboardReporte` + integración en `/dashboard`
- [ ] `useCierreCajaReporte` + integración en `/cierre-caja`
- [ ] `useVentasAgregadas` + integración en widgets de `/ventas`
- [ ] Skeleton/loading states en las 3 páginas
- [ ] Error states con retry
- [ ] Código client-side viejo eliminado
- [ ] Verificar que no hay doble fetch

---

## Resultado esperado

Sistema optimizado. El frontend ya no calcula agregaciones — solo presenta datos. Se puede escalar a miles de ventas sin problemas de performance en el front.
