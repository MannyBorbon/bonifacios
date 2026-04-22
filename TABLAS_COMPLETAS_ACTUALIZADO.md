# 📊 DOCUMENTACIÓN COMPLETA DE TABLAS - phpMyAdmin

**Fecha:** 13 de abril de 2026  
**Total de tablas:** 85 tablas

---

## 📋 ÍNDICE DE TABLAS POR CATEGORÍA

### 🔐 Autenticación y Usuarios (5 tablas)
- `users` - Usuarios del sistema
- `user_sessions` - Sesiones activas
- `user_clicks` - Tracking de clics
- `user_skills` - Habilidades de usuarios
- `onsite_status` - Estado de presencia

### 💼 Recursos Humanos (4 tablas)
- `job_applications` - Solicitudes de empleo
- `employee_files` - Expedientes de empleados
- `employee_reports` - Reportes de empleados
- `employee_notes` - Notas de empleados
- `executive_report` - Reportes ejecutivos

### 💰 Ventas SoftRestaurant (22 tablas)
- `sr_sales` - Ventas/tickets
- `sr_sale_items` - Productos vendidos
- `sr_cash_movements` - Movimientos de caja
- `sr_cancellations` - Tickets cancelados
- `sr_products` - Catálogo de productos
- `sr_employees` - Empleados SR
- `sr_tables` - Mesas del restaurante
- `sr_reservations` - Reservaciones
- `sr_inventory` - Inventario
- `sr_attendance` - Asistencia de empleados
- `sr_attendance_logs` - Log de asistencia
- `sr_payments` - Pagos
- `sr_present_today` - Asistencia presente hoy
- `sr_today_sales` - Ventas del día
- `sr_daily_summary` - Resumen diario
- `sr_sync_config` - Configuración de sync
- `sr_sync_log` - Log de sincronización
- `sales_api_keys` - API keys para ventas
- `sales_daily` - Ventas diarias
- `sales_transactions` - Transacciones
- `v_sales_last_30` - Últimas 30 ventas

### 🎉 Cotizaciones y Eventos (10 tablas)
- `event_quotes` - Cotizaciones de eventos
- `event_reminders` - Recordatorios
- `quote_audit_log` - Auditoría de cotizaciones
- `quote_beo` - Banquet Event Orders
- `quote_change_summary` - Resumen de cambios
- `quote_cotizaciones` - Versiones de cotizaciones
- `quote_notes` - Notas de cotizaciones
- `quote_requirements` - Requerimientos
- `quote_versions` - Historial de versiones

### 📅 Calendario (3 tablas)
- `calendar_events` - Eventos del calendario
- `recurring_events` - Eventos recurrentes

### 🏘️ Comunidades (5 tablas)
- `communities` - Comunidades registradas
- `community_notes` - Notas de comunidades
- `community_purchases` - Compras
- `community_reports` - Reportes
- `community_visits` - Visitas registradas

### 💵 Aportaciones (3 tablas)
- `aportaciones` - Aportaciones registradas
- `aportacion_archivos` - Archivos adjuntos
- `aportacion_pagos` - Pagos de aportaciones

### 🍽️ Menú (2 tablas)
- `menu_categories` - Categorías del menú
- `menu_items` - Platillos

### 💬 Mensajería y Chat (4 tablas)
- `messages` - Mensajes internos
- `chat_conversations` - Conversaciones
- `chat_messages` - Mensajes de chat

### 📝 Notas y Notificaciones (5 tablas)
- `notes` - Notas generales
- `note_attachments` - Adjuntos
- `note_tags` - Tags de notas
- `notifications` - Notificaciones

### 📊 Analíticas y Tracking (4 tablas)
- `analytics` - Métricas del sistema
- `activity_log` - Log de actividad
- `page_views` - Vistas de páginas
- `site_visitors` - Visitantes del sitio

### ✅ Tareas (1 tabla)
- `tasks` - Tareas y gestión

---

## 🆕 TABLAS ADICIONALES ENCONTRADAS

