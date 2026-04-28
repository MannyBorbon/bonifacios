# System Architecture

## Resumen

Plataforma web administrativa/publica para Bonifacio's con frontend React (Vite), API PHP en hosting compartido y sincronizacion externa desde SoftRestaurant.

## Componentes

- Frontend: `src/` (React + Vite).
- API PHP: `api/` (modulos de auth, ventas, tracking, empleados, cotizaciones, etc.).
- Sync externo SR: scripts en entorno local del restaurante (`softrestaurant-sync/`).
- DB principal (hosting): MySQL (phpMyAdmin).
- Fuente de POS: SQL Server local de SoftRestaurant (solo via sincronizador).

## Flujos principales

### 1. Ventas

1. SoftRestaurant (SQL Server local) -> script sync local.
2. Script sync -> POST a `api/sales/sync.php` (con API key).
3. API guarda en tablas transaccionales y agregadas.
4. Dashboard consume API de ventas:
   - `api/sales/summary.php`
   - `api/softrestaurant/sales.php`
   - `api/softrestaurant/cash-movements.php`

### 2. Asistencia de empleados

1. Datos base de asistencia en `sr_attendance`.
2. Enriquecimiento con:
   - `employee_schedules`
   - `employee_payroll`
   - `employee_day_notes`
3. Endpoint principal:
   - `api/employees/attendance-management.php`
4. Reglas operativas de horario:
   - `day_type = laboral|descanso|enfermedad`.
   - Si `laboral`, se requiere `scheduled_start/scheduled_end`.
   - Si `descanso/enfermedad`, no se registran horas para ese dia.

### 2.1 Estado laboral de empleado

- Campo de estado en `employee_files.status` con estados operativos:
  - `active`, `vacaciones`, `eventual`, `inactive`.
- Uso en UI:
  - Filtrado y visibilidad en `src/pages/admin/Employees.jsx`.

### 3. Tracking de uso interno

1. Frontend registra sesion, pagina, clicks:
   - `api/tracking/session/start.php`
   - `api/tracking/page-view.php`
   - `api/tracking/click.php`
   - `api/tracking/session/end.php`
2. Dashboard de tracking consolida en `/admin/tracking`.
3. Cierre robusto de sesion:
   - `pagehide` + `beforeunload` + heartbeat.
   - Auto-cierre de sesiones fantasma por inactividad > 3 min en `api/tracking/session/activity.php`.

### 4. Reservaciones por eventos especiales

1. Reservaciones en `special_reservations` con `event_type_id` (opcional).
2. Catalogo de eventos especiales en `reservation_event_types`.
3. Endpoints:
   - `api/reservations/event-types.php`
   - `api/reservations/list.php` (filtro por `event_type_id`)
   - `api/reservations/occupied-tables.php` (ocupacion por fecha/hora y evento)

## Riesgos conocidos

- Arquitectura hibrida (Vite + PHP + restos Node) incrementa complejidad operativa.
- Documentacion historica extensa y mezclada puede generar contradicciones si no se usa esta carpeta como fuente activa.

## Regla de mantenimiento

- Toda decision nueva de arquitectura se documenta aqui.
- Si un hotfix cambia comportamiento de negocio, se refleja aqui y en `ERROR-FIXES-LOG.md`.
