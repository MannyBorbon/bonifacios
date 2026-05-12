# Requerimientos nuevos — Admin mapa de mesas, layout global y reuniones

**Proyecto:** Bonifacio’s — sitio / panel admin  
**Documento:** requerimientos acordados o implementados en iteraciones recientes (mapa de reservas, persistencia de layout, sala de reuniones).  
**Audiencia:** producto, diseño UX/UI, desarrollo.

---

## 1. Objetivo general

Mejorar la operación diaria en **admin/reservas** (mapa de mesas, edición de plano, leyenda POS/reservas) y en **admin/meetings** (videollamada Jitsi + chat de equipo), con comportamiento estable, accesible y alineado a patrones de mapas conocidos (p. ej. Google Maps: panel colapsable, ayuda contextual).

---

## 2. Mapa de mesas — layout y edición (`ReservationFloorPlan`)

### 2.1 Escala y selección de mesas

| ID | Requerimiento | Prioridad | Estado |
|----|----------------|-----------|--------|
| M-01 | El control **Escala mesa** debe aplicar a la **mesa en foco** (selección principal) cuando no hay multiselección con Mayús, además de aplicar a la multiselección. | Alta | Implementado |
| M-02 | **Centrar en zona**, **Ocultar del mapa** y **Separar selección** deben usar la misma lógica de “objetivo” que la escala (foco o multiselección). | Alta | Implementado |
| M-03 | Indicación en UI de qué códigos son el **objetivo** de herramientas (foco / multiselección). | Media | Implementado |

### 2.2 Persistencia layout global (BD)

| ID | Requerimiento | Prioridad | Estado |
|----|----------------|-----------|--------|
| L-01 | Al guardar layout masivo no debe producirse error **`Duplicate entry … uq_rfl_code`**: actualizar fila existente por **código** cuando ya existe en `reservation_floor_layout_items`. | Alta | Implementado (`layout-bulk-save.php`) |
| L-02 | El payload de guardado no debe incluir **dos filas con el mismo código** (p. ej. catálogo + custom duplicado por mayúsculas); priorizar catálogo. | Alta | Implementado |
| L-03 | Al cargar desde API, reconocer códigos del catálogo con **normalización mayúsculas** para no duplicar entradas custom vs catálogo. | Media | Implementado |

### 2.3 Controles estilo mapa (UX/UI)

| ID | Requerimiento | Prioridad | Estado |
|----|----------------|-----------|--------|
| U-01 | **Barra de herramientas del plano** colapsable con cabecera clara y **doble chevron** (ocultar / mostrar), liberando espacio para el mapa. | Alta | Implementado |
| U-02 | Recordar preferencia **barra colapsada o expandida** entre sesiones (`localStorage`). | Media | Implementado |
| U-03 | **Carril flotante** sobre el mapa (icono ayuda + acceso rápido a mostrar/ocultar barra), posicionamiento que no tape en móvil los controles de **zoom del lienzo** (− / +). | Alta | Implementado |
| U-04 | Panel **“Qué puedes hacer”** con pasos numerados, variación según modo (solo lectura vs edición) y cierre por **Cerrar**, clic fuera y **Escape**; atributos ARIA básicos. | Alta | Implementado |
| U-05 | Texto de ayuda que distingue **zoom del mapa en móvil** (lienzo) de acciones sobre mesas/cámara. | Media | Implementado |

### 2.4 Criterios de aceptación (mapa)

- Con edición activa, cambiar escala con una sola mesa en foco (sin Mayús) persiste y se refleja al recargar.
- Tras varios guardados consecutivos del mismo layout no aparece error de clave única por código.
- Con la barra colapsada, el usuario puede volver a expandir desde la banda superior o desde el carril del mapa.
- El panel de ayuda no desplaza toda la página al abrirse; se cierra de forma predecible.

---

## 3. Reuniones — sala y videollamada WebRTC nativa (`MeetingRoom`)

> **Mayo 2026:** el módulo de videollamada migró de Jitsi embed a **WebRTC nativo** (`src/pages/admin/GroupCallWebRTC.jsx`). Los requisitos J-01..J-03 quedan supersedidos.

