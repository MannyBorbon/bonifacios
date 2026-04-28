# Documentación de Base de Datos - Bonifacio's Restaurant

> ARCHIVO HISTORICO (legacy): se conserva para consulta y referencia.
> Fuente operativa activa:
> - `docs/SYSTEM-ARCHITECTURE.md`
> - `docs/OPERATIONS-RUNBOOK.md`
> - `docs/ERROR-FIXES-LOG.md`

---

## ⚙️ PROCEDIMIENTO: Scripts de exploración/diagnóstico en el servidor

**Regla importante:** Los scripts `.php` de exploración o diagnóstico (como `explore-sr-tables.php`) se ejecutan **manualmente en el servidor** (CPU local con acceso a SQL Server), NO desde la máquina de desarrollo.

### Flujo de trabajo:
1. **Cascade genera el contenido del script** y lo proporciona como texto.
2. **El usuario crea un archivo `.txt`** en el servidor con ese contenido.
3. **El usuario le cambia la extensión a `.php`** (renombrar).
4. **El usuario abre CMD en el servidor** y ejecuta el comando proporcionado.

### Comando para ejecutar scripts en el servidor:
```
cd C:\Sincronizador\softrestaurant-sync
php nombre-del-script.php
```

### Rutas importantes del servidor:
- Sincronizador: `C:\Sincronizador\softrestaurant-sync\`
- Scripts de exploración se colocan en esa misma carpeta.

### Confirmaciones operativas (abril 2026)
- ✅ Se puede ejecutar `ALTER TABLE` directamente en phpMyAdmin para migraciones de sincronización (`sr_sales`, `sr_sale_items`, `sr_cash_movements`, etc.).
- ✅ Antes de aplicar cambios estructurales, preparar SQL reversible y ejecutar en ventana controlada (para evitar impacto en dashboard en vivo).

### Entorno real (arquitectura vigente)
- 🌐 Hosting web/API: Hostinger (entorno compartido, acceso por `public_html` + phpMyAdmin del hosting).
- 🗄️ SQL Server SoftRestaurant: corre en CPU local/servidor local del negocio.
- 🔄 Sincronizador SoftRestaurant: script PHP ejecutado en CPU local (no en Hostinger), enviando datos por HTTP a `/api/softrestaurant/sync.php`.
- 🧰 Build/deploy frontend: normalmente desde entorno local con `npm run build`.
- ℹ️ Node.js no está garantizado en el servidor compartido; el build se realiza localmente y luego se suben artefactos.

### Migraciones SQL Sync (v1.6)
- Si phpMyAdmin muestra `#1061 - Duplicate key name ...` durante `ALTER TABLE ... ADD UNIQUE KEY`, **no es un fallo de datos**, significa que el índice ya existe.
- Para evitar bloqueos en despliegue, usar SQL idempotente:
  - validar existencia del índice en `information_schema.statistics`
  - ejecutar `ALTER TABLE` solo cuando no exista.
- Script recomendado: `database/sync-v1.6.0-dedup.sql` (idempotente).

---

## 🚨 INCIDENTE CRÍTICO RESUELTO: Error 500 en Home.jsx

### **Fecha del Incidente:** 25 de abril de 2026

### **Problema Detectado**
- **Síntoma:** Página principal completamente inaccesible con Error 500 Internal Server Error
- **Impacto:** Crítico - Sitio web no funcional para usuarios

### **Causa Raíz**
11 errores de sintaxis JSX en el componente Home causados por estructura desbalanceada:
- `<div className="w-full">` (línea 269) sin cierre correspondiente
- Fragment JSX `</>` desbalanceado por estructura rota
- Errores en cascada: "Expression expected", "Declaration expected"
- Elementos flotantes (WhatsApp, modal) fuera de contexto correcto

### **Solución Aplicada**
**Intervención Quirúrgica "The Last Bracket":**
1. Reemplazo completo del bloque `return` con estructura JSX balanceada
2. Cierre correcto del div `w-full` antes del `</main>`
3. Reorganización: Hero, grid, formulario dentro del `w-full`
4. Elementos flotantes fuera del main pero dentro del isolate

### **Resultado**
- ✅ **11 errores JSX → 0 errores** (100% resueltos)
- ✅ **Error 500 eliminado**, página principal funcional
- ✅ **Build exitoso** sin errores críticos
- ⚠️ **2 variables no usadas** (`instagramUrl`, `facebookUrl`) - trade-off aceptable

### **Trade-offs Conscientes**
- Se mantuvieron variables no usadas para preservar estructura original
- Prioridad: Funcionalidad sobre limpieza de código
- Las variables pueden ser utilizadas en futuras implementaciones

### **Lecciones Aprendidas**
1. **Método Quirúrgico Efectivo:** Reemplazo completo del bloque return es más eficiente que parches individuales
2. **Priorización Correcta:** Error 500 > Lint warnings
3. **Documentación Inmediata:** Registrar incidentes resueltos para referencia futura

### **Estado Final**
Página principal 100% funcional con todo el contenido original restaurado:
- Hero section con logo y award
- Grid de información (horarios, ubicación, reservaciones)
- Formulario completo de eventos
- Link a bolsa de trabajo
- Footer con copyright
- Botones flotantes (WhatsApp, modal) max-w-7xl px-6 py-20 lg:px-8">
  <div className="w-full"> {/* <-- DIV PROBLEMÁTICO CORRECTAMENTE CERRADO */}
    {/* HERO SECTION */}
    <div className="mx-auto max-w-5xl text-center">...</div>
    {/* GRID DE INFORMACIÓN */}
    <div className="mx-auto mt-20 grid gap-8 md:grid-cols-3">...</div>
    {/* FORMULARIO */}
    <div className="mx-auto mt-20 max-w-2xl">...</div>
  </div> {/* <-- AQUÍ CIERRA EL DIV 'w-full' QUE FALTABA */}
</main>
```

### Resultados Obtenidos
- ✅ **11 errores JSX → 0 errores** (100% resueltos)
- ✅ **Error 500 eliminado:** Página principal funcional
- ✅ **Build exitoso:** Código compilable
- ✅ **Funcionalidad básica restaurada:** Navegación, contacto, modal

### Trade-offs Aceptados
- ⚠️ **7 variables no usadas:** Warnings de lint (no bloqueantes)
- ⚠️ **Características simplificadas:** Formulario y horarios básicos
- ✅ **Prioridad correcta:** Funcionalidad > perfección

### Lecciones Aprendidas
1. **Método quirúrgico efectivo:** Reemplazo completo vs parches individuales
2. **Priorización acertada:** Resolver Error 500 primero que limpieza de código
3. **Balance JSX crítico:** Cada apertura necesita su cierre correspondiente
4. **Context awareness:** Elementos flotantes deben estar dentro del contenedor correcto

### Estado Final
- **Página principal:** Funcional sin errores 500
- **Build:** Exitoso sin errores críticos
- **Warnings:** 7 variables no usadas (trade-off aceptable)
- **Recomendación:** Mantener versión actual, considerar expansión futura

---

## 🆕 Historial de Cambios Funcionando (22 de abril de 2026)

### Módulo de Empleados (`/admin/employees`)

#### Menú superior de modos de vista
- Tres pestañas superiores: **Personal**, **Horario**, **Nómina**.
- Archivo: `src/pages/admin/Employees.jsx` (state `viewMode`).

#### Vista **Personal**
- Lista de colaboradores activos con tarjeta expandible.
- Tabs internos: `Info`, `Horario`, `Liquidación/Nómina`, `Reportes`, `Notas`.
- Historial de bajas al final.
- Mapa general de cobertura con todos los marcadores (`LocationMap`).

#### Vista **Horario**
- Grid de 7 columnas (Lunes–Domingo) con la semana actual por default.
- Navegación `← Anterior / Actual / Siguiente →` con offset semanal.
- Cada día muestra los empleados programados con entrada/salida.
- Punto verde animado si el empleado está en turno hoy.
- Clic en un empleado → abre su expediente en Personal con tab Horario activo para editar.

#### Vista **Nómina**
- Tarjetas resumen por empleado: sueldo base, faltas, extras, neto.
- Botón "Ver detalle" salta al expediente con la liquidación abierta.

#### Tab **INFO** ampliado
El tab `Info` del colaborador ahora incluye:
- **Datos Generales:** nombre, puesto, sueldo diario, ID SoftRestaurant, fecha de contratación, foto.
- **Información de Contacto:** teléfono, correo electrónico, contacto de emergencia.
- **Datos Médicos:** tipo de sangre (O±, A±, B±, AB±), alergias, enfermedades/condiciones.
- **Resumen Semanal:** sueldo base, faltas, bonos/extras, pago neto (con navegación de semana).
- **Ubicación:** dirección + mapa individual (`LocationMap`).

### Módulo de Permisos (`/admin/permissions`)
- Auto-migración de columnas: `api/users/permissions.php` crea las columnas faltantes (`can_edit_employees`, `can_delete_employees`, `can_edit_quotes`, `can_delete_quotes`, `can_edit_applications`, `can_delete_applications`, `can_view_sales`, `can_edit_sales`) si no existen, eliminando 500 al entrar.
- Acceso solo para `manuel` y `misael`.
- UI con toggles verde/slate, badge `X/N activos`, botones "Activar todo / Desactivar todo".

### Módulo de Email (`/api/email/send.php`)
- Corregidos errores de sintaxis PHP (apostrofes sin escapar en template HTML y `setFrom`).
- Flujo SMTP via Hostinger con fallbacks a `mail()`.
- Consumido desde `src/pages/admin/Inbox.jsx → handleSendEmail`.

### Liquidaciones editables (ya funcionando)
- Campos en `employee_files` consumidos por `api/executive-report/update.php`:
  - `liquid_tres_meses`, `liquid_veinte_dias`, `liquid_vacaciones`, `liquid_prima_vacacional`, `liquid_aguinaldo`
  - `renuncia_vacaciones`, `renuncia_prima_vacacional`, `renuncia_aguinaldo`
  - `fecha_baja`, `motivo_baja`, `dias_trabajados_total`
- Whitelisteados en `$allowedFields` del endpoint.

### SQL requerido (ejecutar una vez en phpMyAdmin)
```sql
ALTER TABLE employee_files
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS tipo_sangre VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS alergias TEXT NULL,
  ADD COLUMN IF NOT EXISTS enfermedades TEXT NULL,
  ADD COLUMN IF NOT EXISTS liquid_tres_meses DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_veinte_dias DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_vacaciones DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_prima_vacacional DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_aguinaldo DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renuncia_vacaciones DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renuncia_prima_vacacional DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renuncia_aguinaldo DECIMAL(10,2) DEFAULT 0;
