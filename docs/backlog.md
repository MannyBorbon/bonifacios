# Backlog — bonifacios website

## Sprint actual (Fase 6)

### Bloqueado (pendiente definición banco / depósitos)

- [ ] EVT-COT-002 y EVT-COT-003 permanecen en pausa hasta elegir banco y flujo de anticipos.

---

- [x] EVT-COT-001: Implementar cotizador de eventos con carrusel y suma en tiempo real.
  - Done: vista `src/pages/EventQuote.jsx` operativa con catálogo por categorías, carrito y total en tiempo real.
  - Done: validaciones mínimas de formulario y estados de error para catálogo/contacto.
  - Done: acceso visible desde home a `/cotizador`.

- [x] EVT-COT-002: Integrar persistencia de cotización pública con folio inicial.
  - Done: `api/quotes/public-submit.php` (POST público) inserta `event_quotes` + `quote_cotizaciones` (JSON ítems/contacto), valida total vs líneas, devuelve `folio` `EVT-000NNN` y `quote_id`.
  - Done: `EventQuote.jsx` guarda antes de abrir WhatsApp; muestra folio en pantalla y lo incluye en el mensaje.

- [ ] EVT-COT-003: Conectar primer pago y generación de contrato digital ligado al folio.
  - Criterio de done: al registrar anticipo inicial se genera contrato y queda trazabilidad en admin.

- [x] EVT-A11Y-COT-001: Accesibilidad y robustez UX del cotizador público (`EventQuote.jsx`) sin cambiar flujo de negocio.
  - Landmarks, `aria-*` en carrito/carrusel, anuncio de errores, etiquetas en controles, `motion-safe` donde aplica.
