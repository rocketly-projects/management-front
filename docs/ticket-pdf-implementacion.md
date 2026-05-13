# Ticket PDF — Implementación y features futuras

> Documentación de la feature `ticket-pdf`. Leer antes de extender la funcionalidad de compartir tickets.
>
> Implementado: mayo 2026.

---

## 1. Qué está implementado

### Generación de PDF (`lib/utils/ticket-pdf.ts`)

- `generarTicketPdf(data)` — genera un `jsPDF` con el ticket en formato 80mm (receipt style).
- `descargarTicketPdf(data)` — genera y dispara descarga directa como `ticket-XXXX.pdf`.
- `compartirTicketPdf(data)` — intenta usar la Web Share API con el archivo PDF adjunto. Devuelve `true` si el navegador soportó el share, `false` si no.
- `whatsappTicketUrl(data)` — genera URL `https://wa.me/?text=...` con el detalle del ticket en texto plano (WhatsApp Web o app).
- `mailtoTicketUrl(data)` — genera URL `mailto:?subject=...&body=...` que abre el cliente de email local.

### UI en el `TicketModal` (`app/(app)/caja/page.tsx`)

Tres botones siempre visibles entre la previsualización y la sección de impresora:
- **PDF** → descarga el archivo.
- **WhatsApp** → abre WhatsApp Web / app con el texto del ticket.
- **Email** → abre el cliente de email local con asunto y cuerpo pre-cargados.

### Limitación conocida: acentos en el PDF

`jsPDF` con las fuentes built-in (Courier) solo soporta Latin-1 de forma confiable. Los nombres de productos o del negocio con acentos (á, é, ñ) se normalizan automáticamente en el PDF (ej: "Jabón" → "Jabon"). El texto de WhatsApp y email sí mantiene los acentos.

**Solución futura:** embeber una fuente TTF (ej: Roboto Mono) en jsPDF mediante `doc.addFont()`. Agrega ~50KB al bundle. No es urgente para el MVP.

---

## 2. Feature futura: captura de contacto post-venta

### Qué haría

Al hacer click en WhatsApp o Email en el TicketModal, mostrar un modal chico opcional:
"¿Querés que guardemos este contacto para próximas compras?" con un campo de teléfono o email.

- Si el operador completa el campo y confirma:
  - Si la venta ya tiene `clienteId`: `PATCH /clientes/:id` con el teléfono/email nuevo.
  - Si la venta no tiene `clienteId`: `POST /clientes` con el dato ingresado + `PATCH /ventas/:id` para vincular el clienteId (ver más abajo).
- Si el operador cierra el modal: no pasa nada, el share igual se ejecuta.

### Endpoints disponibles (ya existen en el back)

- `POST /clientes` — crea cliente. Solo `nombre` obligatorio. Acepta `telefono` y `email`.
- `PATCH /clientes/:id` — actualiza cliente parcialmente.

### Lo que falta en el back

No existe `PATCH /ventas/:id` para actualizar `clienteId` de una venta ya creada. Habría que agregarlo cuando se implemente esta feature.

### Branch sugerido

`feature/captura-contacto-ticket`

### Nota de diseño

Mantener el modal de captura totalmente opcional y no bloqueante — el share no debe esperar la captura. Ejecutar el share primero, mostrar el modal de captura en paralelo.

---

## 3. Opciones de mejora para compartir — comparativa

### WhatsApp

| Opción | Cómo | PDF adjunto | Costo | Complejidad |
|--------|------|-------------|-------|-------------|
| `wa.me/?text=` (actual) | Link directo, abre WA Web/app | No — texto plano | Gratis | Cero |
| Web Share API | `navigator.share({ files: [pdf] })` | Sí — en móvil Chrome/Safari | Gratis | Baja — ya implementado en `compartirTicketPdf()` |
| WhatsApp Business API | Webhook + token | Sí — envía al número del cliente | USD 0.06-0.08 / mensaje | Alta — requiere cuenta Business aprobada, backend, número de WhatsApp dedicado |

**Recomendación actual:** `wa.me/?text=` para desktop (suficiente para el kiosco). La Web Share API ya está implementada como fallback y funciona en móvil.

**Cuándo escalar a WhatsApp Business API:** cuando el tenant quiera enviar tickets automáticamente al número del cliente sin intervención del operador. Requiere que el cliente tenga número guardado en `Cliente.telefono`.

### Email

| Opción | Cómo | PDF adjunto | Costo | Complejidad |
|--------|------|-------------|-------|-------------|
| `mailto:` (actual) | Abre cliente de email local | No directo — el usuario adjunta el PDF descargado | Gratis | Cero |
| Resend | API REST, envía desde servidor | Sí — adjunto base64 | USD 0 hasta 3.000 mails/mes, luego USD 20/mes | Media — requiere endpoint en el back, API key, dominio verificado |
| SendGrid / Postmark | Similar a Resend | Sí | Varía | Media |

**Recomendación actual:** `mailto:` para MVP. El operador descarga el PDF y lo adjunta manualmente si lo necesita.

**Cuándo escalar a Resend:** cuando el tenant quiera enviar el ticket automáticamente al email del cliente sin abrir el cliente de correo. Recomendado si se implementa la captura de contacto.

---

## 4. Limitación: `mailto:` en Windows sin cliente de email configurado

Si el equipo no tiene un cliente de email configurado (Gmail, Outlook, etc.), el link `mailto:` no abre nada. En ese caso, el operador puede:
1. Descargar el PDF y enviarlo manualmente.
2. Usar el link de WhatsApp.

Esta es la realidad de muchos kioscos. No requiere acción técnica — es una aclaración para el onboarding del cliente.

---

## 5. Checklist de esta feature

- [x] `lib/utils/ticket-pdf.ts` — funciones de generación y compartir.
- [x] Botones PDF / WhatsApp / Email en `TicketModal`.
- [x] Iconos `IconDownload`, `IconWhatsApp`, `IconMail`.
- [x] `tsc --noEmit` sin errores.
- [ ] Test físico: descargar PDF desde el modal y verificar que el contenido es correcto.
- [ ] Test WhatsApp: verificar que el texto se pre-carga correctamente en WhatsApp Web.
- [ ] Test email: verificar que `mailto:` abre con asunto y cuerpo pre-cargados.
- [ ] Test con nombres de productos con acentos (verificar normalización en PDF).

### Features futuras (en orden de prioridad)

1. **`feature/captura-contacto-ticket`** — modal opcional al compartir para guardar teléfono/email del cliente. Ver sección 2.
2. **`feature/historial-tickets-cliente`** — vista `/clientes/[id]` con historial y reenvío de tickets.
3. **Fuentes con acentos en PDF** — embeber Roboto Mono en jsPDF para soporte completo de ñ y acentos.
4. **Email transaccional (Resend)** — envío automático del PDF al email del cliente. Ver sección 3.
5. **WhatsApp Business API** — envío automático al teléfono del cliente. Ver sección 3.