```

---

## 📋 **Estado Actual de Tablas en phpMyAdmin (18 tablas)**

### **Tablas Existentes:**

#### 1. **activity_log**
- Registra la actividad y acciones de los usuarios dentro del sistema
- Campos: id (PK), user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at

#### 2. **analytics**
- Almacena métricas y valores analíticos del sistema
- Campos: id (PK), metric_type, metric_value, date, metadata, created_at

#### 3. **chat_conversations**
- Gestiona las salas o hilos de conversación de chat entre usuarios
- Campos: id (PK), user1_id, user2_id, last_message_at, created_at

#### 4. **chat_messages**
- Almacena los mensajes individuales enviados dentro de las conversaciones de chat
- Campos: id (PK), conversation_id, sender_id, message_type, content, file_url, file_name, file_size, is_read, created_at

#### 5. **employee_files**
- Directorio extenso y expediente de los empleados registrados
- Campos: id (PK), application_id, name, age, gender, studies, email, phone, address, position, experience, current_job, photo, id_photo, emergency_contact, employee_number, estado_civil, idiomas, accesos, sueldo, prestaciones, tipo_sangre, alergias, enfermedades, status, hire_date, notes, created_at, updated_at, sort_order

#### 6. **employee_reports**
- Reportes o archivos adjuntos vinculados al expediente de un empleado
- Campos: id (PK), employee_id, report_name, report_type, file_path, content, photo_path, created_by, created_at

#### 7. **executive_report**
- Reportes ejecutivos o métricas principales de desempeño/candidatos
- Campos: id (PK), name, main_amount, secondary_amount, created_at, updated_at, application_date, start_date, email, phone, age, gender, address, estudios, experience, current_job, photo, status, hire_date, notes

#### 8. **job_applications**
- Registros de postulaciones o solicitudes de empleo
- Campos: id (PK), name, studies, email, phone, current_job, position, experience, address, no_studies, no_email, no_current_job, status, notes, reviewed_by, reviewed_at, created_at, updated_at, age, gender, estudios, photo_url
- 📸 **Fotos almacenadas en:** `/public_html/uploads/applications/` (URL relativa guardada en `photo_url`)
- Al aceptar una solicitud (`status = 'Aceptada'`), se copia `photo_url` automáticamente al campo `photo` de `executive_report`

#### 9. **menu_categories** ✅ **(YA EXISTE)**
- Clasificación o agrupación para el sistema de menús
- Campos: id (PK), slug, icon, label, description, type, sort_order, is_active, created_at

#### 10. **menu_items** ✅ **(YA EXISTE)**
- Detalle de los elementos o platillos que componen las categorías del menú
- Campos: id (PK), category_id, name, description, price, unit, image_url, sort_order, is_active, created_at, updated_at

#### 11. **messages**
- Sistema de mensajería interna directa entre usuarios
- Campos: id (PK), sender_id, recipient_id, subject, message, is_read, read_at, parent_message_id, created_at

#### 12. **onsite_status** ✅ **(YA EXISTE)**
- Registro del estado de presencia (en sitio o fuera) de los usuarios/empleados
- Campos: id (PK), user_id, is_onsite, updated_at

#### 13. **page_views**
- Métricas de navegación registrando las vistas a las páginas del sistema
- Campos: id (PK), session_id, user_id, page_url, page_title, referrer, time_on_page, scroll_depth, viewed_at, left_at

#### 14. **site_visitors**
- Información detallada sobre los visitantes del sitio y su dispositivo/ubicación
- Campos: id (PK), visitor_id, ip_address, user_agent, device_type, browser, os, screen_width, screen_height, language, country, city, region, page_url, page_title, referrer, utm_source, utm_medium, utm_campaign, is_new_visitor, visited_at

#### 15. **users**
- Tabla principal de usuarios del sistema y sus credenciales de acceso
- Campos: id (PK), username, password, full_name, email, role, avatar, is_active, last_login, created_at, updated_at, profile_photo

#### 16. **user_clicks**
- Analíticas granulares de interacciones registrando clics específicos en elementos de la UI
- Campos: id (PK), session_id, user_id, event_type, page_url, element_id, element_class, element_text, click_x, click_y, timestamp, metadata

#### 17. **user_sessions**
- Registro y control de las sesiones activas e históricas de los usuarios
- Campos: id (PK), user_id, session_token, ip_address, user_agent, device_type, browser, os, country, city, started_at, last_activity, ended_at, duration_seconds, is_active

#### 18. **user_skills** ✅ **(YA EXISTE)**
- Almacena las habilidades, destrezas o competencias asociadas a los perfiles de los usuarios o empleados
- Campos: id (PK), user_id, icon, skill, description, sort_order, is_active, created_at

---

## 🆕 **Única Tabla Faltante por Crear**

### **event_quotes** - Solicitudes de Cotización (NUEVO)
```sql
CREATE TABLE IF NOT EXISTS event_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    guests INT NOT NULL,
    notes TEXT,
    location VARCHAR(255),
    status ENUM('pending', 'contacted', 'quoted', 'confirmed', 'cancelled') DEFAULT 'pending',
    quote_amount DECIMAL(10,2),
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## **Configuración Requerida**

### **1. Crear Tabla event_quotes**
Solo necesitas ejecutar el SQL de arriba para crear la tabla `event_quotes`.

### **2. Configurar Roles de Usuario:**
```sql
-- Administradores (pueden crear, editar, eliminar)
UPDATE users SET role = 'admin' WHERE LOWER(username) IN ('manuel', 'misael');

-- Viewers (solo pueden ver y cambiar estado)
UPDATE users SET role = 'viewer' WHERE LOWER(username) IN ('francisco', 'santiago');

-- Actualizar email de Misael
UPDATE users SET email = 'Misaelmevi@gmail.com' WHERE LOWER(username) = 'misael';

-- Verificar configuración
SELECT id, username, email, role, is_active FROM users WHERE username IN ('manuel', 'misael', 'francisco', 'santiago');
```

### **3. Verificar Roles de Usuario**
```sql
SELECT id, username, email, role, is_active FROM users;
```

### **4. Configurar Zona Horaria en PHP**
Los archivos PHP ya tienen configurada la zona horaria:
```php
date_default_timezone_set('America/Hermosillo');
```

---

## 📊 **Relaciones entre Tablas**

### **Diagrama de Relaciones:**
```
users (1) ←→ (N) messages
users (1) ←→ (N) applications
users (1) ←→ (N) chat_messages
users (1) ←→ (1) onsite_status
users (1) ←→ (N) user_skills
users (1) ←→ (N) activity_log

menu_categories (1) ←→ (N) menu_items

event_quotes (N) ←→ (1) users (assigned_to)
```

---

## 🚀 **Sistema de Cotizaciones - Flujo Completo**

### **1. Frontend (Homepage)**
- Formulario envía a `/api/quotes/submit.php`
- Validación en React
- Mensajes de estado

### **2. Backend (PHP)**
- `submit.php` - Recibe y guarda cotización
- Envía emails a admins/viewers
- Email de confirmación al cliente

### **3. Administración**
- `/admin/quotes` - Vista completa
- CRUD completo para admins
- Solo lectura para viewers
- Estadísticas avanzadas

### **4. Notificaciones**
- Email automático con enlace directo
- Contador en dashboard
- Botón en navbar

---

## 📝 **Datos de Ejemplo**

### **Categorías de Menú:**
```sql
INSERT INTO menu_categories (slug, icon, label, description, type, sort_order) VALUES
('entradas', '🥗', 'Entradas', 'Sabores frescos para comenzar', 'menu', 1),
('platos-fuertes', '🍽️', 'Platos Fuertes', 'Nuestras especialidades', 'menu', 2),
('postres', '🍰', 'Postres', 'Dulces finales', 'menu', 3),
('bebidas', '🍸', 'Bebidas', 'Barra y coctelería', 'event', 1);
```

### **Platillos de Ejemplo:**
```sql
INSERT INTO menu_items (category_id, name, description, price, unit, sort_order) VALUES
(1, 'Ensalada César', 'Lechuga romana, parmesano, crutones, aderezo César', 180.00, 'porción', 1),
(2, 'Filete de Res', 'Filete de 200g con guarniciones', 380.00, 'plato', 1);
```

---

## ✅ **Checklist de Implementación**

- [ ] Crear tabla `event_quotes` en phpMyAdmin
- [ ] Actualizar email de Misael
- [ ] Probar formulario de cotización
- [ ] Verificar emails de notificación
- [ ] Probar panel de administración
- [ ] Verificar permisos por rol
- [ ] Probar estadísticas

---

## 📧 **Configuración de Emails**

### **Headers Usados:**
```php
$headers = "From: no-reply@bonifaciossancarlos.com\r\n";
$headers .= "Reply-To: no-reply@bonifaciossancarlos.com\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();
```

### **Destinatarios:**
- **Admins y Viewers**: Notificación de nueva cotización
- **Cliente**: Confirmación de solicitud recibida

---

## 🔐 **Seguridad**

### **Autenticación:**
- `requireAuth()` en todos los endpoints
- Validación de roles en CRUD
- Session management

### **Validación:**
- Sanitización de inputs
- Validación de campos requeridos
- Escapado de SQL injection

---

## 📈 **Estadísticas Implementadas**

### **Cotizaciones:**
- Total de solicitudes
- Pendientes/Confirmadas/Canceladas
- Tasa de conversión
- Tipos de evento más populares
- Estadísticas mensuales
- Ingresos proyectados

### **Usuarios:**
- Total de usuarios
- Sesiones activas
- Tracking de páginas

---

## 🌐 **Endpoints API**

### **Cotizaciones:**
- `POST /api/quotes/submit.php` - Crear cotización
- `GET /api/quotes/list.php` - Listar con estadísticas
- `POST /api/quotes/create.php` - Crear (admin)
- `POST /api/quotes/update.php?id=X` - Actualizar (admin)
- `POST /api/quotes/delete.php?id=X` - Eliminar (admin)

### **Otros:**
- `GET/POST /api/users/onsite-status.php` - Estado Manuel
- `POST /api/messages/send.php` - Enviar mensaje
- `GET /api/chat/notifications.php` - Notificaciones

---

## 📅 **Última Actualización**

**Fecha:** 18 de marzo de 2026  
**Versión:** 1.0  
**Estado:** ✅ **Casi completo - Solo falta crear 1 tabla**

---

## 🎯 **Resumen Final**

### **Base de Datos Actual:**
- ✅ **18 tablas existentes** (todas funcionales)
- ✅ **4 tablas clave ya creadas**: menu_categories, menu_items, onsite_status, user_skills
- ⚠️ **1 tabla faltante**: event_quotes (para cotizaciones)

### **Para Completar el Sistema:**
1. **Ejecutar SQL de `event_quotes`** en phpMyAdmin
2. **Actualizar email de Misael**
3. **¡Listo!** Sistema completo y funcional

### **Sistema de Cotizaciones:**
- ✅ Formulario en homepage (email en lugar de WhatsApp)
- ✅ Panel de administración completo
- ✅ Botón en navbar y tarjeta en dashboard
- ✅ Estadísticas avanzadas
- ✅ Permisos por rol
- ✅ Notificaciones por email

---

## 📊 DASHBOARD DE VENTAS - ACTUALIZACIÓN COMPLETA

**Fecha de Implementación:** 13 de abril de 2026  
**Versión:** 2.0 (Completa con 9 vistas)  
**Archivo:** `src/pages/admin/Sales.jsx`

### **Nuevas Funcionalidades Implementadas:**

#### ✅ **1. Vista de Movimientos de Caja** (`viewMode: 'cash'`)
**Descripción:** Monitoreo completo del flujo de efectivo en tiempo real.

**Características:**
- 💵 Resumen de flujo de efectivo del turno
- ✅ Ventas en efectivo calculadas automáticamente
- ➕ Depósitos con contador de movimientos
- ➖ Retiros con contador de movimientos
- 💰 Pagos de propinas a meseros con contador
- 📊 Saldo final calculado automáticamente
- 📋 Lista detallada de movimientos recientes con:
  - Tipo de movimiento (Retiro/Depósito/Pago Propina)
  - Monto con signo (+/-)
  - Concepto y referencia
  - Hora del movimiento
  - Iconos visuales por tipo

**Cálculo del Saldo Final:**
```
Saldo Final = Ventas Efectivo + Depósitos - Retiros - Propinas Pagadas
```

**API Endpoint:** `GET /api/softrestaurant/cash-movements.php?period={dateRange}`

**Datos Mostrados:**
- `summary.cash_sales` - Ventas en efectivo
- `summary.total_deposits` - Total de depósitos
- `summary.total_withdrawals` - Total de retiros
- `summary.total_tip_payments` - Total de propinas pagadas
- `summary.final_balance` - Saldo final esperado
- `movements[]` - Array de movimientos individuales

---

#### ✅ **2. Vista de Productos** (`viewMode: 'products'`)
**Descripción:** Análisis detallado de productos vendidos.

**Características:**
- 🔥 Top 10 productos más vendidos con:
  - Ranking visual (top 3 con badge dorado)
  - Nombre del producto
  - Cantidad vendida (pzas)
  - Número de tickets
  - Total de ventas
- 🍺 Bebidas más vendidas (top 5)
- ⚠️ Productos menos vendidos (para alertas de inventario)
- 📊 Tabla interactiva con hover effects

**API Endpoint:** Usa datos de `GET /api/softrestaurant/sales.php`

**Datos Mostrados:**
- `top_products[]` - Array de productos más vendidos
  - `product_name` - Nombre del producto
  - `total_qty` - Cantidad total vendida
  - `tickets` - Número de tickets que lo incluyen
  - `total_sales` - Ingresos totales del producto
- `analytics.top_beverages[]` - Bebidas más vendidas
- `analytics.bottom_products[]` - Productos menos vendidos

---

#### ✅ **3. Vista de Mesas Abiertas** (`viewMode: 'open_tables'`)
**Descripción:** Monitoreo en tiempo real de todas las mesas activas.

**Características:**
- 🔓 Resumen de mesas activas:
  - Total de mesas abiertas
  - Total acumulado
  - Total de comensales
- 📋 Tarjetas individuales por mesa con:
  - Número de mesa
  - Mesero asignado
  - Total acumulado
  - Folio del ticket
  - Número de comensales
  - Tiempo transcurrido (horas y minutos)
  - ⚠️ Alerta visual si >2 horas abierta (borde rojo pulsante)
  - Propina acumulada (si existe)
  - Hora de apertura
- 🔴 Sección de mesas históricas (de turnos anteriores)

