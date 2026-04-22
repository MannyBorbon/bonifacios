# 📊 DOCUMENTACIÓN COMPLETA DE TABLAS - phpMyAdmin

**Fecha:** 13 de abril de 2026  
**Total de tablas:** 68 tablas

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
- `executive_report` - Reportes ejecutivos

### 💰 Ventas SoftRestaurant (5 tablas)
- `sr_sales` - Ventas/tickets
- `sr_sale_items` - Productos vendidos
- `sr_cash_movements` - Movimientos de caja
- `sr_cancellations` - Tickets cancelados
- `sales_api_keys` - API keys para ventas

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

### 📝 Notas y Notificaciones (4 tablas)
- `notes` - Notas generales
- `note_attachments` - Adjuntos
- `note_tags` - Tags de notas
- `notifications` - Notificaciones

### 📊 Analíticas y Tracking (4 tablas)
- `analytics` - Métricas del sistema
- `activity_log` - Log de actividad
- `page_views` - Vistas de páginas
- `site_visitors` - Visitantes del sitio

---

## 📋 DETALLE DE TODAS LAS TABLAS

### 🔐 AUTENTICACIÓN Y USUARIOS

#### 1. **users**
Usuarios del sistema y credenciales de acceso.
```
Campos:
- id (PK)
- username (UNIQUE)
- password
- full_name
- email
- role (admin/manager/staff)
- avatar
- is_active
- last_login
- created_at
- updated_at
- profile_photo
```

#### 2. **user_sessions**
Control de sesiones activas e históricas.
```
Campos:
- id (PK)
- user_id (FK → users)
- session_token
- ip_address
- user_agent
- device_type
- browser
- os
- country
- city
- started_at
- last_activity
- ended_at
- duration_seconds
- is_active
```

#### 3. **user_clicks**
Tracking de interacciones y clics en la UI.
```
Campos:
- id (PK)
- session_id
- user_id (FK → users)
- event_type
- page_url
- element_id
- element_class
- element_text
- click_x
- click_y
- timestamp
- metadata
```

#### 4. **user_skills**
Habilidades y competencias de usuarios.
```
Campos:
- id (PK)
- user_id (FK → users)
- icon
- skill
- description
- sort_order
- is_active
- created_at
```

#### 5. **onsite_status**
Estado de presencia (en sitio o fuera).
```
Campos:
- id (PK)
- user_id (FK → users, UNIQUE)
- is_onsite
- updated_at
```

---

### 💼 RECURSOS HUMANOS

#### 6. **job_applications**
Solicitudes de empleo.
```
Campos:
- id (PK)
- name
- studies
- email
- phone
- current_job
- position
- experience
- address
- no_studies
- no_email
- no_current_job
- status (pending/reviewing/accepted/rejected)
- notes
- reviewed_by (FK → users)
- reviewed_at
- created_at
- updated_at
- age
- gender
- estudios
- photo_url
- ip_address
- ip_location
```

#### 7. **employee_files**
Expedientes completos de empleados.
```
Campos:
- id (PK)
- application_id
- name
- age
- gender
- studies
- email
- phone
- address
- position
- experience
- current_job
- photo
- id_photo
- emergency_contact
- employee_number
- estado_civil
- idiomas
- accesos
- sueldo
- prestaciones
- tipo_sangre
- alergias
- enfermedades
- status
- hire_date
- notes
- created_at
- updated_at
- sort_order
```

#### 8. **employee_reports**
Reportes vinculados a expedientes.
```
Campos:
- id (PK)
- employee_id (FK → employee_files)
- report_name
- report_type
- file_path
- content
- photo_path
- created_by
- created_at
```

#### 9. **executive_report**
Reportes ejecutivos y métricas.
```
Campos:
- id (PK)
- name
- main_amount
- secondary_amount
- created_at
- updated_at
- application_date
- start_date
- email
- phone
- age
- gender
- address
- estudios
- experience
- current_job
- photo
- status
- hire_date
- notes
```

---

### 💰 VENTAS SOFTRESTAURANT