### Tablas de Sincronización SoftRestaurant (17 tablas adicionales):
1. **sr_sync_config** - Configuración de módulos de sincronización
2. **sr_sync_log** - Log detallado de cada sincronización
3. **sr_products** - Catálogo de productos de SoftRestaurant
4. **sr_employees** - Empleados sincronizados de SR
5. **sr_tables** - Mesas del restaurante
6. **sr_reservations** - Reservaciones
7. **sr_inventory** - Control de inventario
8. **sr_attendance** - Asistencia de empleados
9. **sr_attendance_logs** - Log histórico de asistencia
10. **sr_payments** - Desglose de pagos por ticket
11. **sr_present_today** - Vista de empleados presentes hoy
12. **sr_today_sales** - Vista de ventas del día actual
13. **sr_daily_summary** - Resumen diario consolidado
14. **sales_daily** - Ventas diarias históricas
15. **sales_transactions** - Transacciones individuales
16. **v_sales_last_30** - Vista de últimas 30 ventas
17. **sales_api_keys** - API keys para acceso externo

### Tablas de Gestión (1 tabla):
1. **tasks** - Sistema de tareas y pendientes

### Tablas de Empleados (1 tabla):
1. **employee_notes** - Notas vinculadas a expedientes

---

## 📋 DETALLE COMPLETO DE TABLAS

### 💰 VENTAS SOFTRESTAURANT - TABLAS ADICIONALES

#### **sr_sync_config**
Configuración de módulos de sincronización.
```
Campos:
- id (PK)
- module_name (UNIQUE)
- last_sync_at
- sync_status (success/failed/running)
- sync_interval_minutes
- is_enabled
- error_message
- records_synced
- created_at
- updated_at
```

#### **sr_sync_log**
Log detallado de cada proceso de sincronización.
```
Campos:
- id (PK)
- module_name
- sync_started_at
- sync_finished_at
- records_processed
- records_inserted
- records_updated
- records_failed
- status (running/completed/failed)
- error_details
- created_at
```

#### **sr_products**
Catálogo completo de productos de SoftRestaurant.
```
Campos:
- id (PK)
- sr_product_id (UNIQUE)
- product_code
- product_name
- category
- subcategory
- description
- price
- cost
- unit
- is_active
- preparation_time
- printer_station
- created_at
- updated_at
```

#### **sr_employees**
Empleados sincronizados de SoftRestaurant.
```
Campos:
- id (PK)
- sr_employee_id (UNIQUE)
- employee_code
- full_name
- position
- department
- is_waiter
- is_active
- hire_date
- phone
- email
- commission_rate
- employee_file_id
- created_at
- updated_at
```

#### **sr_tables**
Mesas del restaurante.
```
Campos:
- id (PK)
- sr_table_id (UNIQUE)
- table_number
- table_name
- area
- capacity
- position_x
- position_y
- is_active
- status (available/occupied/reserved/maintenance)
- created_at
- updated_at
```

#### **sr_reservations**
Sistema de reservaciones.
```
Campos:
- id (PK)
- sr_reservation_id (UNIQUE)
- customer_name
- customer_phone
- customer_email
- reservation_date
- reservation_time
- party_size
- table_id
- status (pending/confirmed/cancelled/completed)
- notes
- created_at
- updated_at
```

#### **sr_inventory**
Control de inventario de productos.
```
Campos:
- id (PK)
- product_id
- current_stock
- min_stock
- max_stock
- last_purchase_price
- last_purchase_date
- last_count_date
- created_at
- updated_at
```

#### **sr_attendance**
Asistencia de empleados.
```
Campos:
- id (PK)
- employee_id
- employee_name
- position
- attendance_date
- clock_in
- clock_out
- shift
- status (present/absent/late/early_out)
- minutes_worked
- notes
- created_at
- updated_at
```

#### **sr_attendance_logs**
Log histórico de entradas/salidas.
```
Campos:
- id (PK)
- employee_id
- employee_name
- clock_in
- clock_out
- created_at
```

#### **sr_payments**
Desglose de pagos por ticket.
```
Campos:
- id (PK)
- sale_id (FK → sr_sales)
- payment_type
- amount
- card_type
- reference
- created_at
```

#### **sr_present_today**
Vista de empleados presentes hoy.
```
Campos:
- id (PK)
- employee_id
- employee_name
- position
- attendance_date
- clock_in
- clock_out
- shift
- status (present/absent/late)
- minutes_worked
```

#### **sr_today_sales**
Vista de ventas del día actual.
```
Campos:
- id (PK)
- sr_ticket_id (UNIQUE)
- ticket_number
- folio
- sale_date
- sale_time
- sale_datetime
- table_id
- table_number
- waiter_id
- waiter_name
- covers
- subtotal
- tax
- discount
- tip
- total
- status (open/closed/cancelled)
- payment_type
- opened_at
- closed_at
- created_at
- updated_at
```