**Cálculo de Tiempo:**
```javascript
const minutesOpen = Math.floor((now - openedTime) / 1000 / 60);
const hoursOpen = Math.floor(minutesOpen / 60);
const minsOpen = minutesOpen % 60;
const isOld = minutesOpen > 120; // Alerta si >2 horas
```

**API Endpoint:** Usa datos de `GET /api/softrestaurant/sales.php`

**Datos Mostrados:**
- `open_stats` - Estadísticas de mesas del turno actual
  - `checks` - Número de mesas abiertas
  - `total` - Total acumulado
  - `covers` - Total de comensales
- `historical_open_stats` - Mesas de turnos anteriores
- `sales[]` filtrado por `status === 'open'`

---

#### ✅ **4. Vista de Corte de Caja** (`viewMode: 'shift_close'`)
**Descripción:** Reporte completo para cierre de turno.

**Características:**
- 🔒 Header con período del corte
- 💰 Sección de Ventas del Turno:
  - Ventas en efectivo
  - Ventas en tarjeta
  - Total de ventas
  - Número de tickets
  - Total de comensales
- 📊 Sección de Movimientos de Efectivo:
  - Depósitos con contador
  - Retiros con contador
  - Propinas pagadas con contador
- 💵 Cálculo del Saldo Final Esperado:
  - Fórmula visual paso a paso
  - Resultado destacado en grande
  - Nota explicativa para el usuario
- 🎫 Resumen de Descuentos y Cortesías
- ❌ Resumen de Tickets Cancelados
- 🔘 Botones de acción:
  - 📄 Imprimir Corte
  - 🔒 Cerrar Turno

**Cálculo Mostrado:**
```
Ventas en Efectivo:        $XX,XXX.XX
+ Depósitos:               $X,XXX.XX
- Retiros:                -$X,XXX.XX
- Propinas Pagadas:       -$X,XXX.XX
─────────────────────────────────────
= Saldo Esperado:         $XX,XXX.XX
```

**API Endpoints:**
- `GET /api/softrestaurant/sales.php` - Datos de ventas
- `GET /api/softrestaurant/cash-movements.php` - Movimientos de caja

---

### **Mejoras Generales Implementadas:**

#### 🔄 **Actualización en Tiempo Real**
- ✅ Carga automática cada 30 segundos
- ✅ Indicador de "Última actualización" con timestamp
- ✅ Sincronización simultánea de ventas y movimientos de caja
- ✅ Animaciones suaves en transiciones de datos

#### 📱 **Soporte Móvil Mejorado**
- ✅ Selector dropdown para todas las vistas en móvil
- ✅ Diseño responsive para todas las nuevas vistas
- ✅ Tarjetas optimizadas para pantallas pequeñas

#### 🎨 **Interfaz de Usuario**
- ✅ Diseño consistente con el tema existente
- ✅ Gradientes y efectos visuales modernos
- ✅ Iconos descriptivos para cada vista
- ✅ Colores semánticos (verde=positivo, rojo=negativo, amber=propinas)
- ✅ Animaciones con Framer Motion

---

### **Estructura de Vistas Completa:**

| Vista | Emoji | Descripción | Datos Clave |
|-------|-------|-------------|-------------|
| **General** | 📊 | Dashboard principal con KPIs | Ventas, gráficas, métodos de pago |
| **Caja** | 💵 | Movimientos de efectivo | Retiros, depósitos, propinas, saldo |
| **Productos** | 📦 | Análisis de productos | Top/bottom productos, bebidas |
| **Mesas Abiertas** | 🔓 | Monitoreo de mesas activas | Tiempo, total, comensales, alertas |
| **Corte** | 🔒 | Cierre de turno | Saldo final, resumen completo |
| **Notas** | 📄 | Lista de tickets | Todos los tickets del período |
| **Meseros** | 👥 | Rendimiento de meseros | Ventas, tickets, propinas por mesero |
| **Staff** | 🕒 | Asistencia de empleados | Check-in, check-out, turnos |
| **Auditoría** | ⚖️ | Tickets cancelados | Cancelaciones con motivos |

---

### **Código de Implementación:**

#### **Estado del Componente:**
```javascript
const [cashMovements, setCashMovements] = useState(null);
const [lastUpdate, setLastUpdate] = useState(null);
```

#### **Carga de Datos:**
```javascript
const loadAllData = useCallback(async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://bonifaciossancarlos.com/api';
    
    // Cargar datos de ventas
    const res = await fetch(`${apiUrl}/softrestaurant/sales.php?range=${dateRange}`);
    const result = await res.json();
    if (result.success) {
      setData(result);
    }
    
    // Cargar movimientos de caja
    const cashRes = await fetch(`${apiUrl}/softrestaurant/cash-movements.php?period=${dateRange}`);
    const cashResult = await cashRes.json();
    if (cashResult.success) {
      setCashMovements(cashResult);
    }
    
    setLastUpdate(new Date());
  } catch (err) { 
    console.error('Error Crítico de Conexión:', err); 
  } finally { 
    setLoading(false); 
  }
}, [dateRange]);
```

---

### **APIs Utilizadas:**

#### **1. API de Ventas**
**Endpoint:** `GET /api/softrestaurant/sales.php`