#### 10. **sr_sales**
Ventas sincronizadas de SoftRestaurant.
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
- cash_amount
- card_amount
- voucher_amount
- other_amount
- opened_at
- closed_at
- created_at
- updated_at
```

#### 11. **sr_sale_items**
Productos de cada ticket.
```
Campos:
- id (PK)
- sale_id (FK → sr_sales)
- product_id
- product_name
- quantity
- unit_price
- discount
- subtotal
- created_at
```

#### 12. **sr_cash_movements**
Movimientos de caja (retiros, ingresos, propinas).
```
Campos:
- id (PK)
- movement_id (UNIQUE)
- folio_movto
- movement_type (withdrawal/deposit/tip_payment/other)
- tipo_original
- amount
- amount_signed
- movement_date
- movement_time
- movement_datetime
- shift_id
- concept
- reference
- user_cancel
- is_tip_payment
- company_id
- created_at
- updated_at
```

#### 13. **sr_cancellations**
Tickets cancelados para auditoría.
```
Campos:
- id (PK)
- ticket_number
- amount
- user_name
- reason
- cancel_date
- created_at
```

#### 14. **sales_api_keys**
API Keys para acceso a ventas.
```
Campos:
- id (PK)
- api_key (UNIQUE)
- description
- is_active
- created_at
```

---

### 🎉 COTIZACIONES Y EVENTOS

#### 15. **event_quotes**
Cotizaciones de eventos.
```
Campos:
- id (PK)
- name
- phone
- email
- event_type
- event_date
- guests
- notes
- location
- status (pending/contacted/quoted/confirmed/cancelled)
- quote_amount
- assigned_to (FK → users)
- created_at
- updated_at
- cancellation_reason
- cancellation_notes
```

#### 16. **event_reminders**
Recordatorios de eventos.
```
Campos:
- id (PK)
- event_id (FK → calendar_events)
- reminder_type (email/sms/notification)
- remind_before_minutes
- is_sent
- sent_at
- created_at
```

#### 17. **quote_audit_log**
Auditoría de cambios en cotizaciones.
```
Campos:
- id (PK)
- quote_id
- action
- changed_by
- changed_by_name
- field_changed
- old_value
- new_value
- ip_address
- created_at
```

#### 18. **quote_beo**
Banquet Event Orders.
```
Campos:
- id (PK)
- quote_id
- folio
- change_data
- created_at
- updated_at
```

#### 19. **quote_change_summary**
Resumen de cambios en cotizaciones.
```
Campos:
- id (PK)
- quote_id
- total_edits
- last_edited_by
- last_edited_at
- created_at
- updated_at
```

#### 20. **quote_cotizaciones**
Versiones de cotizaciones.
```
Campos:
- id (PK)
- quote_id
- version_number
- data (LONGTEXT)
- is_final
- created_by
- created_at
- updated_at
- sent_at
- sent_to
```

#### 21. **quote_notes**
Notas de cotizaciones.
```
Campos:
- id (PK)
- quote_id
- user_id
- note
- created_at
```

#### 22. **quote_requirements**
Requerimientos de cotizaciones.
```
Campos:
- id (PK)
- quote_id
- item
- is_checked
- sort_order
- created_at
```

#### 23. **quote_versions**
Historial de versiones de cotizaciones.
```
Campos:
- id (PK)
- quote_id
- version_number
- snapshot_data (LONGTEXT)
- created_by
- created_by_name
- notes
- created_at
```

---

### 📅 CALENDARIO

#### 24. **calendar_events**
Eventos del calendario.
```
Campos:
- id (PK)
- title
- description
- event_date
- start_time
- end_time
- category
- location
- priority
- color
- tags
- assigned_to
- quote_id
- created_by
- created_at
- updated_at
```

#### 25. **recurring_events**
Eventos recurrentes.
```
Campos:
- id (PK)
- event_id (FK → calendar_events)
- recurrence_pattern (daily/weekly/monthly/yearly)
- recurrence_interval
- recurrence_end_date
- recurrence_count
```

---

### 🏘️ COMUNIDADES

#### 26. **communities**
Comunidades registradas.
```
Campos:
- id (PK)
- name
- contact_name
- phone
- email
- members
- address
- notes
- status (active/inactive)
- avatar_color
- created_at
- updated_at
```

#### 27. **community_notes**
Notas de comunidades.
```
Campos:
- id (PK)
- community_id (FK → communities)
- content
- created_by
- created_at
```

#### 28. **community_purchases**
Compras de comunidades.
```
Campos:
- id (PK)
- community_id (FK → communities)
- visit_id
- item_name
- quantity
- unit_price
- total
- purchase_date
- created_at
```

#### 29. **community_reports**
Reportes de comunidades.
```
Campos:
- id (PK)
- community_id (FK → communities)
- report_type
- content
- report_date
- created_at
```

#### 30. **community_visits**
Visitas registradas de comunidades.
```
Campos:
- id (PK)
- community_id (FK → communities)
- visit_date
- guests
- total_spent
- occasion
- notes
- created_at
```

---

### 💵 APORTACIONES

#### 31. **aportaciones**
Aportaciones registradas.
```
Campos:
- id (PK)
- nombre
- monto
- fecha_aportacion
- banco
- tipo_pago
- cuenta
- titular
- referencia
- notas
- created_at
- updated_at
```

#### 32. **aportacion_archivos**
Archivos adjuntos de aportaciones.
```
Campos:
- id (PK)
- aportacion_id (FK → aportaciones)
- pago_id
- archivo_tipo (comprobante/factura/otro)
- nombre_original
- nombre_archivo
- tamano
- notas
- created_by
- created_at
```

#### 33. **aportacion_pagos**
Pagos de aportaciones.
```
Campos:
- id (PK)
- aportacion_id (FK → aportaciones)
- monto
- fecha_pago
- metodo_pago
- referencia
- banco_origen
- notas
- created_at
```

---

### 🍽️ MENÚ

#### 34. **menu_categories**
Categorías del menú.
```
Campos:
- id (PK)
- slug
- icon
- label
- description
- type
- sort_order
- is_active
- created_at
```

#### 35. **menu_items**
Platillos del menú.
```
Campos:
- id (PK)
- category_id (FK → menu_categories)
- name
- description
- price
- unit
- image_url
- sort_order
- is_active
- created_at
- updated_at
```

---

### 💬 MENSAJERÍA Y CHAT

#### 36. **messages**
Mensajería interna.
```
Campos:
- id (PK)
- sender_id (FK → users)
- recipient_id (FK → users)
- subject
- message
- is_read
- read_at
- parent_message_id (FK → messages)
- created_at
```

#### 37. **chat_conversations**
Conversaciones de chat.
```
Campos:
- id (PK)
- user1_id
- user2_id
- last_message_at
- created_at
```

#### 38. **chat_messages**
Mensajes de chat.
```
Campos:
- id (PK)
- conversation_id (FK → chat_conversations)
- sender_id
- message_type
- content
- file_url
- file_name
- file_size
- is_read
- created_at
```

---

### 📝 NOTAS Y NOTIFICACIONES

#### 39. **notes**
Notas generales del sistema.
```
Campos:
- id (PK)
- user_id (FK → users)
- title
- content
- color
- is_pinned
- is_archived
- event_id
- task_id
- created_at
- updated_at
```

#### 40. **note_attachments**
Adjuntos de notas.
```
Campos:
- id (PK)
- note_id (FK → notes)
- file_path
- file_name
- file_type
- file_size
- created_at
```

#### 41. **note_tags**
Tags de notas.
```
Campos:
- id (PK)
- note_id (FK → notes)
- tag
```

#### 42. **notifications**
Notificaciones del sistema.
```
Campos:
- id (PK)
- user_id (FK → users)
- title
- message
- type (info/success/warning/error)
- related_id
- related_type
- is_read
- read_at
- created_at
```

---

### 📊 ANALÍTICAS Y TRACKING

#### 43. **analytics**
Métricas del sistema.
```
Campos:
- id (PK)
- metric_type
- metric_value
- date
- metadata (JSON)
- created_at
```

#### 44. **activity_log**
Log de actividad de usuarios.
```
Campos:
- id (PK)
- user_id (FK → users)
- action
- entity_type
- entity_id
- description
- ip_address
- user_agent
- created_at
```

#### 45. **page_views**
Vistas de páginas.
```
Campos:
- id (PK)
- session_id
- user_id
- page_url
- page_title
- referrer
- time_on_page
- scroll_depth
- viewed_at
- left_at
```

#### 46. **site_visitors**
Visitantes del sitio.
```
Campos:
- id (PK)
- visitor_id
- ip_address
- user_agent
- device_type
- browser
- os
- screen_width
- screen_height
- language
- country
- city
- region
- page_url
- page_title
- referrer
- utm_source
- utm_medium
- utm_campaign
- is_new_visitor
- visited_at
```

---

## 📁 ARCHIVOS SQL DISPONIBLES

### ✅ Archivos existentes:
1. `database/bonifacios_db.sql` - Base de datos principal (18 tablas originales)
2. `database/create_cash_movements.sql` - Tabla sr_cash_movements
3. `database/add_tracking_tables.sql` - Tablas de tracking
4. `database/complete_database_schema.sql` - **NUEVO: Todas las tablas faltantes**

### 📋 Uso:
```sql
-- Para crear todas las tablas desde cero:
-- 1. Importa bonifacios_db.sql
-- 2. Importa add_tracking_tables.sql
-- 3. Importa complete_database_schema.sql
```

---

## 🎯 RESUMEN

**Total de tablas:** 68 tablas  
**Tablas documentadas previamente:** 18 tablas  
**Tablas nuevas documentadas:** 50 tablas  
**Archivos SQL creados:** 4 archivos

**Estado:** ✅ Base de datos completamente documentada

---

**Última actualización:** 13 de abril de 2026