### 3.1 Chat y scroll

| ID | Requerimiento | Prioridad | Estado |
|----|----------------|-----------|--------|
| R-01 | El auto-scroll del **chat del equipo** no debe usar `scrollIntoView` de un ancla que provoque **scroll de toda la ventana** en bucle al hacer polling de mensajes. | Alta | Implementado |
| R-02 | Solo desplazar el **contenedor scrollable** del chat; si el usuario subió a leer historial, no forzar bajada salvo esté cerca del final o sea primera carga coherente. | Alta | Implementado |
| R-03 | Evitar `setState` de mensajes si la respuesta del API es **idéntica** a la lista actual (menos re-renders). | Media | Implementado |

### 3.2 Videollamada WebRTC nativa

| ID | Requerimiento | Prioridad | Estado |
|----|----------------|-----------|--------|
| W-01 | Componente `GroupCallWebRTC.jsx`: peer connections vía `RTCPeerConnection`, señalización HTTP polling (`api/meetings/webrtc.php`), TURN via Metered.ca (`api/meetings/ice-servers.php`). | Alta | Implementado |
| W-02 | Layout mobile-first: controles (MIC / CAM / Salir) como bloque fijo bajo el video, nunca superpuestos. Grid `grid-cols-1` en mobile, `grid-cols-2` en sm+. | Alta | Implementado |
| W-03 | PiP local en esquina superior-derecha cuando hay participantes remotos; altura del video area con `clamp()` para no desbordar en móvil. | Media | Implementado |
| W-04 | Señalización: tabla `meeting_webrtc_signals` creada automáticamente en primer request. Credenciales TURN nunca expuestas al frontend. | Alta | Implementado |

### 3.3 Criterios de aceptación (reuniones)

- En pestaña "Sala en vivo", subir y bajar scroll de la página no "pelea" con el polling del chat.
- La videollamada WebRTC inicia sin recargar la página; el PiP y los controles no se superponen.
- Con 2+ participantes en dispositivos distintos, cada tile muestra la cámara del participante correspondiente.

### 3.4 Referencias de código WebRTC

| Archivo | Rol |
|---|---|
| `src/pages/admin/GroupCallWebRTC.jsx` | Componente React — UI y peer connections |
| `src/pages/admin/MeetingRoom.jsx` | Orquestador — monta `GroupCallWebRTC` |
| `api/meetings/webrtc.php` | Señalización (poll / send / cleanup) |
| `api/meetings/ice-servers.php` | Proxy TURN — obtiene credenciales Metered.ca server-side |
| `api/config/turn.php` | Constantes `METERED_API_KEY` y `METERED_DOMAIN` |

---

## 4. Fuera de alcance (explícito)

- Jitsi self-hosted o iframe externo: reemplazado por WebRTC nativo, no volver salvo decisión explícita.
- Rediseño completo del mapa público de reservas (no cubierto aquí salvo que se añada otro bloque).

---

## 5. Referencias de código

| Área | Ruta principal |
|------|----------------|
| Mapa / toolbar / ayuda | `src/components/ReservationFloorPlan.jsx` |
| Página reservas | `src/pages/admin/Reservations.jsx` |
| Guardado layout BD | `api/reservations/layout-bulk-save.php`, `api/reservations/layout-lib.php` |
| Reunión / WebRTC / chat | `src/pages/admin/MeetingRoom.jsx`, `src/pages/admin/GroupCallWebRTC.jsx` |

---

## 6. Próximos pasos sugeridos (backlog)

1. Prueba manual checklist: mapa (3 zonas), colapsar barra, ayuda, escala con foco, guardado repetido sin error SQL.
2. Prueba reunión: abrir sala, chat, scroll, videollamada 2 minutos sin recargas inesperadas.
3. Si se desea screen share nativo en WebRTC: agregar `getDisplayMedia()` a `GroupCallWebRTC.jsx`.

---

*Última actualización del documento: mayo 2026.*