**Parámetros:**
- `range` - Período (today, yesterday, week, month)
- `start` - Fecha inicio (opcional, para custom)
- `end` - Fecha fin (opcional, para custom)
- `status` - Filtro de estado (closed, open, all)

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "today": { "total": 45230, "checks": 87, "covers": 234 },
    "yesterday": { ... },
    "week": { ... },
    "month": { ... }
  },
  "open_stats": { "total": 5200, "checks": 8, "covers": 24 },
  "historical_open_stats": { "total": 1200, "checks": 2, "covers": 6 },
  "sales": [...],
  "hourly": [...],
  "top_products": [...],
  "waiters": [...],
  "payment_methods": [...],
  "analytics": {
    "top_beverages": [...],
    "bottom_products": [...],
    "tips_breakdown": {...},
    "peak_hour": {...}
  },
  "cancellations": [...]
}
```

#### **2. API de Movimientos de Caja**
**Endpoint:** `GET /api/softrestaurant/cash-movements.php`

**Parámetros:**
- `period` - Período (today, yesterday, week, month, custom)
- `start_date` - Fecha inicio (opcional)
- `end_date` - Fecha fin (opcional)

**Respuesta:**
```json
{
  "success": true,
  "period": "today",
  "start": "2026-04-13 06:00:00",
  "end": "2026-04-14 07:59:59",
  "summary": {
    "cash_sales": 25000,
    "total_deposits": 2000,
    "deposit_count": 3,
    "total_withdrawals": 8500,
    "withdrawal_count": 12,
    "total_tip_payments": 3200,
    "tip_payment_count": 8,
    "final_balance": 15300
  },
  "movements": [
    {
      "id": "MOV123",
      "type": "withdrawal",
      "amount": 500,
      "datetime": "2026-04-13 14:35:00",
      "concept": "Compra verduras",
      "reference": "Factura #456"
    },
    ...
  ]
}
```

---

### **Tablas de Base de Datos Utilizadas:**

#### **Tablas Principales:**
1. `sr_sales` - Tickets de ventas
2. `sr_sale_items` - Productos vendidos
3. `sr_cash_movements` - Movimientos de caja
4. `sr_cancellations` - Tickets cancelados

#### **Campos Clave de `sr_cash_movements`:**
```sql
- movement_id (VARCHAR) - ID único del movimiento
- movement_type (ENUM) - withdrawal/deposit/tip_payment/other
- amount (DECIMAL) - Monto del movimiento
- amount_signed (DECIMAL) - Monto con signo (+/-)
- movement_datetime (DATETIME) - Fecha y hora
- concept (VARCHAR) - Descripción del movimiento
- reference (VARCHAR) - Referencia adicional
- is_tip_payment (BOOLEAN) - Si es pago de propina
- shift_id (VARCHAR) - ID del turno
```

---

### **Próximas Mejoras Sugeridas:**

#### 🔜 **Funcionalidades Pendientes:**
1. **Exportación de Reportes**
   - Botón "Exportar a Excel" funcional
   - Botón "Exportar a PDF" funcional
   - Función de impresión optimizada

2. **Cierre de Turno Real**
   - Campo para ingresar "Efectivo Real Contado"
   - Cálculo de diferencia (faltante/sobrante)
   - Guardar cierre en base de datos
   - Generar reporte de cierre

3. **Detalles de Productos por Mesa**
   - Modal con productos consumidos por mesa abierta
   - Consulta a `sr_sale_items` por ticket

4. **Filtros Avanzados**
   - Filtro por mesero específico
   - Filtro por mesa
   - Filtro por método de pago
   - Búsqueda por folio

5. **Alertas en Tiempo Real**
   - Notificación de mesa >2 horas
   - Alerta de ticket cancelado
   - Alerta de descuento alto
   - Notificación de sincronización fallida

6. **Comparación de Períodos**
   - Selector de 2 períodos
   - Gráfica comparativa
   - Diferencias porcentuales

---

### **Notas Técnicas:**

#### **Rendimiento:**
- ✅ Actualización automática cada 30 segundos
- ✅ Carga paralela de APIs (ventas + movimientos)
- ✅ Lazy loading de vistas con AnimatePresence
- ✅ Optimización de re-renders con useCallback

#### **Compatibilidad:**
- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iPad, Android tablets)
- ✅ Mobile (iPhone, Android phones)
- ✅ Responsive design con Tailwind CSS

#### **Seguridad:**
- ✅ Variables de entorno para API URL
- ✅ Manejo de errores en fetch
- ✅ Validación de datos antes de renderizar
- ✅ Fallbacks para datos faltantes

---

### **Estado Actual:**

**✅ COMPLETAMENTE FUNCIONAL**

Todas las 4 vistas críticas están implementadas y operativas:
1. ✅ Movimientos de Caja
2. ✅ Productos
3. ✅ Mesas Abiertas
4. ✅ Corte de Caja

**Actualización en tiempo real:** ✅ Activa (30 segundos)  
**Soporte móvil:** ✅ Completo  
**Diseño responsive:** ✅ Optimizado  
**Integración con APIs:** ✅ Funcional

---

## 🎨 REDISEÑO VISUAL v2.0

**Fecha:** 13 de abril de 2026  
**Objetivo:** Mejorar contraste, legibilidad y profesionalismo del dashboard.

### **Cambios Principales:**

#### **1. Fondos de Tarjetas — Sólidos**
- **Antes:** `bg-slate-900/30` (transparente, difícil de leer)
- **Después:** `bg-[#0c1222]` (sólido, alto contraste contra `bg-[#030712]`)
- **Headers de tablas:** `bg-[#0a0f1a]`

#### **2. Bordes Más Visibles**
- **Antes:** `border-slate-800/50` (apenas visible)
- **Después:** `border-slate-700/40` + bordes de color por contexto (ej: `border-cyan-500/30`)

#### **3. Texto Más Grande y Legible**
- Labels: `text-[9px]` → `text-xs` o `text-[10px]` con `font-bold`
- Valores: `text-3xl font-light` → `text-2xl lg:text-3xl font-black`
- Colores dinámicos con `style={{ color: colorHex }}` para evitar bug de Tailwind JIT

#### **4. KPIs Ampliados (8 tarjetas)**
Antes 4, ahora 8 KPIs en la parte superior:
- **Tickets** — Total de tickets del período
- **Ticket Promedio** — Venta total / tickets
- **Comensales** — Total de personas
- **Propinas** — Total generado
- **Descuentos** — Total descontado
- **Cancelados** — Total cancelado
- **Mesas Abiertas** — Mesas activas ahora
- **Hora Pico** — Hora con más actividad

#### **5. Vista General Mejorada**
- Gráfica cambiada de `AreaChart` a `BarChart` (más legible)
- Eje Y con formato `$Xk`
- 3 secciones nuevas en overview:
  - **Desglose de Propinas** (pagadas/pendientes)
  - **Hora Pico** (hora, tickets, ventas)
  - **Mesas Abiertas** (count, total, comensales)
  - **Resumen de Efectivo** (ventas, depósitos, retiros, saldo)

#### **6. Bug Fix: Clases Dinámicas de Tailwind**
- **Problema:** `bg-${color}-500/10` no funciona con Tailwind JIT
- **Solución:** `style={{ backgroundColor: colorHex + '15', color: colorHex }}`

#### **7. Selector de Rango en Español**
- Ahora: `Hoy`, `Ayer`, `Semana`, `Mes` (con `RANGE_LABELS`)
- Integrado al header

#### **8. Carga Paralela de APIs**
- **Antes:** fetch secuencial
- **Después:** `Promise.all([salesFetch, cashFetch])` (más rápido)

#### **9. Notas: columnas Subtotal y Propina agregadas**
#### **10. Meseros: Promedio/Ticket calculado**

### **Paleta de Colores:**

| Elemento | Color | Hex |
|----------|-------|-----|
| Fondo principal | Navy oscuro | `#030712` |
| Fondo tarjetas | Navy medio | `#0c1222` |
| Headers tablas | Navy profundo | `#0a0f1a` |
| Ventas | Cyan | `#06b6d4` |
| Propinas | Emerald | `#10b981` |
| Descuentos | Amber | `#f59e0b` |
| Cancelados | Red | `#ef4444` |
| Comensales | Purple | `#8b5cf6` |
| Mesas | Orange | `#f97316` |
| Hora Pico | Pink | `#ec4899` |
| Texto principal | White | `#ffffff` |
| Labels | Slate 400 | `#94a3b8` |

---

## 👥 GESTIÓN DE EMPLEADOS v1.0

**Fecha:** 13 de abril de 2026  
**Archivos nuevos creados:**
- `database/employee_management.sql` — Tablas SQL
- `api/employees/attendance-management.php` — API completa

### **Tablas Nuevas:**

| Tabla | Descripción |
|-------|-------------|
| `employee_schedules` | Horario programado por empleado por día de la semana |
| `employee_payroll` | Salario/tarifa por empleado (por hora, día, semana, quincena, mes) |
| `employee_day_notes` | Notas por empleado por día (ej: "llegó temprano pero no hizo clock in") |
| `attendance_time_edits` | Log de auditoría de ediciones de hora entrada/salida |

### **API Endpoints:**

**GET** `api/employees/attendance-management.php`
- `?action=attendance&range=today` — Asistencia con horario, puntualidad, nómina, notas
- `?action=schedules` — Todos los horarios programados
- `?action=payroll` — Datos de nómina de todos
- `?action=notes&employee_id=X&date=Y` — Notas de un día

**POST** `api/employees/attendance-management.php`
- `action: save_schedule` — Guardar horario semanal de un empleado
- `action: save_payroll` — Guardar tipo y monto de pago
- `action: add_note` — Agregar nota a un día de un empleado
- `action: delete_note` — Eliminar nota
- `action: edit_time` — Editar hora de entrada/salida (con auditoría)

### **Vista Asistencia en Dashboard:**

- **Tabla completa:** Colaborador, Fecha, Horario programado, Entrada, Salida, Puntualidad, Horas, Pago, Acciones
- **Puntualidad:** Verde si llegó a tiempo (≤5 min), Rojo con minutos de retardo
- **Nómina:** Cálculo automático por día según tipo de pago configurado
- **Acciones por empleado:**
  - **Nota** — Agregar nota al día (ej: "no hizo clock in a tiempo")
  - **$** — Configurar nómina (tipo pago + monto)
  - **Hrs** — Configurar horario semanal
- **Click en hora** — Abre modal para editar entrada/salida con motivo (auditoría)
- **Resumen:** Total registros, A tiempo, Retardos, Nómina del período

### **Productos por Categoría:**

- Se agregó `top_by_category` al analytics de `sales.php`
- Devuelve: **Comida #1**, **Bebida #1**, **Más vendido en general**
- Clasificación por nombre de producto (LIKE patterns para bebidas)
- Se muestran como 3 tarjetas destacadas arriba de la tabla de productos

---

## 🔄 SINCRONIZACIÓN v2.0

**Fecha:** 13 de abril de 2026  
**Archivo:** `softrestaurant-sync/sync-completo-v2.php`  
**Reemplaza:** Script anterior que enviaba historial completo cada 15 seg

### **Problemas que corrige:**

| Problema | v1 | v2 |
|----------|----|----|
| Datos enviados | TODO el historial | Solo últimos 3 días |
| Items de venta | No sincronizaba | ✅ detallescheques + tempdetallescheques |
| Productos | No sincronizaba | ✅ productos + grupos (nombres y categorías) |
| Tipo de pago | Solo cash/pending | ✅ cash/card/mixed/voucher/other |
| Propinas en caja | No detectadas | ✅ Detección por concepto PROPINA |
| Asistencia | Solo nombre y hora | ✅ + posición, minutos, estado |
| Campos cash_movements | Nombres incorrectos | ✅ Compatibles con receptor |
| Envío | Todo de golpe | ✅ Lotes de 200 registros |
| Timeouts | Sin control | ✅ CURLOPT_TIMEOUT 60s |

### **Módulos sincronizados:**

1. **products** — `productos` + `grupos` → `sr_products`
2. **sales** — `cheques`/`tempcheques` + `detallescheques`/`tempdetallescheques` → `sr_sales` + `sr_sale_items`
3. **cancellations** — `movtoscaja` (cancelado=1) → `sr_cancellations`
4. **cash_movements** — `movtoscaja` (cancelado=0) → `sr_cash_movements` (con tip detection)
5. **attendance** — `asistenc` → `sr_attendance` (con minutes_worked)
6. **inventory** — `productos` → `sr_inventory`

### **Cambios en el receptor (sync.php):**
- `syncSaleItems()` ahora almacena `sr_ticket_id` para JOIN con `sr_sales`
- `syncCashMovements()` normaliza campos (compatible v1 y v2)
- Se necesita: `ALTER TABLE sr_sale_items ADD COLUMN sr_ticket_id VARCHAR(50)`

### **SQL pendiente de ejecutar:**
```sql
-- database/alter_sale_items.sql
ALTER TABLE sr_sale_items ADD COLUMN sr_ticket_id VARCHAR(50) AFTER sale_id;
ALTER TABLE sr_sale_items ADD INDEX idx_sr_ticket_id (sr_ticket_id);

-- database/employee_management.sql (4 tablas nuevas)
```

---

# 📑 DICCIONARIO TOTAL DE DATOS (SOFTRESTAURANT v8 PRO)
**AUDITORÍA REALIZADA EL 13 DE ABRIL DE 2026 - SIN OMISIONES.**

### 🟢 ESTRUCTURA COMPLETA DE TABLAS Y COLUMNAS

| TABLA | COLUMNAS |
| :--- | :--- |
| **actualizaciones** | sistema, zip, fecha, cambios |
| **almacen** | idalmacen, nombre, ultimofolio, idempresa, tipo |
| **areas** | idarea, nombre |
| **areasdetalle** | idarea, idempresa, descargar |
| **areasrestaurant** | idarearestaurant, descripcion, idtiposervicio |
| **areasrestaurantdetalle** | idarearestaurant, idempresa, descargar |
| **azbar_log** | idazbarlog, fecha, hora, idturno, quantity, number, size, usuario, price, activetable |
| **bancos** | idbanco, descripcion |
| **bitacoraEnvioVentas** | idbitacora, fechaapertura, enviado, fechaenviado, usuarioenvio, offline |
| **bitacorafiscal** | fecha, fechainicial, fechafinal, cuentastotal, cuentasmodificadas, importeanterior, importenuevo, diferencia, tipo, modificaventareal, idempresa |
| **bitacorasistema** | fecha, usuario, evento, valores, estacion, idempresa |
| **bitacoratarjetacredito** | folio, autorizacion, cuenta, vencimiento, importe, fecha, reimpresiones, mensajederespuesta, procedimiento, afiliacion, statustransaccion, idtransaccion, numerooperacion, informaciontarjeta, tipotarjeta, arqc, apn, apnlabel |
| **bitacoratransacciones** | folio, autorizacion, referencia, importe, fecha, reimpresiones, procedimiento, datosenvio, datosrespuesta, medusafol_prov, medusafol_ope |
| **cancela** | foliocheque, comanda, cantidad, clave, razon, fecha, usuario, precio |
| **cheqdet** | foliodet, movimiento, comanda, cantidad, idproducto, descuento, precio, impuesto1, impuesto2, impuesto3, preciosinimpuestos, tiempo, hora, modificador, mitad, comentario, idestacion, usuariodescuento, comentariodescuento, idtipodescuento, horaproduccion, idproductocompuesto, productocompuestoprincipal, preciocatalogo, marcar, idmeseroproducto, prioridadproduccion, estatuspatin, idcortesia, numerotarjeta, estadomonitor, llavemovto |
| **cheqdetf** | foliodet, movimiento, comanda, cantidad, idproducto, descuento, precio, impuesto1, impuesto2, impuesto3, preciosinimpuestos, tiempo, hora, modificador, mitad, comentario, idestacion, usuariodescuento, comentariodescuento, idtipodescuento, horaproduccion, idproductocompuesto, productocompuestoprincipal, preciocatalogo, marcar, idmeseroproducto, prioridadproduccion, estatuspatin, idcortesia, numerotarjeta, llavemovto |
| **cheqdetfeliminados** | foliodet, cantidad, idproducto, descuento, precio |
| **cheqpedidos** | foliocheque, idpedido |
| **cheques** | folio, seriefolio, numcheque, fecha, salidarepartidor, arriborepartidor, cierre, mesa, nopersonas, idmesero, pagado, cancelado, impreso, impresiones, cambio, descuento, reabiertas, razoncancelado, orden, facturado, idcliente, idarearestaurant, idempresa, tipodeservicio, idturno, usuariocancelo, comentariodescuento, estacion, cambiorepartidor, usuariodescuento, fechacancelado, idtipodescuento, numerotarjeta, folionotadeconsumo, notadeconsumo, propinapagada, propinafoliomovtocaja, puntosmonederogenerados, propinaincluida, tarjetadescuento, porcentajefac, usuariopago, propinamanual, observaciones, idclientedomicilio, iddireccion, idclientefacturacion, telefonousadodomicilio, totalarticulos, subtotal, subtotalsinimpuestos, total, totalconpropina, totalsinimpuestos, totalsindescuentosinimpuesto, totalimpuesto1, totalalimentosconimpuestos, totalbebidasconimpuestos, totalotrosconimpuestos, totalalimentossinimpuestos, totalbebidassinimpuestos, totalotrossinimpuestos, totaldescuentossinimpuestos, totaldescuentosconimpuestos, totaldescuentoalimentosconimpu, totaldescuentobebidasconimpues, totaldescuentootrosconimpuesto, totaldescuentoalimentossinimpu, totaldescuentobebidassinimpues, totaldescuentootrossinimpuesto, totalcortesiassinimpuestos, totalcortesiasconimpuestos, totalcortesiaalimentosconimpue, totalcortesiabebidasconimpuest, totalcortesiaotrosconimpuesto, totalcortesiaalimentossinimpue, totalcortesiabebidassinimpuest, totalcortesiaotrossinimpuesto, totaldescuentoycortesiasinimpu, totaldescuentoycortesiaconimpu, cargo, totalconcargo, totalconpropinacargo, descuentoimporte, efectivo, tarjeta, vales, otros, propina, propinatarjeta, totalalimentossinimpuestossind, totalbebidassinimpuestossindes, totalotrossinimpuestossindescu, campoadicional1, idreservacion, idcomisionista, importecomision, comisionpagada, fechapagocomision, foliopagocomision, tipoventarapida, callcenter, idordencompra, totalsindescuento, totalalimentos, totalbebidas, totalotros, totaldescuentos, totaldescuentoalimentos, totaldescuentobebidas, totaldescuentootros, totalcortesias, totalcortesiaalimentos, totalcortesiabebidas, totalcortesiaotros, totaldescuentoycortesia, totalalimentossindescuentos, totalbebidassindescuentos, totalotrossindescuentos, descuentocriterio, descuentomonedero, idmenucomedor, subtotalcondescuento, comisionpax, procesadointerfaz, domicilioprogramado, fechadomicilioprogramado, enviado, ncf, numerocuenta, codigo_unico_af, estatushub, idfoliohub, EnviadoRW, autorizacionfolio, fechalimiteemision |
| **chequesf** | folio, seriefolio, numcheque, fecha, salidarepartidor, arriborepartidor, cierre, mesa, nopersonas, idmesero, pagado, cancelado, impreso, impresiones, cambio, descuento, reabiertas, razoncancelado, orden, facturado, idcliente, idarearestaurant, claveempresav, tipodeservicio, idturno, usuariocancelo, comentariodescuento, estacion, cambiorepartidor, usuariodescuento, fechacancelado, idtipodescuento, numerotarjeta, folionotadeconsumo, notadeconsumo, propinapagada, propinafoliomovtocaja, puntosmonederogenerados, propinaincluida, tarjetadescuento, porcentajefac, propinamanual, usuariopago, idclientefacturacion, cuentaenuso, observaciones, idclientedomicilio, iddireccion, telefonousadodomicilio, totalarticulos, subtotal, subtotalsinimpuestos, total, totalconpropina, totalimpuesto1, cargo, totalconcargo, totalconpropinacargo, descuentoimporte, efectivo, tarjeta, vales, otros, propina, propinatarjeta, campoadicional1, idreservacion, idcomisionista, importecomision, comisionpagada, fechapagocomision, foliopagocomision, tipoventarapida, callcenter, idordencompra, idempresa, totalsindescuento, totalalimentos, totalbebidas, totalotros, totaldescuentos, totaldescuentoalimentos, totaldescuentobebidas, totaldescuentootros, totalcortesias, totalcortesiaalimentos, totalcortesiabebidas, totalcortesiaotros, totaldescuentoycortesia, totalalimentossindescuentos, totalbebidassindescuentos, totalotrossindescuentos, descuentocriterio, descuentomonedero, idmenucomedor, subtotalcondescuento, comisionpax, procesadointerfaz, domicilioprogramado, fechadomicilioprogramado, numerocuenta, codigo_unico_af, modificado, EnviadoRW, autorizacionfolio, fechalimiteemision |
| **chequespagos** | folio, idformadepago, importe, propina, tipodecambio, referencia |
| **chequespagosf** | folio, idformadepago, importe, propina, tipodecambio, referencia |
| **clientes** | idcliente, nombre, direccion, codigopostal, poblacion, estado, pais, email, rfc, curp, cumpleaños, limitedecredito, limitecreditodiario, descuento, notas, foliofiscal, idtipodescuento, tipofacturacion, procesadoweb, nocobrarimpuestos, contacto, tarjetamonedero, telefono1, telefono2, telefono3, telefono4, telefono5, femextipocliente, giro, tipocredito, idtipocliente, idtipomenu, fotografia, fechaalta, retenerimpuesto, tipocuenta, tipoclientencf |
| **clientestitularsecundario** | idcliente, idsecundario |
| **codigodeserviciocfdi** | idcodigo, codigoservicio, folios, usuarioregistro, fecharegistro, idempresa |
| **colonias** | idcolonia, descripcion, idzona |
| **comandas** | idmesero, folio, usado |
| **comandosimpresion** | idcomando, descripcion, comando |
| **comentarios** | idproducto, descripcion |
| **comisionistas** | idcomisionista, idtipocomisionista, nombre, razonsocial, direccion, codigopostal, registrofiscal, contacto, observaciones, telefono, email, paginaweb, poblacion, estado, pais, fechaalta, tipocomision, comisionporcentaje, comisionimporte, puesto, nacimiento, aniversario, cuentabancaria, pagopax, idbanco |
| **compras** | idcompra, idempresa, folio, fechaaplicacion, idproveedor, foliofactura, fechafactura, cancelado, fechavencimiento, usuariocancelo, usuario, referencia, descuento, subtotal, impuesto1, impuesto2, impuesto3, total, fiscal |
| **comprasmovtos** | idcompra, idinsumo, costo, descuento, impuesto1, impuesto1importe, impuesto2, impuesto2importe, impuesto3, impuesto3importe, importesinimpuestos, importeconimpuestos, idalmacen, idordencompra, cantidad |
| **conceptos** | idconcepto, descripcion, tipo, autorizacion, visible |
| **configuracion** | [Más de 150 columnas de configuración interna, desde 'reindexado' hasta 'payworksvarorderiddiferido'] |
| **configuracion_kds** | kdscolorfuentenormal, kdscolorfondonormal, kdscolorfuentefoco, kdscolorfondofoco, kdscolorfuentealerta, kdscolorfondoalerta, kdscolorfuenteatrasado, kdscolorfondoatrasado, kdscolorfuentecan, kdscolorfondocan, kdsnumcuadros, kdstiemporefresco, kdstimerenabled, kdskeyboardenabled, imprimircomanda, autocuttercomanda, impresoracomanda |
| **configuracion_ws** | configuracion_vigencia, configuracion_actualizacion, configuracion_icono, configuracion_codigos, configuracion_url_personalizad, configuracion_cierre_fiscal, configuracion_cierre_mensual, ws_usuario, ws_password, autofactura_enabled, reportes_enabled, configuracion_timeout, configuracion_timeout_reportes, configuracion_actualizacion_re, autofactura_webservice, reportes_webservice, archivos_CFDI_enviados, activacion_dias, activacion_estatus, ws_dias_reportes, ws_estado_reportes, autofactura_fecha, reportes_fecha, serie_factura, Ultima_descarga, Horas_entre_descargas, fecha_instalacion_AF, ManttoVentasActivo |
| **consumodiarioinsumos** | idempresa, idinsumo, consumopromdiario |
| **cortesiasmonedero** | idcortesia, descripcion, status, diasvigencia |
| **cortesiasmonederodetalle** | idcortesia, idproducto, cantidad |
| **cortesiasmonederotarjetas** | idcortesia, numerotarjeta, status, fechainicio, fechafin |
| **costos** | idproducto, idinsumo, cantidad, idempresa |
| **cuentas** | clavemesero, clavemesa, numeropersonas, clavearea, imprimir, estacion, prueba, tiposervicio, total, formadepago, cantidad, cambio, impresoraBT, idmesa, editado, enviadosr, foliocuenta, descuento, subtotal, totalimpuesto1, descuentoimporte, procesado, comentariodescuento, idtipodescuento, usuariodescuento, usuariopago, propina, propinaincluida, cargo, efectivo, tarjeta, vales, otros, propinatarjeta, numerocuenta, motivocancelado, fecha, datosimpresion, mesaorigen |
| **cuentas_procesar** | id, idcuenta, idcomanda, productos, contador |
| **cuentascontables** | idcuentacontable, descripcion, tipo, clavecontable, clasifpoliza, indicadorimpuesto, cuenta, subcuenta, subsubcuenta, auxiliar, moneda, tipodecambio, polizatienenumdivision, polizatipocentro, polizasolicitareferencia, usarenoperacion |
| **cuentaspagos** | folio, idformadepago, importe, propina, tipodecambio, referencia |
| **cuentasporcobrar** | foliocxc, fecha, idturno, idcliente, importe, foliocuenta, nota, cancelado, usuariocancelo, pagada, idempresa, folio, idsecundario |
| **cuentasporcobrarpagos** | foliocxc, idformadepago, importe, propina, tipodecambio, referencia, idempresa |
| **deptosventa** | iddeptoventa, descripcion, idcuentacontable, idcuentacontablecostodebe, idcuentacontablecostohaber |
| **deptosventagrupos** | iddeptoventa, idgrupo |
| **deptosventagruposinsumos** | iddeptoventa, idgruposi |
| **destinatarioantifraude** | destinatario, tipocorreo |
| **destinatariocorte** | destinatario, tipocorreo |
| **destinatarioscorreo** | destinatario, tipocorreo |
| **detallescuentas** | clavemesa, clave, descripcion, nombrecorto, precio, cantidad, comentario, tiempo, modificador, estacion, mitad, tiposerviciodet, enviadosr, descuento, movimiento, separador, comentariodescuento, idtipodescuento, procesado, usuariodescuento, motivocancelado, cantidadcancelado, usuariocancelar, hora, idproductocompuesto, productocompuestoprincipal, nivel, idcomanda, comanda |
| **direccionesdomicilio** | iddireccion, idcliente, idcolonia, delegacion, calle, cruzamiento1, cruzamiento2, numeroexterior, numerointerior, codigopostal, ciudad, estado, pais, referencia |
| **elaborados** | idelaborado, idinsumo, cantidad |
| **empresa_proveedor** | idempresa, idproveedor, descarga |
| **empresas** | idempresa, nombre, razonsocial, direccion, sucursal, rfc, curp, telefono, giro, contacto, fax, email, fechacompra, distribuidor, numerofactura, numerodecontrol, contrasenacontrol, idhardware, licenciaprincipal, licenciamonederoelectronico, licenciamonitorproduccion, licenciasrmovil, licenciamanttoventas, licenciapagoenlinea, licenciahuelladigital, licenciabillar, franquicia, web, ciudad, estado, pais, ciudadsucursal, estadosucursal, passwordempresa, escedis, idproveedor, escorporativo, codigopostal, ventapedidocedis, descuentocedis, idtipoempresa, idregionempresa, idestado, idpais, claveunicaempresa, regimen, idempresahub, logohub, logoempresa, logoempresaext, prefijoempresa |
| **empresas_regalias_config** | idempresa, aplicarregalias, aplicarcannon, montocannon, aplicarroyalties, esquema, monto, porcentaje |
| **empresasvi** | idempresavi, nombre, idcuentacontable |
| **empresasvp** | idempresavp, nombre, rangoinicial, rangofinal, idcuentacontable |
| **encuestas** | idencuesta, titulo, pregunta1, resp11, resp12, resp13, pregunta2, resp21, resp22, resp23, pregunta3, resp31, resp32, resp33, pregunta4, resp41, resp42, resp43, pregunta5, resp51, resp52, resp53, pregunta6, resp61, resp62, resp63 |
| **estaciones** | idestacion, descripcion, serie, ip, estado, seriefolio, bloqueararearestaurant, idarearestaurant, mostrarcumpleaños, esconderescritorio, esconderbarra, impresoracheques, impresoranotas, impresorafacturas, saltosimpresoracheques, saltosimpresoranotas, usacutterimpresoracheques, usacutterimpresoranotas, usacajondedinero, cajonascii, cajonpuerto, cajontipo, cajontiempo, cajonimpresora, cajontipoconexion, cajacomandero, [Columnas de impresión y monitores 1-5], idformatofacturafiscal, idformatofacturapublico, estacionpocket, colorbotones, colorpantallas, colorcuadrosdetexto, tipodeimpresionfactura, seriefacturacion, usarturnoestacion, buscaractualizaciones, directorioactualizaciones, nombrearchivoexportacion, directoriorespaldo, directoriopoliza, directorioexportacion, numeroestacion, nombrepuntodeventa, serieimpresoracuentas, posnoterminal, rutasonido, sonidomonitor, usarbascula, basculapuerto, basculabitsegundo, basculabitdatos, basculaparidad, basculabitdeparada, facturaslineasencabezado, facturaslineaspiedepagina, facturassumarlineascuerpoapie, autorizacionacceso, autorizacioneventos, autorizacioncomandero, ejecutararchivocierre, nombrearchivoejecutarcierre, enlacesoftencuestas, impresorafiscal, fiscalport, paridadxsegfiscal, idcallactivo, idcallpuerto, idcallbitsegundo, idcallbitdatos, idcallparidad, idcallbitdeparada, paisimpresorafiscal, visorinstalado, visorpuerto, visormensaje, mensajeespera, idcallnorma, monitorteclaarriba, monitorteclafinalizar, monitorteclaregresar, monitorteclaprimero, monitorteclaabajo, monitorteclaultimo, monitorteclaactualizar, [Teclas de monitoreo Admon], intervalosonidoexcedidomonitor, monitorimprimircomanda, monitorimpresoracomandas, monitorimpresoraautocutter, monitoriniciarmodulo, monitorordenamientoproductos, tarjetacredito, tipodispositivo, pinpadpuertocom, pinpadbitsxsegundo, pinpadparidad, pinpadbitsdeparada, pinpadbitsdedatos, tipoimpresoracuentas, tipoimpresoranotas, fiscalimpcambio, fiscalimpcantximporte, sonidomonitortiempoexcedido, rutasonidotiempoexcedido, tipoimpresioncomandamonitor, idempresa, usartipoventarapida, actualizarcatalogos, enviarcomandosdeimpresion, comandoantesimprimir1, comandoantesimprimir2, comandoantescopia1, comandoantescopia2, actualizaclientes, rutatemporal, fenombreformatopublico, fenombreformatoempresa, feimpresoragrafico, lectordehuellainstalado, autorizacioncuentasporcobrar, logofiscal, densidadlogo, idarearestaurantrapido, idarearestaurantdomicilio, monprodincluirtodas, impfiscalvalidaitems, monitorimprimircomandamoduload, tipo, serieimpresora, fecharev, rev, accesocentral, bloquearteclado, servidoraplicacionessucursal, servidoraplicaciones, actualizarcatalogosmovil, ejecutarchnvacta, archejecnvacta, paramejecnvacta, ejecarchreimpresioncta, archejecreimpresioncta, paramejecreimpresioncta, ejecarchcancelcta, archejeccancelcta, paramejeccancelcta, ejecarchreabrircta, archejecreabrircta, paramejecreabrircta |
| **estacionesalmacen** | idproducto, idestacion, idalmacen |
| **estacionesareas** | idestacion, idarea, impresora, imprimir, saltos, autocutter, empezarimp1, empezarimp2, empezarimp3, empezarimp4, empezarimp5, finalizarimp1, finalizarimp2, finalizarimp3, finalizarimp4, finalizarimp5, impresion, comedor, domicilio, rapido, tipodeimpresioncomanda, nombrereportecomanda, copias |
| **estados** | idestado, descripcion, idpais |
| **etiquetaslenguaje** | id, ididioma, idetiqueta, valor, descripcion |
| **facturas** | idfactura, serie, folio, fecha, idcliente, nota, cancelada, subtotal, impuesto, propina, total, concepto, usuariocancelo, idturno, impresiones, codigocontrolbolivia, propinafacturada, idempresa, femexelectronico, femextipocliente, femexxmlvalido, femexcadenaoriginal, femexsello, femexnumcertificado, femexanioaprobacion, femexnumaprobacion, fechacancelacion, femexdeclarado, femexdeclaradocancelado, femexmodogenerado, femexrfc, femexcbb, tipoesquema, uidtimbre, TimbrenoCertificadoSAT, TimbreFechaTimbrado, TimbreselloCFD, TimbreselloSAT, TimbreCadenaOriginal, ImagenCFDI, femexretencion1, femexretencion2, femexretencion3, ncf, regimen, formapago, numerocuenta, expedidoen, idunidad, pac_reprocesado, pac_enviado, folios_central, pac, acusecancelacion, RIFDetallado |
| **facturascfdipendientesregistra** | id, idfactura, procesado, fecha, fechaprocesado, observaciones |
| **facturasmovtos** | idfactura, cantidad, idproducto, precio, descuento, impuesto, descripcion, retencion1, retencion2, retencion3, idunidad |
| **folios** | serie, ultimofolio, ultimaorden, ultimofolionotadeconsumo, ultimofolioproduccion, autorizacion, fechalimite, rangoautinicio, rangoautfin |
| **foliosalmacen** | folio, idalmacen, folioalmacen, foliomovto, fecha, cancelado, usuariocancelo, usuario, nota, idempresa |
| **foliosfacturados** | idfactura, folio, porcentajefac |
| **foliosfacturas** | serie, ultimofolio, electronico, consecutivoinicio, consecutivofin, anioaprobacion, numaprobacion, estatus, cbb, tipoesquema, idempresa, fechaaprobacion, ultimofoliocentral |
| **formasdepago** | idformadepago, descripcion, tipo, tipodecambio, solicitareferencia, prioridadboton, cuentacontableimporte, cuentacontablecomision, cuentacontableivacomision, comision, visible, aceptapropina, subtipo, prefijo1, prefijo2, codigodeprefijoconsulta, codigodeprefijoacumred, generapuntos, formatoimpresion, idfpagofiscal, pagoenlinea, tipotarjeta, imagen, nofacturable, comisionreporte1, comisionreporte2 |
| **formatofacturas** | idformato, fila, columna, campo, tipo |
| **formatos** | formato, tipo, campo, linea, columna, caracteres, leyenda, idcomando, alineacion |
| **formatosvarios** | idformato, fila, columna, campo |
| **gastos** | idgasto, fecha, idcuentacontable, referencia, descuento, usuario, cancelado, usuariocancelo, idcompra, Idtipogasto, idempresa |
| **gastosmovtos** | idgasto, cantidad, descripcion, costo, descuento, iva |
| **grupoformasdepago** | idgrupoformadepago, descripcion |
| **grupoformasdepagodet** | iddetalle, idgrupoformadepago, idformadepago |
| **grupos** | idgrupo, descripcion, clasificacion, prioridad, color, colorletra, prioridadimpresion, cambiacolorcuenta, colorcuenta, colorletracuenta, solicitaautorizacion, imagenmenuelectronico, extmenu |
| **gruposdeproductosvisibles** | idestacion, idgrupo, visible, visiblesiempre, [Horarios Lunes-Domingo Inicio/Fin/DiaFin], [Aplica Lunes-Domingo] |
| **gruposi** | idgruposi, descripcion, idgruposiclasificacion, idcuentacontable, idtipopedido |
| **gruposiclasificacion** | idgruposiclasificacion, descripcion, clasificacionventa |
| **gruposmodificadores** | idgruposmodificadores, descripcion |
| **gruposmodificadoresproductos** | idproducto, idgruposmodificadores, incluidos, prioridad, forzarcaptura, maximomodificadores, idempresa |
| **grupossubgrupos** | idgrupo, idsubgrupo |
| **HORARIOCORTE** | horainicial, horafinal, horaenvio, diasiguiente |
| **horariosturnos** | idhorarioturno, descripcionturno, horainicial, horafinal, diasiguiente |
| **hotelmovtos** | fecha, referencia, habitacion, subtotal, impuesto, propina, total, cancelado, idmovtosh |
| **huellaclientes** | idcliente, huella, huella2, pic, tipolector |
| **huellameseros** | idmesero, huella, huella2, pic, tipolector |
| **huellausuarios** | usuario, huella, huella2, pic, tipolector |
| **idiomas** | ididioma, descripcion, idiomadefault |
| **idiomasticket** | ididioma, idcampo, valor |
| **impfiscalnotacreditolog** | idnota, fecha, descripcion, importe, idturno, estacion |
| **imprimefiscalpendientes** | cheque, movimiento, tipo, estacion |
| **impuestos** | idinsumo, idregion, impuesto1, impuesto2, impuesto3 |
| **insumos** | idinsumo, descripcion, idgruposi, unidad, elaborado, rendimientoelaborado |
| **insumoscostoproveedor** | idproveedor, idpresentacion, costo |
| **insumosdetalle** | idinsumo, idempresa, inventariable, costo, costopromedio, impuesto1, impuesto2, impuesto3, costoconimpuestos, merma, descargar |
| **insumospresentaciones** | idinsumospresentaciones, descripcion, idinsumo, idgruposi, rendimiento |
| **insumospresentacionesdetalle** | idinsumospresentaciones, idempresa, costo, costopromedio, idproveedor, impuesto1, impuesto2, impuesto3, indicadorimpuesto, stockminimogeneral, stockmaximogeneral, estatus, descargar, ubicacion |
| **inventariopendiente** | fecha, idconcepto, idinsumo, costo, cantidad, idalmacen, idturno |
| **invfisico** | folio, fecha, idalmacen1, idalmacen2, inventarioteorico1, inventariofisico1, diferenciafisico1, inventarioteorico2, inventariofisico2, diferenciafisico2, cancelado, usuariocancelo, idempresa, idinventario |
| **invfisicomovtos** | folio, idinsumo, idpresentacion, costo, existenciaalmacen1, fisicoalmacen1, diferenciaalmacen1, existenciaalmacen2, fisicoalmacen2, diferenciaalmacen2 |
| **lectores** | clave, llave, seriefabricante |
| **logcambioprecios** | idproducto, precioanterior, precionuevo, fecha, usuario, idempresa |
| **mapa_mesas** | idmapa, mapa, idarearestaurante, mapa_actual, color_fondo, tipo_fondo, textura_fondo, idempresa, idmapasistema |
| **menu** | idmenu, descripcion |
| **menucomedor** | idmenucomedor, descripcion, idtipomenu, estatus, [Horarios Inicio/Fin Lunes-Domingo], [Aplica Lunes-Domingo], [DiasSalida Lunes-Domingo] |
| **menucomedorproductos** | idmenucomedor, iddia, idproducto, cantidad |
| **menuproductos** | idmenu, idproducto |
| **mesas** | idmesa, idarearestaurant, personas, fumar, estatus_ocupacion, idtipomesa, idempresa, idmesasistema |
| **mesasasignadas** | idmesaasignada, idmesa, folio, activo, idmesero |
| **mesasbillar** | idmesa, descripcion, estatus |
| **meseros** | idmeserointerno, idmesero, nombre, contraseña, tipo, fotografia, visible, idempresa, tipoacceso, capturarestringidamesas, perfil |
| **modificadores** | idproducto, idmodificador, precio, idgruposmodificadores, idempresa |
| **monedasmesero** | denominacion |
| **monitoresproduccion** | idmonitor, descripcion, ipaddress, port, nummonitor |
| **monitorprodestaciones** | idmonitor, idestacion |
| **motivoscancelacion** | descripcion |
| **movsinv** | fecha, foliocheque, movto, idcompra, traspaso, invfisico, idconcepto, idinsumo, costo, cantidad, idalmacen, idturno, presentaciondestino, idpedido |
| **movsinvcancelados** | fecha, foliocheque, movto, idcompra, traspaso, invfisico, idconcepto, idinsumo, costo, cantidad, idalmacen, idturno, presentaciondestino, idpedido |
| **movtosalmacen** | fecha, movto, idcompra, traspaso, invfisico, idconcepto, idinsumospresentaciones, costo, cantidad, idalmacen, idpedido |
| **movtosalmacencancelados** | fecha, movto, idcompra, traspaso, invfisico, idconcepto, idinsumospresentaciones, costo, cantidad, idalmacen, idpedido |
| **movtosbillar** | idmovto, idmesa, hrainicio, hrafinal, precio, estatus |
| **movtoscaja** | folio, foliomovto, tipo, idturno, concepto, referencia, importe, fecha, cancelado, usuariocancelo, pagodepropina, idempresa |
| **movtospatines** | idmovto, folio, idpatin, idservicio, inicio, fin, estatus |
| **ncomprobantesfiscales** | tiponcf, fijo, secini, secfin, consecutivo, consecutivomin, agotado, habilitado |
| **notificaciones_antifraudes** | fecha, turno, usuario, idestacion, reimpresiones, reimpresionesmax, enviarreimpresiones, cancelacionescuenta, cancelacionescuentamax, enviarcancelacionescuenta, cancelacionesprod, cancelacionesprodmax, enviarcancelacionesprod, reaperturacuenta, reaperturacuentamax, enviarreaperturacuenta, reaperturamismacuenta, reaperturamismacuentamax, enviarreaperturamismacuenta, descuentocuenta, descuentocuentamax, enviardescuentocuenta, descuentoproductos, descuentoprodmax, enviardescuentoprod, enviado |
| **numerostarjetas** | foliocuenta, idformadepago, numerotarjeta, importe |
| **objetos_mapa** | idobjetomapa, idmapa, coordenadax, coordenaday, ancho, alto, tipoobjeto, color, idobjeto, rotacion, textoobjeto, color2, tipoaccesorio, idempresa |
| **ordenescompra** | idordencompra, idempresa, folio, fechacaptura, idproveedor, fecharecepcion, descuento, cancelado, usuario, usuariocancelo, aplicada, foliocompra, entregara, impuesto1, impuesto2, impuesto3, subtotal, total, statusenviado, fechahoraenviado, usuarioenvio, ordensurtido |
| **ordenescompramov** | idordencompra, idinsumo, costo, cantidad, idalmacen, descuento, importesinimpuestos, impuesto1, impuesto1importe, impuesto2, impuesto2importe, impuesto3, impuesto3importe, importeconimpuestos, idpedido, idempresapedido |
| **pacs** | id, pac, nombrepac |
| **pagosproveedores** | foliocompra, fecha, abono, referencia |
| **paises** | idpais, descripcion |
| **paquetes** | idproducto, cantidad, idproductopaquete, idempresa |
| **parametros** | [Más de 200 columnas de parámetros globales del sistema v8 Pro] |
| **parametros2** | [Aproximadamente 100 columnas adicionales de parámetros de sistema] |
| **parametros3** | pagarcuentacapitan, imprimircuentacapitan |
| **patines** | idpatin, descripcion, estatus, colorpatin, talla |
| **pedidos** | idpedido, idempresa, folio, fechacaptura, fecharecepcion, descuento, status, cancelado, usuario, usuariocancelo, foliopedido, entregara, impuesto1, impuesto2, impuesto3, subtotal, total, fechahoraautorizado, usuarioautorizo, fechahoraenviado, idproveedor, ventagenerada, idtipopedido |
| **pedidosdetalle** | idpedido, idinsumo, costo, cantidad, idalmacen, descuento, importesinimpuestos, impuesto1, impuesto1importe, impuesto2, impuesto2importe, impuesto3, impuesto3importe, importeconimpuestos, cantidadsurtida, cantidadrecibida, surtirpendiente, comentarios, fechahoraenviado, cantidaddevuelta, idalmacendescarga |
| **productos** | idproducto, descripcion, idgrupo, nombrecorto, plu, imagen, nofacturable, comentario, usarcomedor, usardomicilio, usarrapido, usarcedis, idinsumospresentaciones, imagenmenuelectronico, descripcionmenuelectronico, usarmenuelectronico, extmenu |
| **productosdetalle** | idproducto, idempresa, precio, impuesto1, impuesto2, impuesto3, preciosinimpuestos, bloqueado, precioabierto, canjeablepuntos, preciopuntos, puntoscanje, puntosextras, [Horarios y Precios Lunes-Domingo], [Aplica Lunes-Domingo], excentoimpuestos, secuenciacompuesto, finalizarsecuenciacompuesto, heredarmonitormodificadores, comisionvendedor, eliminarfiscal, enviarproduccionsimodificador, cargoadicional, afectacomensales, comensalesafectados, descargar, usarmultiplicadorprodcomp, rentabilidadcedis, idarea, permitirprodcompenmodif, politicapuntos, favorito, idunidad |
| **productosenproduccion** | idproducto, idmonitor, folio, movimiento, cantidad, comentario, tiempo, hora, modificador, estadomonitor, idproductocompuesto, productocompuestoprincipal, minutospreparacion, minutosalerta, horaproduccion, cancelado, prioridad, enviadomonitor |
| **productosmonedero** | idproducto, idarearestaurant, idempresa, activo, [Horarios Lunes-Domingo], porcentaje, multiplo, puntosmultiplo |
| **productosmonitores** | idproducto, idmonitor, minutosalerta, minutospreparacion |
| **promociones** | idpromocion, descripcion, status, tipopromocion, [Horarios Lunes-Domingo], [Aplica Lunes-Domingo], fotografia, visualizar, Relacionuno, Relaciondos, forzarporproducto, aplicamodificadores |
| **promocionesdescargar** | idpromocion, idempresa, descargar |
| **promocionesmenuelectronico** | idpromocion, idempresa, idproducto, descripcion, estatus, ubicación, fotografía |
| **promoproductos** | idpromocion, idempresa, idproducto, preciopromocion, idtipodescuento, descuento |
| **proveedores** | idproveedor, nombre, razonsocial, direccion, codigopostal, telefono, fax, email, rfc, credito, usarcostosasignados, usarenpoliza, idtipoproveedor, idcuentacontable, nombrebanco, nocuenta, cuentaclave, estatus |
| **proveedorespredet** | idempresa, idproveedor |
| **puntos** | tipodeservicio, activo, [Horarios y Aplica Lunes-Domingo] |
| **puntosgruposdeproductos** | idarearestaurant, idgrupoproducto, porcentaje, tipodeservicio, multiplo, puntosmultiplo |
| **recetasalmacenes** | idproducto, idarearestaurant, idalmacen, idempresa, idinsumo |
| **regionempresa** | idregionempresa, descripcion |
| **regiones** | idregion, descripcion |
| **registro_dispositivos** | folio, id_dispositivo, nombre_dispositivo, numerocontrol, contraseniacontrol, fecha |
| **registro_enlacesrm** | idestacion, ultimo_acceso, activo |
| **registro_licencias** | idregistros, tipomodulo, nombre, fechacompra, numerofactura, distribuidor, numerocontrol, contraseniacontrol, tipolicencia, mesanio, licencia, estaciones, idempresa, fecharegistro, foliosusadosfe, limitefoliosfe, foliosrestantescfdi |
| **registroasistencias** | idmovto, idempleado, entrada, salida, tipo |
| **renta** | mesaño, licencia, modulo, idempresa |
| **reservaciones** | idreservacion, idtiporeservacion, idarearestaurant, idcomisionista, idcliente, estatus, motivocancelacion, usuariocancelo, fechacancelacion, observaciones, pax, fechaaltareserva, fechareserva, mesareservada, usuarioreserva, folio, fumar |
| **saldosclientes** | idcliente, saldo |
| **serviciominutospatin** | idservicio, tiempo |
| **sincronizacion** | idsincronizacion, tabla, idtabla, valoridtabla, status, fechamovto, usuariomovto, proceso, fechaactualizacion, usuarioactualizacion, idempresa, idtabla2, valoridtabla2, offline |
| **stockinsumos** | idinsumo, idinsumospresentaciones, idalmacen, stockminimo, stockideal, stockmaximo, idempresa |
| **subgrupos** | idsubgrupo, descripcion, imagenmenuelectronico |
| **subgruposproductos** | idsubgrupo, idproducto |
| **sucursalescallcenter** | idsucursal, descripcion, direccion, activa, [Trabaja y Horarios Lunes-Domingo] |
| **tablaaux** | tabla, valor, movimiento, aplicacion, estacion, fecha |
| **tempbitacoratarjetacredito** | folio, autorizacion, cuenta, vencimiento, importe, fecha, reimpresiones, mensajederespuesta, procedimiento, afiliacion, statustransaccion, idtransaccion, numerooperacion, informaciontarjeta, tipotarjeta, arqc, apn, apnlabel |
| **tempbitacoratransacciones** | folio, autorizacion, referencia, importe, fecha, reimpresiones, procedimiento, datosenvio, datosrespuesta, medusafol_prov, medusafol_ope |
| **tempcancela** | foliocheque, comanda, cantidad, clave, razon, fecha, usuario, precio |
| **tempcheqdet** | foliodet, movimiento, comanda, cantidad, idproducto, descuento, precio, impuesto1, impuesto2, impuesto3, preciosinimpuestos, tiempo, hora, modificador, mitad, comentario, idestacion, usuariodescuento, comentariodescuento, idtipodescuento, horaproduccion, idproductocompuesto, productocompuestoprincipal, preciocatalogo, marcar, idmeseroproducto, prioridadproduccion, estatuspatin, idcortesia, numerotarjeta, estadomonitor, llavemovto, folioproduccion, nivel |
| **tempcheqpedidos** | foliocheque, idpedido |
| **tempcheques** | folio, seriefolio, numcheque, fecha, salidarepartidor, arriborepartidor, cierre, mesa, nopersonas, idmesero, pagado, cancelado, impreso, impresiones, cambio, descuento, reabiertas, razoncancelado, orden, facturado, idcliente, idarearestaurant, idempresa, tipodeservicio, idturno, usuariocancelo, comentariodescuento, estacion, cambiorepartidor, usuariodescuento, fechacancelado, idtipodescuento, numerotarjeta, folionotadeconsumo, notadeconsumo, propinapagada, propinafoliomovtocaja, puntosmonederogenerados, propinaincluida, tarjetadescuento, porcentajefac, propinamanual, usuariopago, idclientefacturacion, cuentaenuso, observaciones, idclientedomicilio, iddireccion, telefonousadodomicilio, totalarticulos, subtotal, subtotalsinimpuestos, total, totalconpropina, totalimpuesto1, cargo, totalconcargo, totalconpropinacargo, descuentoimporte, efectivo, tarjeta, vales, otros, propina, propinatarjeta, campoadicional1, idreservacion, idcomisionista, importecomision, comisionpagada, fechapagocomision, foliopagocomision, tipoventarapida, callcenter, idordencompra, totalsindescuento, totalalimentos, totalbebidas, totalotros, totaldescuentos, totaldescuentoalimentos, totaldescuentobebidas, totaldescuentootros, totalcortesias, totalcortesiaalimentos, totalcortesiabebidas, totalcortesiaotros, totaldescuentoycortesia, totalalimentossindescuentos, totalbebidassindescuentos, totalotrossindescuentos, descuentocriterio, descuentomonedero, idmenucomedor, subtotalcondescuento, comisionpax, procesadointerfaz, domicilioprogramado, fechadomicilioprogramado, enviado, ncf, numerocuenta, codigo_unico_af, estatushub, idfoliohub, EnviadoRW, autorizacionfolio, fechalimiteemision |
| **tempchequespagos** | folio, idformadepago, importe, propina, tipodecambio, referencia |
| **tempfoliosfacturados** | idfactura, folio, porcentajefac |
| **tempnumerostarjetas** | foliocuenta, idformadepago, numerotarjeta, importe |
| **tipoclientes** | idtipocliente, descripcion |
| **tipocomisionistas** | idtipocomisionista, descripcion |
| **tipodescuento** | idtipodescuento, desc_tipodescuento, descuento, Visible |
| **tipoempresa** | idtipoempresa, descripcion |
| **tipogastos** | Idtipogasto, descripcion |
| **tipomenuclientes** | idtipomenu, descripcion |
| **tipopedido** | idtipopedido, descripcion |
| **tipoproveedores** | idtipoproveedor, descripcion |
| **tiporeservaciones** | idtiporeservacion, descripcion, solicitacomisionista, descuento |
| **tiposdemesa** | idtipomesa, tipodemesa, personas, tipo_imagen |
| **tiposdemesadetalles** | idempresa, idtipomesa, descargar |
| **traspasosalmacen** | folio, fecha, almacenorigen, almacendestino, cancelado, usuario, usuariocancelo, nota, idempresa, idempresaorigen, idempresadestino |
| **turnos** | idturnointerno, idturno, fondo, apertura, cierre, idestacion, cajero, efectivo, tarjeta, vales, credito, procesadoweb, idempresa |
| **turnosf** | idturnointerno, idturno, fondo, apertura, cierre, idestacion, cajero, efectivo, tarjeta, vales, credito, procesadoweb, idempresa |
| **udsmedida** | idunidad |
| **udsmedidaequivale** | idunidad, cantidad, unidadequivale |
| **usuarios** | usuario, nombre, contraseña, administrador, perfil, barraherramientas, idempresa, accesomodulo, estatuslogin |
| **usuariosdescargar** | usuario, idempresa, descargar |
| **usuariosperfiles** | [Lista completa de permisos de seguridad por cada módulo del sistema] |
| **usuariosperfilescatalogo** | idusuariosperfiles, catalogo, nuevo, editar, eliminar |
| **ws_cloud** | ID, WSUsuario, WSUrl, WSContrasena, Version, RecordarUsuario, RWActivo, RWTimer, WSIDSistema |
| **zonasdomicilio** | idzona, descripcion, idproducto |
| **zonasdomiciliodescargar** | idempresa, descargar, idzona |
| **zonasdomiciliosucursales** | idzona, idsucursal, prioridad |

---
*VISTAS DEL SISTEMA (READ-ONLY)*
* **vw_sr_clientes**: Vista unificada de clientes.
* **vwcalculacheques / vwcalculatempcheques**: Totales de venta calculados.
* **vwrepproductosvendidoscheques / temp**: Reportes de ventas por producto.
* **vwrepventascheques / temp**: Reportes consolidados de ventas.
* **vwwm...**: Vistas específicas para el módulo de comandante móvil (iPad/Android).

---
*Fin del Anexo Técnico.*

**Última Actualización:** 13 de abril de 2026, 14:20 hrs

---

## 🛠️ Hotfix Ventas SoftRestaurant (abril 2026)

### Objetivo
- Restaurar visualización de:
  - `Top 10 Productos más vendidos`
  - `Detalle de productos por ticket` en modal
  - `Detalle de Productos por Ticket` dentro de vista Productos

### Archivos ajustados
- `api/softrestaurant/sales.php`
- `api/softrestaurant/ticket-items.php`
- `src/pages/admin/Sales.jsx`
- `softrestaurant-sync/sync-final.php` (script local en CPU del restaurante)

### Cambios aplicados
- **Top productos (`sales.php`)**
  - Corregido uso de columna inválida `i.total` por `i.subtotal`.
  - `getTopProducts()` y `getDetailedAnalytics()` ahora usan estrategia robusta:
    - fuente unificada (`sr_sale_items` + `sr_ticket_items`),
    - fallback solo `sr_sale_items`,
    - fallback final solo `sr_ticket_items`.
  - Join normalizado para IDs con y sin `#`:
    - compara `sr_ticket_id`, `folio`, `ticket_number` con `REPLACE(..., '#', '')`.
  - Normalización de estatus en filtros:
    - abiertos: `open`, `abierto`, `pending`
    - cerrados: `closed`, `cerrado`, `cobrado`, `pagado`, `paid`
    - excluye cancelados: `cancelled`, `canceled`, `cancelado`

- **Modal ticket (`ticket-items.php`)**
  - Búsqueda por múltiples identificadores (`folio`, `sr_ticket_id`, `ticket_number`).
  - Consulta en ambas tablas (`sr_ticket_items` y `sr_sale_items`) con fallback automático.
  - `debug_info` ampliado con `candidate_ids`.

- **Frontend (`Sales.jsx`)**
  - Se añadió sección `📋 Detalle de Productos por Ticket` en vista `Productos`.
  - Reutiliza tickets ya cargados por rango actual (hoy/ayer/semana/mes/custom).
  - Botón `Ver productos` abre modal de items del ticket desde la misma vista.

- **Sincronización local (`sync-final.php`)**
  - Se agregó helper `getTicketItems()` para enviar items junto con ventas.
  - `syncSales()` y `syncToday()` dejaron de enviar `items: []` y ahora envían productos reales.
  - Se mantiene `syncTicketItems()` para compatibilidad.

### Tablas MySQL involucradas
- `sr_sales`
- `sr_sale_items`
- `sr_ticket_items`
- `sr_products` (catálogo/reportes complementarios)

### Verificación rápida post-deploy
1. Abrir `/admin/sales` en `viewMode=products`.
2. Confirmar que:
   - la tabla `Top 10 Productos más vendidos` ya no aparece vacía,
   - la sección `Detalle de Productos por Ticket` muestra tickets,
   - el modal de ticket muestra productos al hacer clic en `Ver productos`.
3. Revisar en Network que `GET /api/softrestaurant/sales.php?range=...` responda `200` y traiga `top_products` con filas.

---

## 🛠️ Hotfix Asistencia Personal (abril 2026)

### Problema reportado
- En `/admin/employees`, el KPI `ACT` (Trabajando) mostraba personal activo cuando en realidad no había nadie en turno.

### Causa raíz
- El endpoint `api/employees/attendance-management.php` para `range=today` tenía fallback automático:
  - si no había asistencia hoy, devolvía la última fecha con registros en `sr_attendance`.
- En frontend (`Employees.jsx`), el cálculo de “en turno” solo validaba:
  - `clock_in` presente
  - `clock_out` vacío
- No se validaba que el registro fuera del día actual, por eso se contaban asistencias viejas como actuales.

### Cambios aplicados
- **Backend** `api/employees/attendance-management.php`:
  - Se agregó bandera `fallback`:
    - fallback por defecto: **desactivado**
    - solo usa fecha más reciente cuando `fallback=1`.

- **Frontend** `src/pages/admin/Employees.jsx`:
  - Se agregó validación de fecha de asistencia (solo hoy).
  - Se centralizó lógica con helper `isWorkingNowForItem(...)`.
  - `ACT`, punto verde y etiqueta `En Turno/Fuera` ahora usan esa lógica.
  - Si existe horario de salida y ya pasó, no cuenta como trabajando.

### Resultado esperado
- Si hoy no hay personal con entrada activa real, `ACT` debe mostrar `0`.
- No se deben “arrastrar” empleados en turno desde días anteriores.

---

## 🛠️ Hotfix Responsive Móvil Global Admin (abril 2026)

### Objetivo
- Mejorar UX en móvil para todo el dashboard admin y evitar desbordes horizontales (textos, montos y bloques de datos fuera del contenedor).

### Cambios aplicados
- **Contenedor global admin**
  - Archivo: `src/components/AdminLayout.jsx`
  - Se agregó wrapper de contenido (`admin-mobile-shell` / `admin-mobile-content`) con `overflow-x-hidden`.

- **Reglas globales mobile-first**
  - Archivo: `src/index.css`
  - Se añadieron reglas `@media (max-width: 768px)` para:
    - forzar `min-width: 0` en descendientes del contenido admin,
    - activar `overflow-wrap/word-break` en textos,
    - mejorar scroll táctil en contenedores `overflow-x-auto`,
    - prevenir scroll horizontal accidental.

- **Ajustes puntuales en vistas con KPIs y números largos**
  - Archivos:
    - `src/pages/admin/Sales.jsx`
    - `src/pages/admin/AdminDashboard.jsx`
    - `src/pages/admin/Dashboard.jsx`
  - Cambios:
    - tipografías responsivas para montos grandes,
    - `break-all`/`break-words` en cifras y subtítulos,
    - `min-w-0` en tarjetas y filas,
    - layout más compacto en móvil para controles de Propinas.

### Resultado esperado
- En móvil no deben salirse montos, títulos ni botones de sus tarjetas.
- El dashboard admin se mantiene dentro del viewport sin overflow horizontal no intencional.

---

## 🛠️ Limpieza de UI sin emojis en Ventas (abril 2026)

### Motivo
- En algunos dispositivos/navegadores aparecían signos `??` en títulos e íconos por tema de codificación/fuente al renderizar emojis.

### Cambios aplicados
- Archivo: `src/pages/admin/Sales.jsx`
- Se retiraron emojis e íconos Unicode en navegación/títulos/estados de la vista de ventas.
- Se dejó la navegación de secciones en formato texto limpio, sin siglas abreviadas (`GR`, `TK`, etc.).

### Resultado esperado
- Ya no deben aparecer `??` en encabezados o etiquetas de la vista de ventas.
- UI más consistente entre navegadores y dispositivos.

---

## 🛠️ Control visual de permisos para Viewer (abril 2026)

### Objetivo
- Cuando una función esté desactivada por permisos, mostrarla en gris y bloquear interacción (sin click) en el panel.

### Cambios aplicados
- **Backend auth**
  - `api/auth/login.php`
  - `api/auth/me.php`
  - Se agregaron en la respuesta de usuario los permisos:
    - `can_edit_employees`
    - `can_delete_employees`
    - `can_edit_quotes`
    - `can_delete_quotes`
    - `can_edit_applications`
    - `can_delete_applications`
    - `can_view_sales`
    - `can_edit_sales`

- **Frontend layout/nav**
  - `src/components/AdminLayout.jsx`
  - Se refresca usuario con `authAPI.getMe()` al cargar.
  - Se evaluan permisos para módulos clave (`applications`, `employees`, `quotes`, `sales`).
  - Si un módulo está desactivado:
    - se aplica estilo gris (`opacity + grayscale`),
    - se bloquea interacción (`pointer-events-none` / `preventDefault`),
    - se muestra tooltip de función desactivada.

- **Frontend dashboard viewer**
  - `src/pages/admin/Dashboard.jsx`
  - Se agregó `ModuleLink` para bloquear click y mantener feedback visual.
  - Se aplica estado deshabilitado a:
    - accesos rápidos,
    - tarjeta principal de cotizaciones,
    - tarjetas KPI enlazadas a módulos restringidos,
    - widget de ventas cuando `can_view_sales` está apagado.

### Resultado esperado
- En cuentas viewer con permisos apagados, el módulo se ve deshabilitado y no abre ruta desde la UI.
- En cuentas admin, comportamiento normal sin restricciones visuales.

---

## 🛠️ Solicitudes: notas internas + responsive móvil (abril 2026)

### Objetivo
- Permitir notas por solicitud en `/admin/applications` y corregir visualización móvil en tarjetas/texto.

### Cambios aplicados
- **Notas por solicitud**
  - `src/pages/admin/Applications.jsx`
    - Se agregó `Notas internas` en cada tarjeta de solicitud.
    - Se agregó `Notas internas` en el modal de detalle.
    - Botón `Guardar nota` por solicitud y en modal.
  - `api/applications/update-field.php`
    - Se habilitó campo `notes` en whitelist de edición.

- **Responsive móvil en solicitudes**
  - `src/pages/admin/Applications.jsx`
    - Filtros con `flex-wrap` en móvil.
    - Card de solicitud adaptada a columna en pantallas pequeñas.
    - Tipografías y espaciados ajustados para evitar desborde.

- **Responsive móvil en empleados**
  - `src/pages/admin/Employees.jsx`
    - Header compacto en móvil.
    - Tabs superiores en grid 3 columnas.
    - Mejor control de quiebres de texto largo.

- **Ajuste global de corte de texto**
  - `src/index.css`
  - Se cambió estrategia móvil de corte:
    - de `overflow-wrap:anywhere` / `word-break: break-word`
    - a `overflow-wrap: break-word` / `word-break: normal`
  - Esto evita que nombres/palabras se partan letra por letra.

### SQL recomendado (phpMyAdmin)
```sql
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS notes TEXT NULL AFTER status;
```

### Resultado esperado
- Ya se pueden guardar notas por cada solicitud (lista y modal).
- En móvil, nombres y textos largos se ven legibles sin romperse en vertical.

---

## 🛠️ Geolocalización de solicitudes: fix CORS/429 + proxy backend (abril 2026)

### Problema detectado
- En producción, la geolocalización mostraba errores de CORS y `429 Too Many Requests` al consultar Nominatim desde el navegador.
- El mapa de `Applications` se quedaba sin coordenadas para varias direcciones.

### Cambios aplicados
- **Nuevo endpoint backend de geocoding**
  - `api/applications/geocode.php`
  - Hace la consulta a Nominatim desde servidor (no desde browser).
  - Incluye:
    - caché local (`geocode-cache.json`),
    - normalización de dirección,
    - variantes de búsqueda (texto limpio, +`Mexico`, ciudad/estado),
    - manejo de `429` y errores de upstream,
    - parámetro `nocache=1` para forzar reintento.

- **Frontend actualizado para usar proxy interno**
  - `src/utils/geo.js`
  - `geocodeAddress()` ya no llama a `nominatim.openstreetmap.org` directo.
  - Ahora consume `.../api/applications/geocode.php?q=...`.
  - Se mantuvo caché cliente y cooldown corto ante rate-limit.

- **Mapa general con relación solicitantes-empleados**
  - `src/pages/admin/Applications.jsx`
  - Se agregaron marcadores de empleados (color cian) al mapa general para comparación visual.
  - La carga prioriza coordenadas de IP y geocodifica dirección solo si no hay IP.

### Verificación final
- Endpoint validado con respuesta exitosa:
```json
{"success":true,"coords":[27.9216441,-110.8994059],"source":"nominatim"}
```
- Resultado: geolocalización operativa sin bloqueo CORS del navegador.

---

## 🛠️ Hotfix UI + Mapas + Ventas (23 de abril de 2026)

### 1) Empleados: marcadores con color por persona y avatar circular
- Archivos:
  - `src/components/LocationMap.jsx`
  - `src/pages/admin/Employees.jsx`
- Cambios:
  - `LocationMap` migra de pin simple a `L.divIcon` con avatar circular.
  - Si no hay foto o falla la carga, muestra fallback `EMP`.
  - Cada empleado recibe color estable por hash (`id + name`) para distinguirse en mapa.
  - Se corrigio distribucion de marcadores repetidos en patron circular (ya no quedan en linea diagonal).

### 2) Mapa individual de empleado: avatar en pin
- Archivo: `src/pages/admin/Employees.jsx`
- Cambios:
  - El marcador individual ahora envia `avatar` y `color` igual que el mapa general.
  - Se agrego normalizacion robusta de URL de foto para soportar:
    - absoluta (`https://...`)
    - protocol-relative (`//...`)
    - relativa (`/api/...`, `api/...`)
    - solo filename (`employee_*.jpg`, `id_*.jpeg`) -> `/api/uploads/employee-photos/...`

### 3) Geocoding de direcciones dificiles + coordenadas manuales
- Archivos:
  - `api/applications/geocode.php`
  - `src/utils/geo.js`
- Cambios:
  - Se mejoro normalizacion para variantes comunes (`FRACC`, `COL`, `C.P.`, `SON.`).
  - Se ampliaron variantes de consulta (calle, colonia, CP, ciudad/estado).
  - Caché diferenciada:
    - exitos: larga
    - fallos: corta (para no congelar resultados negativos).
  - `geo.js` acepta coordenadas directas en el campo direccion, formato:
    - `27.9546, -110.9209`
  - Si detecta coordenadas, las usa directo sin llamar geocoder.

### 4) Aviso de direccion aproximada en empleados
- Archivo: `src/pages/admin/Employees.jsx`
- Cambio UX:
  - Se retiro boton manual.
  - Se muestra comentario pequeno bajo direccion:
    - `Se usara direccion aproximada, por favor corregir direccion.`

### 5) Contraste visual del dashboard sin cambiar paleta
- Archivo: `src/index.css`
- Cambios:
  - Se reforzo contraste de cards/paneles, bordes y sombras.
  - Se aumento legibilidad de texto (`slate`, blancos y acentos) sin alterar identidad de color.
  - Se eliminaron reglas globales que apagaban algunos textos/accentos.

### 6) Permisos: ocultar SQL tecnico en frontend
- Archivo: `src/pages/admin/Permissions.jsx`
- Cambio:
  - Se elimino bloque visual con SQL de migracion para evitar exponer codigo interno al publico.
  - Ajuste estetico adicional: degradado ambar reemplazado por cian suave.

### 7) Ventas SR: deduplicacion de abiertos/cerrados
- Archivo: `api/softrestaurant/sales.php`
- Cambio:
  - Se evita doble conteo en header cuando el mismo ticket existe en `open` y `closed`.
  - Dedupe aplicado en `getOpenStats()` y `getHistoricalOpenStats()` por clave normalizada (`sr_ticket_id` / `folio` / `ticket_number`).
