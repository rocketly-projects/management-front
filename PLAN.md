# Plan de implementación — Rocketly POS

## Sistema de diseño

- **Sidebar**: navy oscuro `#1a1f2e`, acento azul `#4f6ef7`
- **Fondo principal**: `#f7f8fb`
- **Cards**: blancas, borde `#e5e7eb`, border-radius 12px
- **Tipografía**: Inter + JetBrains Mono
- **Texto muted**: `#8892b0`
- **Stack**: Next.js 16 (App Router), React 19, Tailwind v4, TypeScript

---

## Páginas a implementar

| Archivo de referencia | Ruta Next.js |
|---|---|
| `login.html` | `/login` |
| `onboarding.html` | `/onboarding` |
| `dashboard.html` | `/` |
| `productos.html` | `/productos` |
| `ventas.html` | `/ventas` |
| `caja.html` | `/caja` |
| `cierre-caja.html` | `/cierre-caja` |

> **MVP**: CRM Leads excluido del scope.

---

## Estructura de carpetas

```
app/
├── globals.css                  ← tokens del design system
├── layout.tsx                   ← root layout (fuentes, html/body)
├── (auth)/
│   ├── login/page.tsx
│   └── onboarding/page.tsx
├── (dashboard)/
│   ├── layout.tsx               ← layout con sidebar compartido
│   ├── page.tsx                 ← dashboard
│   ├── productos/page.tsx
│   ├── ventas/page.tsx
│   ├── caja/page.tsx
│   └── cierre-caja/page.tsx
└── components/
    ├── Sidebar.tsx
    └── TopBar.tsx
```

---

## Pasos

- [x] **Paso 1** — Actualizar `globals.css` con los design tokens (colores, fuentes Inter)
- [x] **Paso 2** — Componente `Sidebar` (dark navy, nav items, brand "R Rocketly POS")
- [x] **Paso 3** — Componente `TopBar` (título, subtítulo, botones de acción)
- [x] **Paso 4** — Layout raíz + Layout de dashboard (con sidebar)
- [x] **Paso 5** — Página `Login` (panel dividido dark/light)
- [x] **Paso 6** — Página `Onboarding`
- [x] **Paso 7** — Página `Dashboard` (KPIs, actividad reciente)
- [x] **Paso 8** — Página `Productos` (tabla + filtros)
- [x] **Paso 9** — Página `Ventas` (historial + KPIs)
- [x] **Paso 10** — Página `Caja` (POS register)
- [ ] **Paso 11** — Página `Cierre de Caja`

---

## Archivos de referencia

Los HTMLs originales del diseño están en:
`C:/Users/USER/.claude/projects/C--workspacePersonal-gestion-system-base/ae983ada-5c29-4d7d-95ea-ec331f129fdf/tool-results/design_extracted/sistema-de-gestion/project/_ref/`