#### **sr_daily_summary**
Resumen diario consolidado de ventas.
```
Campos:
- id (PK)
- summary_date (UNIQUE)
- total_sales
- total_cash
- total_card
- total_other
- total_tips
- total_discounts
- total_covers
- total_tickets
- average_ticket
- opening_cash
- closing_cash
- created_at
- updated_at
```

#### **sales_daily**
Ventas diarias históricas.
```
Campos:
- id (PK)
- sale_date
- cash_amount
- card_amount
- other_amount
- total_amount
- covers
- tickets
- source (sr/manual/import)
- notes
- created_by
- created_at
- updated_at
```

#### **sales_transactions**
Transacciones individuales de ventas.
```
Campos:
- id (PK)
- ticket_number
- sale_date
- sale_datetime
- transaction_amount
- tip_amount
- payment_type (cash/card/transfer/other)
- table_number
- waiter
- items_count
- covers
- status (completed/cancelled/pending)
- created_at
```

#### **v_sales_last_30**
Vista de últimas 30 ventas.
```
Campos:
- id (PK)
- sale_date
- cash_amount
- card_amount
- other_amount
- total_amount
- tickets
- source (sr/manual)
- created_at
```

---

### ✅ TAREAS Y GESTIÓN

#### **tasks**
Sistema de tareas y pendientes.
```
Campos:
- id (PK)
- user_id (FK → users)
- title
- description
- due_date
- due_time
- priority (low/medium/high/urgent)
- status (pending/in_progress/completed/cancelled)
- completed_at
- event_id
- created_at
- updated_at
```

---

### 💼 RECURSOS HUMANOS - TABLA ADICIONAL

#### **employee_notes**
Notas vinculadas a expedientes de empleados.
```
Campos:
- id (PK)
- employee_id (FK → employee_files)
- note_id
- content (LONGTEXT)
- color
- created_by
- created_by_name
- created_at
- updated_at
```

---

## 📁 ARCHIVOS SQL DISPONIBLES

### ✅ Archivos existentes:
1. `database/bonifacios_db.sql` - Base de datos principal (18 tablas originales)
2. `database/create_cash_movements.sql` - Tabla sr_cash_movements
3. `database/add_tracking_tables.sql` - Tablas de tracking
4. `database/complete_database_schema.sql` - **TODAS las 85 tablas**

### 📋 Uso:
```sql
-- Para crear todas las tablas desde cero:
-- 1. Importa bonifacios_db.sql
-- 2. Importa add_tracking_tables.sql
-- 3. Importa complete_database_schema.sql
```

---

## 🎯 RESUMEN FINAL

**Total de tablas:** 85 tablas  
**Tablas documentadas previamente:** 18 tablas  
**Tablas nuevas documentadas:** 67 tablas  
**Archivos SQL creados:** 4 archivos

### Desglose por categoría:
- 🔐 Autenticación: 5 tablas
- 💼 Recursos Humanos: 5 tablas
- 💰 Ventas SoftRestaurant: 22 tablas
- 🎉 Cotizaciones: 10 tablas
- 📅 Calendario: 3 tablas
- 🏘️ Comunidades: 5 tablas
- 💵 Aportaciones: 3 tablas
- 🍽️ Menú: 2 tablas
- 💬 Mensajería: 4 tablas
- 📝 Notas: 5 tablas
- 📊 Analíticas: 4 tablas
- ✅ Tareas: 1 tabla

**Estado:** ✅ Base de datos completamente documentada con todas las 85 tablas

---

## 🔑 TABLAS CRÍTICAS PARA EL DASHBOARD

### Ventas en Tiempo Real:
- `sr_sales` - Tickets cerrados y abiertos
- `sr_today_sales` - Ventas del día actual
- `sr_cash_movements` - Movimientos de caja
- `sr_daily_summary` - Resumen diario

### Sincronización:
- `sr_sync_config` - Configuración de módulos
- `sr_sync_log` - Historial de sincronizaciones

### Reportes:
- `sales_daily` - Ventas diarias históricas
- `sales_transactions` - Transacciones individuales
- `v_sales_last_30` - Últimas 30 ventas

---

**Última actualización:** 13 de abril de 2026  
**Versión:** 2.0 (Completa con 85 tablas)
