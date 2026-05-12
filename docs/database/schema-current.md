# Esquema actual de base de datos

> **Fuente de verdad para APIs y capa de datos.**
> Regenerar con `python scripts/update-database-schema-doc.py` tras exportar la BD.

| Campo | Valor |
| --- | --- |
| Archivo SQL origen | `u979547041_bonifacios (2).sql` |
| Generado (UTC) | `2026-05-04T18:09:54Z` |
| SHA256 (parcial) volcado | `c7e5e0cf5ab0` |
| Tablas | 98 |
| Vistas (definición `CREATE VIEW`) | 3 |

---

## Tablas

Cada tabla incluye `CREATE TABLE` y los `ALTER TABLE` del volcado (índices, `AUTO_INCREMENT`, `FOREIGN KEY`).

### `activity_log`

#### Columnas

```sql
CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);
```

```sql
ALTER TABLE `activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=968;
```

```sql
ALTER TABLE `activity_log`
  ADD CONSTRAINT `activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
```

### `analytics`

#### Columnas

```sql
CREATE TABLE `analytics` (
  `id` int(11) NOT NULL,
  `metric_type` varchar(50) NOT NULL,
  `metric_value` int(11) NOT NULL,
  `date` date NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `analytics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_metric_type` (`metric_type`),
  ADD KEY `idx_date` (`date`);
```

```sql
ALTER TABLE `analytics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;
```

### `aportacion_archivos`

#### Columnas

```sql
CREATE TABLE `aportacion_archivos` (
  `id` int(11) NOT NULL,
  `aportacion_id` int(11) NOT NULL,
  `pago_id` int(11) DEFAULT NULL,
  `tipo` enum('comprobante_aportacion','comprobante_pago','referencia','otro') DEFAULT 'otro',
  `nombre_original` varchar(255) NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `tamano` int(11) DEFAULT NULL,
  `notas` varchar(500) DEFAULT NULL,
  `subido_por` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `aportacion_archivos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `aportacion_id` (`aportacion_id`),
  ADD KEY `pago_id` (`pago_id`);
```

```sql
ALTER TABLE `aportacion_archivos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `aportacion_archivos`
  ADD CONSTRAINT `aportacion_archivos_ibfk_1` FOREIGN KEY (`aportacion_id`) REFERENCES `aportaciones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `aportacion_archivos_ibfk_2` FOREIGN KEY (`pago_id`) REFERENCES `aportacion_pagos` (`id`) ON DELETE SET NULL;
```

### `aportacion_pagos`

#### Columnas

```sql
CREATE TABLE `aportacion_pagos` (
  `id` int(11) NOT NULL,
  `aportacion_id` int(11) NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  `fecha_pago` date NOT NULL,
  `metodo_pago` varchar(100) DEFAULT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `banco_origen` varchar(255) DEFAULT NULL,
  `notas` varchar(500) DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `aportacion_pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `aportacion_id` (`aportacion_id`);
```

```sql
ALTER TABLE `aportacion_pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
```

```sql
ALTER TABLE `aportacion_pagos`
  ADD CONSTRAINT `aportacion_pagos_ibfk_1` FOREIGN KEY (`aportacion_id`) REFERENCES `aportaciones` (`id`) ON DELETE CASCADE;
```

### `aportaciones`

#### Columnas

```sql
CREATE TABLE `aportaciones` (
  `id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `monto` decimal(15,2) NOT NULL DEFAULT 0.00,
  `fecha_aportacion` date DEFAULT NULL,
  `banco` varchar(255) DEFAULT NULL,
  `clabe` varchar(18) DEFAULT NULL,
  `cuenta` varchar(50) DEFAULT NULL,
  `titular` varchar(255) DEFAULT NULL,
  `metodo_aportacion` varchar(100) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `aportaciones`
  ADD PRIMARY KEY (`id`);
```

```sql
ALTER TABLE `aportaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
```

### `attendance_time_edits`

#### Columnas

```sql
CREATE TABLE `attendance_time_edits` (
  `id` int(11) NOT NULL,
  `attendance_id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `field_edited` varchar(20) NOT NULL,
  `old_value` datetime DEFAULT NULL,
  `new_value` datetime DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `edited_by` varchar(100) DEFAULT NULL,
  `edited_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `attendance_time_edits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_attendance` (`attendance_id`),
  ADD KEY `idx_employee` (`employee_id`);
```

```sql
ALTER TABLE `attendance_time_edits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `calendar_events`

#### Columnas

```sql
CREATE TABLE `calendar_events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `event_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `category` varchar(50) DEFAULT 'otro',
  `status` varchar(20) DEFAULT 'pendiente',
  `priority` varchar(20) DEFAULT 'media',
  `color` varchar(20) DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `assigned_to` varchar(255) DEFAULT NULL,
  `quote_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `calendar_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quote_id` (`quote_id`),
  ADD KEY `idx_event_date` (`event_date`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_assigned` (`assigned_to`);
```

```sql
ALTER TABLE `calendar_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
```

```sql
ALTER TABLE `calendar_events`
  ADD CONSTRAINT `calendar_events_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `event_quotes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `calendar_events_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `chat_conversations`

#### Columnas

```sql
CREATE TABLE `chat_conversations` (
  `id` int(11) NOT NULL,
  `user1_id` int(11) NOT NULL,
  `user2_id` int(11) NOT NULL,
  `last_message_at` timestamp NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `chat_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_pair` (`user1_id`,`user2_id`),
  ADD KEY `user2_id` (`user2_id`),
  ADD KEY `idx_last_msg` (`last_message_at`);
```

```sql
ALTER TABLE `chat_conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
```

```sql
ALTER TABLE `chat_conversations`
  ADD CONSTRAINT `chat_conversations_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `chat_conversations_ibfk_2` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`);
```

### `chat_messages`

#### Columnas

```sql
CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message_type` enum('text','image','video','audio','file') DEFAULT 'text',
  `content` text DEFAULT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int(11) DEFAULT 0,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `idx_conv` (`conversation_id`,`created_at`),
  ADD KEY `idx_unread` (`conversation_id`,`is_read`,`sender_id`);
```

```sql
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
```

```sql
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`),
  ADD CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`);
```

### `communities`

#### Columnas

```sql
CREATE TABLE `communities` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `members` int(11) DEFAULT 1,
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('activo','inactivo','vip') DEFAULT 'activo',
  `avatar_color` varchar(10) DEFAULT '#22d3ee',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `communities`
  ADD PRIMARY KEY (`id`);
```

```sql
ALTER TABLE `communities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
```

### `community_notes`

#### Columnas

```sql
CREATE TABLE `community_notes` (
  `id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `community_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `community_id` (`community_id`);
```

```sql
ALTER TABLE `community_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `community_notes`
  ADD CONSTRAINT `community_notes_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE;
```

### `community_purchases`

#### Columnas

```sql
CREATE TABLE `community_purchases` (
  `id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `visit_id` int(11) DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `purchase_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `community_purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `community_id` (`community_id`),
  ADD KEY `visit_id` (`visit_id`);
```

```sql
ALTER TABLE `community_purchases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `community_purchases`
  ADD CONSTRAINT `community_purchases_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `community_purchases_ibfk_2` FOREIGN KEY (`visit_id`) REFERENCES `community_visits` (`id`) ON DELETE SET NULL;
```

### `community_reports`

#### Columnas

```sql
CREATE TABLE `community_reports` (
  `id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text DEFAULT NULL,
  `report_date` date DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `community_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `community_id` (`community_id`);
```

```sql
ALTER TABLE `community_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `community_reports`
  ADD CONSTRAINT `community_reports_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE;
```

### `community_visits`

#### Columnas

```sql
CREATE TABLE `community_visits` (
  `id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `visit_date` date NOT NULL,
  `guests` int(11) DEFAULT 1,
  `total_spent` decimal(10,2) DEFAULT 0.00,
  `occasion` varchar(200) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `community_visits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `community_id` (`community_id`);
```

```sql
ALTER TABLE `community_visits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
```

```sql
ALTER TABLE `community_visits`
  ADD CONSTRAINT `community_visits_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE;
```

### `employee_day_notes`

#### Columnas

```sql
CREATE TABLE `employee_day_notes` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `note_date` date NOT NULL,
  `note` text NOT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `employee_day_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_employee_date` (`employee_id`,`note_date`);
```

```sql
ALTER TABLE `employee_day_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `employee_files`

#### Columnas

```sql
CREATE TABLE `employee_files` (
  `id` int(11) NOT NULL,
  `application_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `age` int(11) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `studies` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `address` text DEFAULT NULL,
  `position` varchar(100) NOT NULL,
  `experience` int(11) DEFAULT NULL,
  `current_job` varchar(255) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `id_photo` varchar(255) DEFAULT NULL,
  `emergency_contact` varchar(50) DEFAULT NULL,
  `employee_number` varchar(50) DEFAULT NULL,
  `estado_civil` varchar(50) DEFAULT NULL,
  `idiomas` varchar(255) DEFAULT NULL,
  `accesos` text DEFAULT NULL,
  `sueldo` decimal(10,2) DEFAULT NULL,
  `prestaciones` text DEFAULT NULL,
  `tipo_sangre` varchar(10) DEFAULT NULL,
  `alergias` text DEFAULT NULL,
  `enfermedades` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'activo',
  `hire_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sort_order` int(11) DEFAULT 0,
  `fecha_baja` date DEFAULT NULL,
  `motivo_baja` varchar(50) DEFAULT NULL COMMENT 'despido|renuncia',
  `dias_trabajados_total` int(11) DEFAULT 0,
  `liquidacion_despido` decimal(10,2) DEFAULT 0.00,
  `liquidacion_renuncia` decimal(10,2) DEFAULT 0.00,
  `liquidacion_notas` text DEFAULT NULL,
  `liquid_tres_meses` decimal(10,2) DEFAULT 0.00 COMMENT '3 meses de salario para liquidación',
  `liquid_veinte_dias` decimal(10,2) DEFAULT 0.00 COMMENT '20 días por año para liquidación',
  `liquid_vacaciones` decimal(10,2) DEFAULT 0.00 COMMENT 'Vacaciones proporcionales para liquidación',
  `liquid_prima_vacacional` decimal(10,2) DEFAULT 0.00 COMMENT 'Prima vacacional para liquidación',
  `liquid_aguinaldo` decimal(10,2) DEFAULT 0.00 COMMENT 'Aguinaldo para liquidación',
  `daily_salary` decimal(10,2) DEFAULT 0.00,
  `renuncia_vacaciones` decimal(10,2) DEFAULT 0.00,
  `renuncia_prima_vacacional` decimal(10,2) DEFAULT 0.00,
  `renuncia_aguinaldo` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `employee_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `application_id` (`application_id`);
```

```sql
ALTER TABLE `employee_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;
```

```sql
ALTER TABLE `employee_files`
  ADD CONSTRAINT `employee_files_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`) ON DELETE SET NULL;
```

### `employee_notes`

#### Columnas

```sql
CREATE TABLE `employee_notes` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'Nota sin título',
  `content` longtext DEFAULT NULL,
  `color` varchar(20) DEFAULT 'default',
  `created_by` int(11) DEFAULT NULL,
  `created_by_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `employee_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_employee` (`employee_id`),
  ADD KEY `idx_updated` (`updated_at`);
```

```sql
ALTER TABLE `employee_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
```

### `employee_payroll`

#### Columnas

```sql
CREATE TABLE `employee_payroll` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `employee_name` varchar(255) DEFAULT NULL,
  `pay_type` varchar(20) DEFAULT 'daily',
  `pay_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `position` varchar(100) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `employee_payroll`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_employee` (`employee_id`),
  ADD KEY `idx_employee` (`employee_id`);
```

```sql
ALTER TABLE `employee_payroll`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `employee_reports`

#### Columnas

```sql
CREATE TABLE `employee_reports` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `report_name` varchar(255) NOT NULL,
  `report_type` enum('file','text') NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `photo_path` varchar(500) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `employee_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_created_by` (`created_by`);
```

```sql
ALTER TABLE `employee_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
```

```sql
ALTER TABLE `employee_reports`
  ADD CONSTRAINT `fk_reports_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_files` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reports_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `employee_schedule_overrides`

#### Columnas

```sql
CREATE TABLE `employee_schedule_overrides` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `employee_name` varchar(255) DEFAULT NULL,
  `schedule_date` date NOT NULL,
  `week_start_date` date DEFAULT NULL,
  `day_of_week` tinyint(4) NOT NULL,
  `scheduled_start` time NOT NULL DEFAULT '00:00:00',
  `scheduled_end` time NOT NULL DEFAULT '00:00:00',
  `is_day_off` tinyint(1) NOT NULL DEFAULT 0,
  `day_type` enum('laboral','descanso','enfermedad') DEFAULT 'laboral',
  `source` enum('weekly_template','manual_override') DEFAULT 'weekly_template',
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `employee_schedule_overrides`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_employee_date` (`employee_id`,`schedule_date`),
  ADD KEY `idx_schedule_date` (`schedule_date`),
  ADD KEY `idx_employee_day` (`employee_id`,`day_of_week`);
```

```sql
ALTER TABLE `employee_schedule_overrides`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `employee_schedules`

#### Columnas

```sql
CREATE TABLE `employee_schedules` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `employee_name` varchar(255) DEFAULT NULL,
  `day_of_week` tinyint(4) NOT NULL,
  `scheduled_start` time NOT NULL,
  `scheduled_end` time NOT NULL,
  `is_day_off` tinyint(1) DEFAULT 0,
  `day_type` enum('laboral','descanso','enfermedad') DEFAULT 'laboral',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `employee_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_employee_day` (`employee_id`,`day_of_week`),
  ADD KEY `idx_employee` (`employee_id`);
```

```sql
ALTER TABLE `employee_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;
```

### `event_quotes`

#### Columnas

```sql
CREATE TABLE `event_quotes` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `event_type_other` varchar(120) DEFAULT NULL,
  `event_date` date NOT NULL,
  `guests` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `status` enum('nueva_solicitud','pending','contacted','quoted','en_negociacion','confirmed','garantizado','cerrado','cancelled') DEFAULT 'nueva_solicitud',
  `quote_amount` decimal(10,2) DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `cancellation_reason` varchar(255) DEFAULT NULL,
  `cancellation_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `event_quotes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assigned_to` (`assigned_to`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_event_type` (`event_type`),
  ADD KEY `idx_created_at` (`created_at`);
```

```sql
ALTER TABLE `event_quotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
```

```sql
ALTER TABLE `event_quotes`
  ADD CONSTRAINT `event_quotes_ibfk_1` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;
```

### `event_reminders`

#### Columnas

```sql
CREATE TABLE `event_reminders` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `reminder_type` enum('email','notification','both') DEFAULT 'both',
  `remind_before_minutes` int(11) NOT NULL DEFAULT 30,
  `is_sent` tinyint(1) DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `event_reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_is_sent` (`is_sent`);
```

```sql
ALTER TABLE `event_reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `event_reminders`
  ADD CONSTRAINT `event_reminders_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `calendar_events` (`id`) ON DELETE CASCADE;
```

### `executive_report`

#### Columnas

```sql
CREATE TABLE `executive_report` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `main_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `secondary_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `application_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `estudios` varchar(255) DEFAULT NULL,
  `experience` int(11) DEFAULT NULL,
  `current_job` varchar(255) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `status` enum('active','eventual','vacation','inactive') DEFAULT 'active',
  `hire_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `daily_salary` decimal(10,2) DEFAULT 0.00,
  `dias_trabajados_total` int(11) DEFAULT 0,
  `fecha_baja` date DEFAULT NULL,
  `motivo_baja` enum('despido','renuncia') DEFAULT NULL,
  `liquidacion_despido` decimal(10,2) DEFAULT 0.00,
  `liquidacion_renuncia` decimal(10,2) DEFAULT 0.00,
  `liquidacion_notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `executive_report`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_name` (`name`);
```

```sql
ALTER TABLE `executive_report`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
```

### `job_applications`

#### Columnas

```sql
CREATE TABLE `job_applications` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `studies` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `current_job` varchar(100) DEFAULT NULL,
  `position` varchar(100) NOT NULL,
  `experience` int(11) NOT NULL,
  `address` text DEFAULT NULL,
  `no_studies` tinyint(1) DEFAULT 0,
  `no_email` tinyint(1) DEFAULT 0,
  `no_current_job` tinyint(1) DEFAULT 0,
  `status` enum('pending','reviewing','accepted','rejected') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `age` int(11) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `estudios` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `ip_location` text DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `job_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_position` (`position`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_job_app_status_created` (`status`,`created_at`);
```

```sql
ALTER TABLE `job_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;
```

```sql
ALTER TABLE `job_applications`
  ADD CONSTRAINT `job_applications_ibfk_1` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
```

### `meeting_messages`

#### Columnas

```sql
CREATE TABLE `meeting_messages` (
  `id` int(11) NOT NULL,
  `meeting_id` int(11) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `meeting_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_meeting_messages_meeting` (`meeting_id`),
  ADD KEY `idx_meeting_messages_sender` (`sender_user_id`),
  ADD KEY `idx_meeting_messages_created` (`created_at`);
```

```sql
ALTER TABLE `meeting_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

### `meeting_participants`

#### Columnas

```sql
CREATE TABLE `meeting_participants` (
  `id` int(11) NOT NULL,
  `meeting_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `participant_role` enum('host','moderator','participant') NOT NULL DEFAULT 'participant',
  `joined_at` timestamp NULL DEFAULT current_timestamp(),
  `left_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `meeting_participants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_meeting_participants_meeting` (`meeting_id`),
  ADD KEY `idx_meeting_participants_user` (`user_id`),
  ADD KEY `idx_meeting_participants_role` (`participant_role`);
```

```sql
ALTER TABLE `meeting_participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;
```

### `meetings`

#### Columnas

```sql
CREATE TABLE `meetings` (
  `id` int(11) NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `status` enum('scheduled','active','ended') NOT NULL DEFAULT 'scheduled',
  `created_by` int(11) NOT NULL,
  `moderator_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `meetings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_meetings_status` (`status`),
  ADD KEY `idx_meetings_created` (`created_by`),
  ADD KEY `idx_meetings_moderator` (`moderator_user_id`);
```

```sql
ALTER TABLE `meetings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
```

### `menu_categories`

#### Columnas

```sql
CREATE TABLE `menu_categories` (
  `id` int(11) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `icon` varchar(10) DEFAULT '',
  `label` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT '',
  `type` enum('menu','event') NOT NULL DEFAULT 'menu',
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `menu_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);
```

```sql
ALTER TABLE `menu_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `menu_items`

#### Columnas

```sql
CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(50) DEFAULT 'porción',
  `image_url` varchar(500) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);
```

```sql
ALTER TABLE `menu_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `menu_items`
  ADD CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `menu_categories` (`id`) ON DELETE CASCADE;
```

### `messages`

#### Columnas

```sql
CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `parent_message_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_message_id` (`parent_message_id`),
  ADD KEY `idx_sender` (`sender_id`),
  ADD KEY `idx_recipient` (`recipient_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`);
```

```sql
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
```

```sql
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`parent_message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE;
```

### `note_attachments`

#### Columnas

```sql
CREATE TABLE `note_attachments` (
  `id` int(11) NOT NULL,
  `note_id` int(11) NOT NULL,
  `file_path` varchar(600) NOT NULL,
  `file_name` varchar(300) NOT NULL DEFAULT '',
  `file_type` varchar(50) NOT NULL DEFAULT 'other',
  `file_size` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `note_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_note_id` (`note_id`);
```

```sql
ALTER TABLE `note_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

### `note_tags`

#### Columnas

```sql
CREATE TABLE `note_tags` (
  `id` int(11) NOT NULL,
  `note_id` int(11) NOT NULL,
  `tag` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `note_tags`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_note_id` (`note_id`),
  ADD KEY `idx_tag` (`tag`);
```

```sql
ALTER TABLE `note_tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `note_tags`
  ADD CONSTRAINT `note_tags_ibfk_1` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE;
```

### `notes`

#### Columnas

```sql
CREATE TABLE `notes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text NOT NULL,
  `color` varchar(20) DEFAULT 'default',
  `is_pinned` tinyint(1) DEFAULT 0,
  `is_archived` tinyint(1) DEFAULT 0,
  `event_id` int(11) DEFAULT NULL,
  `task_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `task_id` (`task_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_pinned` (`is_pinned`),
  ADD KEY `idx_is_archived` (`is_archived`);
```

```sql
ALTER TABLE `notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `notes`
  ADD CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notes_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `calendar_events` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `notes_ibfk_3` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL;
```

### `notifications`

#### Columnas

```sql
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('event_reminder','task_due','note_shared','system') DEFAULT 'system',
  `related_id` int(11) DEFAULT NULL,
  `related_type` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_type` (`type`);
```

```sql
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `onsite_status`

#### Columnas

```sql
CREATE TABLE `onsite_status` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_onsite` tinyint(1) DEFAULT 0,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `onsite_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);
```

```sql
ALTER TABLE `onsite_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;
```

```sql
ALTER TABLE `onsite_status`
  ADD CONSTRAINT `onsite_status_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
```

### `operational_indicator_logs`

#### Columnas

```sql
CREATE TABLE `operational_indicator_logs` (
  `id` int(11) NOT NULL,
  `indicator_id` int(11) NOT NULL,
  `log_date` date NOT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `is_on_time` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` datetime DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `operational_indicator_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_indicator_date` (`indicator_id`,`log_date`),
  ADD KEY `idx_log_date` (`log_date`);
```

```sql
ALTER TABLE `operational_indicator_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `operational_indicator_logs`
  ADD CONSTRAINT `fk_operational_indicator` FOREIGN KEY (`indicator_id`) REFERENCES `operational_indicators` (`id`) ON DELETE CASCADE;
```

### `operational_indicators`

#### Columnas

```sql
CREATE TABLE `operational_indicators` (
  `id` int(11) NOT NULL,
  `title` varchar(160) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `due_time` time DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `operational_indicators`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_active_sort` (`is_active`,`sort_order`);
```

```sql
ALTER TABLE `operational_indicators`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `page_views`

#### Columnas

```sql
CREATE TABLE `page_views` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `page_url` varchar(500) NOT NULL,
  `page_title` varchar(255) DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `time_on_page` int(11) DEFAULT 0,
  `scroll_depth` int(11) DEFAULT 0,
  `viewed_at` timestamp NULL DEFAULT current_timestamp(),
  `left_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `page_views`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_session_id` (`session_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_page_url` (`page_url`(255)),
  ADD KEY `idx_viewed_at` (`viewed_at`);
```

```sql
ALTER TABLE `page_views`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4000;
```

```sql
ALTER TABLE `page_views`
  ADD CONSTRAINT `page_views_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `user_sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `page_views_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `pos_table_live_state`

#### Columnas

```sql
CREATE TABLE `pos_table_live_state` (
  `table_code` varchar(32) NOT NULL,
  `state` enum('free','open_ticket','printed_unpaid') NOT NULL DEFAULT 'free',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `pos_table_live_state`
  ADD PRIMARY KEY (`table_code`);
```

### `quote_audit_log`

#### Columnas

```sql
CREATE TABLE `quote_audit_log` (
  `id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `changed_by_name` varchar(255) DEFAULT NULL,
  `field_changed` varchar(100) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `quote_audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quote` (`quote_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_changed_by` (`changed_by`),
  ADD KEY `idx_created` (`created_at`);
```

```sql
ALTER TABLE `quote_audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `quote_beo`

#### Columnas

```sql
CREATE TABLE `quote_beo` (
  `id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `folio` varchar(50) DEFAULT NULL,
  `beo_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`beo_data`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `quote_beo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `quote_id` (`quote_id`);
```

```sql
ALTER TABLE `quote_beo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

```sql
ALTER TABLE `quote_beo`
  ADD CONSTRAINT `quote_beo_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `event_quotes` (`id`) ON DELETE CASCADE;
```

### `quote_change_summary`

#### Columnas

```sql
CREATE TABLE `quote_change_summary` (
  `id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `total_edits` int(11) DEFAULT 0,
  `total_versions` int(11) DEFAULT 1,
  `last_edited_by` varchar(255) DEFAULT NULL,
  `last_edited_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `quote_change_summary`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_quote` (`quote_id`);
```

```sql
ALTER TABLE `quote_change_summary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `quote_cotizaciones`

#### Columnas

```sql
CREATE TABLE `quote_cotizaciones` (
  `id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `version_number` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `data` longtext NOT NULL,
  `is_final` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `sent_at` datetime DEFAULT NULL,
  `sent_to` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `quote_cotizaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quote_id` (`quote_id`);
```

```sql
ALTER TABLE `quote_cotizaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `quote_notes`

#### Columnas

```sql
CREATE TABLE `quote_notes` (
  `id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `note` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `quote_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quote_id` (`quote_id`),
  ADD KEY `user_id` (`user_id`);
```

```sql
ALTER TABLE `quote_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
```

```sql
ALTER TABLE `quote_notes`
  ADD CONSTRAINT `quote_notes_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `event_quotes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quote_notes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `quote_requirements`

#### Columnas

```sql
CREATE TABLE `quote_requirements` (
  `id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `item` varchar(500) NOT NULL,
  `is_checked` tinyint(1) DEFAULT 0,
  `sort_order` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `quote_requirements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quote_id` (`quote_id`);
```

```sql
ALTER TABLE `quote_requirements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
```

```sql
ALTER TABLE `quote_requirements`
  ADD CONSTRAINT `quote_requirements_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `event_quotes` (`id`) ON DELETE CASCADE;
```

### `quote_versions`

#### Columnas

```sql
CREATE TABLE `quote_versions` (
  `id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `version_number` decimal(5,1) NOT NULL DEFAULT 1.0,
  `snapshot_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`snapshot_data`)),
  `created_by` int(11) NOT NULL,
  `created_by_name` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `quote_versions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quote` (`quote_id`),
  ADD KEY `idx_version` (`version_number`);
```

```sql
ALTER TABLE `quote_versions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `recurring_events`

#### Columnas

```sql
CREATE TABLE `recurring_events` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `recurrence_pattern` enum('daily','weekly','monthly','yearly') NOT NULL,
  `recurrence_interval` int(11) DEFAULT 1,
  `recurrence_end_date` date DEFAULT NULL,
  `recurrence_count` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `recurring_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_id` (`event_id`);
```

```sql
ALTER TABLE `recurring_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `recurring_events`
  ADD CONSTRAINT `recurring_events_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `calendar_events` (`id`) ON DELETE CASCADE;
```

### `reservation_deposit_accounts`

#### Columnas

```sql
CREATE TABLE `reservation_deposit_accounts` (
  `id` int(11) NOT NULL,
  `label` varchar(100) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `account_holder` varchar(255) NOT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `clabe` varchar(25) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `reservation_deposit_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_active` (`is_active`);
```

```sql
ALTER TABLE `reservation_deposit_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
```

### `reservation_event_types`

#### Columnas

```sql
CREATE TABLE `reservation_event_types` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `event_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_home_cta` tinyint(1) NOT NULL DEFAULT 0,
  `is_special` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `reservation_event_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);
```

```sql
ALTER TABLE `reservation_event_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;
```

### `reservation_floor_layout_items`

#### Columnas

```sql
CREATE TABLE `reservation_floor_layout_items` (
  `id` int(11) NOT NULL,
  `item_type` enum('table','bar_chair','landmark','decor') NOT NULL DEFAULT 'table',
  `code` varchar(50) DEFAULT NULL,
  `zone` enum('comedor','terraza_alta','terraza_baja') NOT NULL DEFAULT 'comedor',
  `label` varchar(120) NOT NULL DEFAULT '',
  `shape` enum('round','rect') NOT NULL DEFAULT 'round',
  `x_pct` decimal(7,3) NOT NULL DEFAULT 50.000,
  `y_pct` decimal(7,3) NOT NULL DEFAULT 50.000,
  `w_pct` decimal(7,3) NOT NULL DEFAULT 8.000,
  `h_pct` decimal(7,3) NOT NULL DEFAULT 8.000,
  `scale` decimal(6,3) NOT NULL DEFAULT 1.000,
  `capacity` int(11) NOT NULL DEFAULT 0,
  `tone` varchar(24) DEFAULT NULL,
  `is_hidden` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `reservation_floor_layout_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rfl_code` (`code`),
  ADD KEY `idx_rfl_zone_order` (`zone`,`sort_order`),
  ADD KEY `idx_rfl_type` (`item_type`);
```

```sql
ALTER TABLE `reservation_floor_layout_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;
```

### `sales_api_keys`

#### Columnas

```sql
CREATE TABLE `sales_api_keys` (
  `id` int(11) NOT NULL,
  `api_key` varchar(64) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `last_used` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sales_api_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_key` (`api_key`);
```

```sql
ALTER TABLE `sales_api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

### `sales_daily`

#### Columnas

```sql
CREATE TABLE `sales_daily` (
  `id` int(11) NOT NULL,
  `sale_date` date NOT NULL,
  `cash_amount` decimal(12,2) DEFAULT 0.00,
  `card_amount` decimal(12,2) DEFAULT 0.00,
  `other_amount` decimal(12,2) DEFAULT 0.00,
  `total_amount` decimal(12,2) GENERATED ALWAYS AS (`cash_amount` + `card_amount` + `other_amount`) STORED,
  `covers` int(11) DEFAULT 0,
  `tickets` int(11) DEFAULT 0,
  `source` enum('manual','softrestaurant','both') DEFAULT 'manual',
  `notes` text DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sales_daily`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_date` (`sale_date`);
```

```sql
ALTER TABLE `sales_daily`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sales_sync_log`

#### Columnas

```sql
CREATE TABLE `sales_sync_log` (
  `id` int(11) NOT NULL,
  `sync_date` date DEFAULT NULL,
  `records_received` int(11) DEFAULT 0,
  `records_inserted` int(11) DEFAULT 0,
  `records_updated` int(11) DEFAULT 0,
  `status` enum('success','error','partial') DEFAULT 'success',
  `message` text DEFAULT NULL,
  `api_key_hint` varchar(20) DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sales_sync_log`
  ADD PRIMARY KEY (`id`);
```

```sql
ALTER TABLE `sales_sync_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sales_transactions`

#### Columnas

```sql
CREATE TABLE `sales_transactions` (
  `id` int(11) NOT NULL,
  `sr_ticket_id` varchar(100) DEFAULT NULL,
  `sale_date` date NOT NULL,
  `sale_datetime` datetime DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT 0.00,
  `tip_amount` decimal(10,2) DEFAULT 0.00,
  `payment_type` enum('efectivo','tarjeta','transferencia','otro') DEFAULT 'efectivo',
  `table_number` varchar(20) DEFAULT NULL,
  `covers` int(11) DEFAULT 1,
  `waiter` varchar(100) DEFAULT NULL,
  `items_count` int(11) DEFAULT 0,
  `status` enum('open','closed','cancelled') DEFAULT 'closed',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sales_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_sr_ticket` (`sr_ticket_id`);
```

```sql
ALTER TABLE `sales_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `site_visitors`

#### Columnas

```sql
CREATE TABLE `site_visitors` (
  `id` int(11) NOT NULL,
  `visitor_id` varchar(64) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `device_type` varchar(20) DEFAULT 'desktop',
  `browser` varchar(50) DEFAULT NULL,
  `os` varchar(50) DEFAULT NULL,
  `screen_width` int(11) DEFAULT NULL,
  `screen_height` int(11) DEFAULT NULL,
  `language` varchar(10) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `page_url` varchar(500) DEFAULT NULL,
  `page_title` varchar(255) DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `utm_source` varchar(100) DEFAULT NULL,
  `utm_medium` varchar(100) DEFAULT NULL,
  `utm_campaign` varchar(100) DEFAULT NULL,
  `is_new_visitor` tinyint(1) DEFAULT 1,
  `visited_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `site_visitors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_visitor_id` (`visitor_id`),
  ADD KEY `idx_visited_at` (`visited_at`),
  ADD KEY `idx_page_url` (`page_url`(191));
```

```sql
ALTER TABLE `site_visitors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=829;
```

### `special_reservations`

#### Columnas

```sql
CREATE TABLE `special_reservations` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `guests` int(11) NOT NULL DEFAULT 2,
  `reservation_date` date NOT NULL,
  `reservation_time` time NOT NULL,
  `table_code` varchar(50) DEFAULT NULL,
  `secondary_table_code` varchar(32) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `occasion` varchar(100) DEFAULT NULL,
  `event_type_id` int(11) DEFAULT NULL,
  `status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  `deposit_status` enum('pending','uploaded','confirmed','rejected') DEFAULT 'pending',
  `deposit_screenshot` varchar(500) DEFAULT NULL,
  `deposit_uploaded_at` datetime DEFAULT NULL,
  `deposit_confirmed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `special_reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_date_time` (`reservation_date`,`reservation_time`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_deposit_status` (`deposit_status`),
  ADD KEY `idx_phone_date` (`phone`,`reservation_date`),
  ADD KEY `idx_status_date` (`status`,`reservation_date`),
  ADD KEY `idx_event_type_id` (`event_type_id`);
```

```sql
ALTER TABLE `special_reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
```

### `sr_attendance`

#### Columnas

```sql
CREATE TABLE `sr_attendance` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `employee_name` varchar(255) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `clock_in` datetime DEFAULT NULL,
  `clock_out` datetime DEFAULT NULL,
  `shift` varchar(50) DEFAULT NULL,
  `status` enum('present','left','absent','late','early_leave') DEFAULT 'present',
  `minutes_worked` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_employee_date` (`employee_id`,`attendance_date`,`clock_in`),
  ADD KEY `idx_employee` (`employee_id`),
  ADD KEY `idx_date` (`attendance_date`),
  ADD KEY `idx_status` (`status`);
```

```sql
ALTER TABLE `sr_attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=230892;
```

### `sr_attendance_logs`

#### Columnas

```sql
CREATE TABLE `sr_attendance_logs` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `employee_name` varchar(255) NOT NULL,
  `clock_in` datetime NOT NULL,
  `clock_out` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_attendance_logs`
  ADD PRIMARY KEY (`id`);
```

```sql
ALTER TABLE `sr_attendance_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_cancellations`

#### Columnas

```sql
CREATE TABLE `sr_cancellations` (
  `id` int(11) NOT NULL,
  `ticket_number` varchar(50) NOT NULL,
  `amount` decimal(10,2) DEFAULT 0.00,
  `user_name` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `cancel_date` datetime DEFAULT NULL,
  `synced_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_cancellations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ticket_cancel` (`ticket_number`,`cancel_date`),
  ADD UNIQUE KEY `uq_sr_cancellations_ticket_date` (`ticket_number`,`cancel_date`),
  ADD KEY `idx_cancel_date` (`cancel_date`);
```

```sql
ALTER TABLE `sr_cancellations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_cash_movements`

#### Columnas

```sql
CREATE TABLE `sr_cash_movements` (
  `id` int(11) NOT NULL,
  `movement_id` varchar(100) NOT NULL,
  `folio_movto` varchar(50) DEFAULT NULL,
  `movement_type` varchar(30) NOT NULL,
  `tipo_original` int(11) DEFAULT 0,
  `amount` decimal(10,2) NOT NULL,
  `amount_signed` decimal(10,2) DEFAULT NULL,
  `movement_date` date DEFAULT NULL,
  `movement_time` time DEFAULT NULL,
  `movement_datetime` datetime NOT NULL,
  `shift_id` varchar(50) DEFAULT NULL,
  `concept` text DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `user_cancel` varchar(100) DEFAULT NULL,
  `is_tip_payment` tinyint(1) DEFAULT 0,
  `company_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_cash_movements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `movement_id` (`movement_id`),
  ADD UNIQUE KEY `uq_sr_cash_movements_movement` (`movement_id`),
  ADD KEY `idx_movement_datetime` (`movement_datetime`),
  ADD KEY `idx_movement_type` (`movement_type`),
  ADD KEY `idx_shift_id` (`shift_id`);
```

```sql
ALTER TABLE `sr_cash_movements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=135665;
```

### `sr_cheque_payments`

#### Columnas

```sql
CREATE TABLE `sr_cheque_payments` (
  `id` int(10) UNSIGNED NOT NULL,
  `folio` varchar(64) NOT NULL,
  `line_id` varchar(96) NOT NULL,
  `id_forma_pago` varchar(32) NOT NULL DEFAULT '',
  `amount` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `reference` varchar(255) DEFAULT NULL,
  `payment_datetime` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_cheque_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sr_cheque_payments_line` (`line_id`),
  ADD KEY `idx_sr_cheque_payments_folio` (`folio`),
  ADD KEY `idx_sr_cheque_payments_dt` (`payment_datetime`);
```

```sql
ALTER TABLE `sr_cheque_payments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=342890;
```

### `sr_daily_summary`

#### Columnas

```sql
CREATE TABLE `sr_daily_summary` (
  `id` int(11) NOT NULL,
  `summary_date` date NOT NULL,
  `total_sales` decimal(10,2) DEFAULT 0.00,
  `total_cash` decimal(10,2) DEFAULT 0.00,
  `total_card` decimal(10,2) DEFAULT 0.00,
  `total_other` decimal(10,2) DEFAULT 0.00,
  `total_tips` decimal(10,2) DEFAULT 0.00,
  `total_discounts` decimal(10,2) DEFAULT 0.00,
  `total_covers` int(11) DEFAULT 0,
  `total_tickets` int(11) DEFAULT 0,
  `average_ticket` decimal(10,2) DEFAULT 0.00,
  `opening_cash` decimal(10,2) DEFAULT 0.00,
  `closing_cash` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_daily_summary`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `summary_date` (`summary_date`),
  ADD KEY `idx_date` (`summary_date`);
```

```sql
ALTER TABLE `sr_daily_summary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_employees`

#### Columnas

```sql
CREATE TABLE `sr_employees` (
  `id` int(11) NOT NULL,
  `sr_employee_id` varchar(50) NOT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'Vínculo al usuario del Dashboard (users)',
  `department` varchar(100) DEFAULT NULL,
  `is_waiter` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `hire_date` date DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `employee_file_id` int(11) DEFAULT NULL COMMENT 'Vínculo al expediente de RH (employee_files)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sr_employee_id` (`sr_employee_id`),
  ADD KEY `idx_position` (`position`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_waiter` (`is_waiter`),
  ADD KEY `fk_sr_emp_file` (`employee_file_id`),
  ADD KEY `fk_sr_emp_user` (`user_id`);
```

```sql
ALTER TABLE `sr_employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=388113;
```

```sql
ALTER TABLE `sr_employees`
  ADD CONSTRAINT `fk_sr_emp_file` FOREIGN KEY (`employee_file_id`) REFERENCES `employee_files` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sr_emp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
```

### `sr_inventory`

#### Columnas

```sql
CREATE TABLE `sr_inventory` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `current_stock` decimal(10,2) DEFAULT 0.00,
  `min_stock` decimal(10,2) DEFAULT 0.00,
  `max_stock` decimal(10,2) DEFAULT 0.00,
  `last_purchase_price` decimal(10,2) DEFAULT NULL,
  `last_purchase_date` date DEFAULT NULL,
  `last_count_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_inventory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product` (`product_id`),
  ADD KEY `idx_stock` (`current_stock`);
```

```sql
ALTER TABLE `sr_inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96930;
```

### `sr_payments`

#### Columnas

```sql
CREATE TABLE `sr_payments` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) DEFAULT NULL,
  `payment_type` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `card_type` varchar(50) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sale` (`sale_id`),
  ADD KEY `idx_type` (`payment_type`);
```

```sql
ALTER TABLE `sr_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_present_today`

#### Columnas

```sql
CREATE TABLE `sr_present_today` (
`id` int(11)
,`employee_id` varchar(50)
,`employee_name` varchar(255)
,`position` varchar(100)
,`attendance_date` date
,`clock_in` datetime
,`clock_out` datetime
,`shift` varchar(50)
,`status` enum('present','left','absent','late','early_leave')
,`minutes_worked` int(11)
,`notes` text
,`created_at` timestamp
,`updated_at` timestamp
);
```
### `sr_products`

#### Columnas

```sql
CREATE TABLE `sr_products` (
  `id` int(11) NOT NULL,
  `sr_product_id` varchar(50) NOT NULL,
  `product_code` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `subcategory` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `cost` decimal(10,2) DEFAULT NULL,
  `unit` varchar(50) DEFAULT 'pieza',
  `is_active` tinyint(1) DEFAULT 1,
  `is_combo` tinyint(1) DEFAULT 0,
  `preparation_time` int(11) DEFAULT NULL,
  `printer_station` varchar(50) DEFAULT NULL,
  `tax_included` tinyint(1) DEFAULT 1,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sr_product_id` (`sr_product_id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_code` (`product_code`);
```

```sql
ALTER TABLE `sr_products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_reservations`

#### Columnas

```sql
CREATE TABLE `sr_reservations` (
  `id` int(11) NOT NULL,
  `sr_reservation_id` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `reservation_date` date NOT NULL,
  `reservation_time` time NOT NULL,
  `party_size` int(11) NOT NULL,
  `table_id` int(11) DEFAULT NULL,
  `status` enum('pending','confirmed','seated','completed','cancelled','no_show') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_reservations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sr_reservation_id` (`sr_reservation_id`),
  ADD KEY `idx_date` (`reservation_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_customer` (`customer_name`);
```

```sql
ALTER TABLE `sr_reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_sale_items`

#### Columnas

```sql
CREATE TABLE `sr_sale_items` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) DEFAULT NULL,
  `sr_ticket_id` varchar(50) DEFAULT NULL,
  `sr_sale_id` varchar(50) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT 0.00,
  `subtotal` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sale` (`sale_id`),
  ADD KEY `idx_sr_sale` (`sr_sale_id`),
  ADD KEY `idx_product` (`product_id`),
  ADD KEY `idx_sr_ticket_id` (`sr_ticket_id`);
```

```sql
ALTER TABLE `sr_sale_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=672175;
```

### `sr_sales`

#### Columnas

```sql
CREATE TABLE `sr_sales` (
  `id` int(11) NOT NULL,
  `sr_ticket_id` varchar(50) NOT NULL,
  `ticket_number` varchar(50) NOT NULL,
  `folio` varchar(50) DEFAULT NULL,
  `sale_date` date NOT NULL,
  `sale_time` time DEFAULT NULL,
  `sale_datetime` datetime NOT NULL,
  `table_id` int(11) DEFAULT NULL,
  `table_number` varchar(20) DEFAULT NULL,
  `waiter_id` int(11) DEFAULT NULL,
  `waiter_name` varchar(255) DEFAULT NULL,
  `covers` int(11) DEFAULT 1,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `tip` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `status` enum('open','closed','cancelled') DEFAULT 'closed',
  `payment_type` varchar(50) DEFAULT 'cash',
  `cash_amount` decimal(10,2) DEFAULT 0.00,
  `card_amount` decimal(10,2) DEFAULT 0.00,
  `voucher_amount` decimal(10,2) DEFAULT 0.00,
  `other_amount` decimal(10,2) DEFAULT 0.00,
  `opened_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tip_paid` tinyint(1) NOT NULL DEFAULT 0,
  `receipt_printed` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ticket_number` (`ticket_number`),
  ADD UNIQUE KEY `ticket_number_2` (`ticket_number`),
  ADD UNIQUE KEY `ticket_number_3` (`ticket_number`),
  ADD UNIQUE KEY `ticket_number_4` (`ticket_number`),
  ADD UNIQUE KEY `ticket_number_5` (`ticket_number`),
  ADD UNIQUE KEY `uq_sr_sales_ticket` (`sr_ticket_id`),
  ADD UNIQUE KEY `unique_ticket_date` (`folio`,`sale_date`),
  ADD KEY `idx_date` (`sale_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_waiter_name` (`waiter_name`),
  ADD KEY `idx_ticket` (`ticket_number`),
  ADD KEY `idx_folio` (`folio`);
```

```sql
ALTER TABLE `sr_sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=187099;
```

### `sr_shifts`

#### Columnas

```sql
CREATE TABLE `sr_shifts` (
  `id` int(11) NOT NULL,
  `sr_shift_id` varchar(50) NOT NULL,
  `sr_turno_id` varchar(50) DEFAULT NULL,
  `cajero` varchar(100) DEFAULT NULL,
  `estacion` varchar(100) DEFAULT NULL,
  `apertura` datetime DEFAULT NULL,
  `cierre` datetime DEFAULT NULL,
  `fondo` decimal(10,2) DEFAULT 0.00,
  `declarado_efectivo` decimal(10,2) DEFAULT 0.00,
  `declarado_tarjeta` decimal(10,2) DEFAULT 0.00,
  `declarado_vales` decimal(10,2) DEFAULT 0.00,
  `declarado_credito` decimal(10,2) DEFAULT 0.00,
  `company_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_shifts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sr_shift_id` (`sr_shift_id`),
  ADD KEY `idx_apertura` (`apertura`),
  ADD KEY `idx_cierre` (`cierre`),
  ADD KEY `idx_cajero` (`cajero`);
```

```sql
ALTER TABLE `sr_shifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15172;
```

### `sr_sync_config`

#### Columnas

```sql
CREATE TABLE `sr_sync_config` (
  `id` int(11) NOT NULL,
  `module_name` varchar(50) NOT NULL,
  `last_sync_at` datetime DEFAULT NULL,
  `sync_status` enum('idle','running','error','success') DEFAULT 'idle',
  `sync_interval_minutes` int(11) DEFAULT 15,
  `is_enabled` tinyint(1) DEFAULT 1,
  `error_message` text DEFAULT NULL,
  `records_synced` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_sync_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `module_name` (`module_name`),
  ADD KEY `idx_module` (`module_name`),
  ADD KEY `idx_status` (`sync_status`);
```

```sql
ALTER TABLE `sr_sync_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
```

### `sr_sync_log`

#### Columnas

```sql
CREATE TABLE `sr_sync_log` (
  `id` int(11) NOT NULL,
  `module_name` varchar(50) NOT NULL,
  `sync_started_at` datetime NOT NULL,
  `sync_finished_at` datetime DEFAULT NULL,
  `records_processed` int(11) DEFAULT 0,
  `records_inserted` int(11) DEFAULT 0,
  `records_updated` int(11) DEFAULT 0,
  `records_failed` int(11) DEFAULT 0,
  `status` enum('running','completed','failed') DEFAULT 'running',
  `error_details` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_sync_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_module` (`module_name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_started` (`sync_started_at`);
```

```sql
ALTER TABLE `sr_sync_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=163341;
```

### `sr_tables`

#### Columnas

```sql
CREATE TABLE `sr_tables` (
  `id` int(11) NOT NULL,
  `sr_table_id` varchar(50) NOT NULL,
  `table_number` varchar(20) NOT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `capacity` int(11) DEFAULT 4,
  `position_x` int(11) DEFAULT NULL,
  `position_y` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `status` enum('available','occupied','reserved','maintenance') DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_tables`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sr_table_id` (`sr_table_id`),
  ADD KEY `idx_area` (`area`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_number` (`table_number`);
```

```sql
ALTER TABLE `sr_tables`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_ticket_items`

#### Columnas

```sql
CREATE TABLE `sr_ticket_items` (
  `id` int(11) NOT NULL,
  `folio` varchar(50) NOT NULL,
  `product_id` varchar(50) DEFAULT '',
  `product_name` varchar(255) DEFAULT '',
  `category` varchar(100) DEFAULT '',
  `qty` decimal(10,3) DEFAULT 1.000,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `sr_ticket_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_folio` (`folio`),
  ADD KEY `idx_sr_ticket_items_folio` (`folio`);
```

```sql
ALTER TABLE `sr_ticket_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `sr_today_sales`

#### Columnas

```sql
CREATE TABLE `sr_today_sales` (
`id` int(11)
,`sr_ticket_id` varchar(50)
,`ticket_number` varchar(50)
,`folio` varchar(50)
,`sale_date` date
,`sale_time` time
,`sale_datetime` datetime
,`table_id` int(11)
,`table_number` varchar(20)
,`waiter_id` int(11)
,`waiter_name` varchar(255)
,`covers` int(11)
,`subtotal` decimal(10,2)
,`tax` decimal(10,2)
,`discount` decimal(10,2)
,`tip` decimal(10,2)
,`total` decimal(10,2)
,`status` enum('open','closed','cancelled')
,`payment_type` varchar(50)
,`opened_at` datetime
,`closed_at` datetime
,`created_at` timestamp
,`updated_at` timestamp
);
```
### `support_tickets`

#### Columnas

```sql
CREATE TABLE `support_tickets` (
  `id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `title` varchar(180) NOT NULL,
  `category` varchar(60) DEFAULT 'general',
  `priority` varchar(20) DEFAULT 'normal',
  `status` varchar(20) DEFAULT 'open',
  `conversation_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`);
```

```sql
ALTER TABLE `support_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `tasks`

#### Columnas

```sql
CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `due_time` time DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `completed_at` datetime DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `idx_priority` (`priority`);
```

```sql
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `calendar_events` (`id`) ON DELETE SET NULL;
```

### `user_clicks`

#### Columnas

```sql
CREATE TABLE `user_clicks` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `page_url` varchar(500) DEFAULT NULL,
  `element_id` varchar(255) DEFAULT NULL,
  `element_class` varchar(255) DEFAULT NULL,
  `element_text` varchar(500) DEFAULT NULL,
  `click_x` int(11) DEFAULT NULL,
  `click_y` int(11) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp(),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `user_clicks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_session_id` (`session_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_event_type` (`event_type`),
  ADD KEY `idx_timestamp` (`timestamp`);
```

```sql
ALTER TABLE `user_clicks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18838;
```

```sql
ALTER TABLE `user_clicks`
  ADD CONSTRAINT `user_clicks_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `user_sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_clicks_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `user_notification_state`

#### Columnas

```sql
CREATE TABLE `user_notification_state` (
  `user_id` int(11) NOT NULL,
  `seen_chat_at` datetime DEFAULT NULL,
  `seen_email_at` datetime DEFAULT NULL,
  `seen_quotes_at` datetime DEFAULT NULL,
  `seen_applications_at` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `user_notification_state`
  ADD PRIMARY KEY (`user_id`);
```

### `user_sessions`

#### Columnas

```sql
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `device_type` varchar(50) DEFAULT NULL,
  `browser` varchar(50) DEFAULT NULL,
  `os` varchar(50) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ended_at` timestamp NULL DEFAULT NULL,
  `duration_seconds` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_session_token` (`session_token`),
  ADD KEY `idx_started_at` (`started_at`),
  ADD KEY `idx_is_active` (`is_active`);
```

```sql
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1256;
```

```sql
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `user_skills`

#### Columnas

```sql
CREATE TABLE `user_skills` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `icon` varchar(10) DEFAULT '',
  `skill` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT '',
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `user_skills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);
```

```sql
ALTER TABLE `user_skills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

```sql
ALTER TABLE `user_skills`
  ADD CONSTRAINT `user_skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
```

### `users`

#### Columnas

```sql
CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'viewer',
  `avatar` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `profile_photo` varchar(255) DEFAULT NULL,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit_employees` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete_employees` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit_quotes` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete_quotes` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit_applications` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete_applications` tinyint(1) NOT NULL DEFAULT 0,
  `can_view_sales` tinyint(1) NOT NULL DEFAULT 1,
  `can_edit_sales` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `can_view_employees` tinyint(1) NOT NULL DEFAULT 1,
  `can_view_applications` tinyint(1) NOT NULL DEFAULT 1,
  `can_view_quotes` tinyint(1) NOT NULL DEFAULT 1,
  `can_view_workspace` tinyint(1) NOT NULL DEFAULT 1,
  `can_edit_workspace` tinyint(1) NOT NULL DEFAULT 0,
  `can_view_workspace_boards` tinyint(1) NOT NULL DEFAULT 1,
  `can_edit_workspace_boards` tinyint(1) NOT NULL DEFAULT 0,
  `can_view_workspace_lists` tinyint(1) NOT NULL DEFAULT 1,
  `can_edit_workspace_lists` tinyint(1) NOT NULL DEFAULT 0,
  `can_view_workspace_notes` tinyint(1) NOT NULL DEFAULT 1,
  `can_edit_workspace_notes` tinyint(1) NOT NULL DEFAULT 0,
  `can_view_workspace_calendar` tinyint(1) NOT NULL DEFAULT 1,
  `can_edit_workspace_calendar` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`);
```

```sql
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;
```

### `v_sales_last_30`

#### Columnas

```sql
CREATE TABLE `v_sales_last_30` (
`sale_date` date
,`cash_amount` decimal(12,2)
,`card_amount` decimal(12,2)
,`other_amount` decimal(12,2)
,`total_amount` decimal(12,2)
,`covers` int(11)
,`tickets` int(11)
,`source` enum('manual','softrestaurant','both')
,`day_name` varchar(9)
);
```
### `workspace_board_cards`

#### Columnas

```sql
CREATE TABLE `workspace_board_cards` (
  `id` int(11) NOT NULL,
  `board_id` int(11) NOT NULL,
  `column_id` int(11) NOT NULL,
  `title` varchar(180) NOT NULL,
  `details` text DEFAULT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_board_cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_cards_board` (`board_id`),
  ADD KEY `idx_workspace_cards_column` (`column_id`),
  ADD KEY `idx_workspace_cards_sort` (`column_id`,`sort_order`);
```

```sql
ALTER TABLE `workspace_board_cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

```sql
ALTER TABLE `workspace_board_cards`
  ADD CONSTRAINT `fk_workspace_cards_board` FOREIGN KEY (`board_id`) REFERENCES `workspace_boards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_workspace_cards_column` FOREIGN KEY (`column_id`) REFERENCES `workspace_board_columns` (`id`) ON DELETE CASCADE;
```

### `workspace_board_columns`

#### Columnas

```sql
CREATE TABLE `workspace_board_columns` (
  `id` int(11) NOT NULL,
  `board_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `status_key` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_board_columns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_columns_board` (`board_id`),
  ADD KEY `idx_workspace_columns_sort` (`board_id`,`sort_order`);
```

```sql
ALTER TABLE `workspace_board_columns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
```

```sql
ALTER TABLE `workspace_board_columns`
  ADD CONSTRAINT `fk_workspace_columns_board` FOREIGN KEY (`board_id`) REFERENCES `workspace_boards` (`id`) ON DELETE CASCADE;
```

### `workspace_boards`

#### Columnas

```sql
CREATE TABLE `workspace_boards` (
  `id` int(11) NOT NULL,
  `name` varchar(140) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `owner_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_boards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_boards_creator` (`created_by`),
  ADD KEY `idx_workspace_boards_archived` (`is_archived`);
```

```sql
ALTER TABLE `workspace_boards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

### `workspace_card_activity`

#### Columnas

```sql
CREATE TABLE `workspace_card_activity` (
  `id` int(11) NOT NULL,
  `card_id` int(11) NOT NULL,
  `action_key` varchar(80) NOT NULL,
  `action_label` varchar(180) NOT NULL,
  `actor_user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_card_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_activity_card` (`card_id`),
  ADD KEY `idx_workspace_activity_created` (`created_at`);
```

```sql
ALTER TABLE `workspace_card_activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
```

### `workspace_card_checklist_items`

#### Columnas

```sql
CREATE TABLE `workspace_card_checklist_items` (
  `id` int(11) NOT NULL,
  `card_id` int(11) NOT NULL,
  `content` varchar(255) NOT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_card_checklist_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_checklist_card` (`card_id`),
  ADD KEY `idx_workspace_checklist_sort` (`card_id`,`sort_order`);
```

```sql
ALTER TABLE `workspace_card_checklist_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `workspace_card_comments`

#### Columnas

```sql
CREATE TABLE `workspace_card_comments` (
  `id` int(11) NOT NULL,
  `card_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_card_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_comments_card` (`card_id`),
  ADD KEY `idx_workspace_comments_created` (`created_at`);
```

```sql
ALTER TABLE `workspace_card_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `workspace_list_items`

#### Columnas

```sql
CREATE TABLE `workspace_list_items` (
  `id` int(11) NOT NULL,
  `list_id` int(11) NOT NULL,
  `content` varchar(255) NOT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT 0,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_list_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_items_list` (`list_id`),
  ADD KEY `idx_workspace_items_done` (`is_done`),
  ADD KEY `idx_workspace_items_sort` (`list_id`,`sort_order`);
```

```sql
ALTER TABLE `workspace_list_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

```sql
ALTER TABLE `workspace_list_items`
  ADD CONSTRAINT `fk_workspace_items_list` FOREIGN KEY (`list_id`) REFERENCES `workspace_lists` (`id`) ON DELETE CASCADE;
```

### `workspace_lists`

#### Columnas

```sql
CREATE TABLE `workspace_lists` (
  `id` int(11) NOT NULL,
  `title` varchar(140) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `color_tag` varchar(30) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `owner_user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_lists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_lists_creator` (`created_by`),
  ADD KEY `idx_workspace_lists_archived` (`is_archived`);
```

```sql
ALTER TABLE `workspace_lists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
```

### `workspace_notes`

#### Columnas

```sql
CREATE TABLE `workspace_notes` (
  `id` int(11) NOT NULL,
  `title` varchar(160) NOT NULL,
  `content` mediumtext DEFAULT NULL,
  `note_scope` enum('private','team') NOT NULL DEFAULT 'team',
  `pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_notes_scope` (`note_scope`),
  ADD KEY `idx_workspace_notes_pinned` (`pinned`),
  ADD KEY `idx_workspace_notes_creator` (`created_by`);
```

```sql
ALTER TABLE `workspace_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

### `workspace_social_comments`

#### Columnas

```sql
CREATE TABLE `workspace_social_comments` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_social_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_social_comment_post` (`post_id`),
  ADD KEY `idx_workspace_social_comment_created` (`created_at`);
```

```sql
ALTER TABLE `workspace_social_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `workspace_social_mentions`

#### Columnas

```sql
CREATE TABLE `workspace_social_mentions` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `comment_id` int(11) DEFAULT NULL,
  `mentioned_user_id` int(11) NOT NULL,
  `mentioned_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `seen_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_social_mentions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_workspace_post_comment_mention` (`post_id`,`comment_id`,`mentioned_user_id`),
  ADD KEY `idx_workspace_social_mention_post` (`post_id`),
  ADD KEY `idx_workspace_social_mention_user` (`mentioned_user_id`),
  ADD KEY `idx_workspace_social_mention_seen` (`seen_at`);
```

```sql
ALTER TABLE `workspace_social_mentions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
```

### `workspace_social_posts`

#### Columnas

```sql
CREATE TABLE `workspace_social_posts` (
  `id` int(11) NOT NULL,
  `post_type` enum('post','announcement') NOT NULL DEFAULT 'post',
  `title` varchar(180) DEFAULT NULL,
  `content` text NOT NULL,
  `attachment_url` varchar(255) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_size` int(11) DEFAULT NULL,
  `attachment_mime` varchar(120) DEFAULT NULL,
  `pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_social_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_social_type` (`post_type`),
  ADD KEY `idx_workspace_social_pinned` (`pinned`),
  ADD KEY `idx_workspace_social_created` (`created_at`);
```

```sql
ALTER TABLE `workspace_social_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
```

### `workspace_social_reactions`

#### Columnas

```sql
CREATE TABLE `workspace_social_reactions` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reaction_type` enum('like','insightful','celebrate') NOT NULL DEFAULT 'like',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Índices, AUTO_INCREMENT, FK

```sql
ALTER TABLE `workspace_social_reactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_post_user_reaction` (`post_id`,`user_id`,`reaction_type`),
  ADD KEY `idx_workspace_social_react_post` (`post_id`),
  ADD KEY `idx_workspace_social_react_user` (`user_id`);
```

```sql
ALTER TABLE `workspace_social_reactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
```


---

## Vistas

Definición tal como en el volcado (no uses solo la tabla «stand-in» si existe).

### `sr_present_today`

```sql
CREATE ALGORITHM=UNDEFINED DEFINER=`u979547041_bonifacios1`@`127.0.0.1` SQL SECURITY DEFINER VIEW `sr_present_today`  AS SELECT `a`.`id` AS `id`, `a`.`employee_id` AS `employee_id`, `a`.`employee_name` AS `employee_name`, `a`.`position` AS `position`, `a`.`attendance_date` AS `attendance_date`, `a`.`clock_in` AS `clock_in`, `a`.`clock_out` AS `clock_out`, `a`.`shift` AS `shift`, `a`.`status` AS `status`, `a`.`minutes_worked` AS `minutes_worked`, `a`.`notes` AS `notes`, `a`.`created_at` AS `created_at`, `a`.`updated_at` AS `updated_at` FROM `sr_attendance` AS `a` WHERE `a`.`attendance_date` = curdate() AND `a`.`status` = 'present' ORDER BY `a`.`clock_in` DESC ;
```

### `sr_today_sales`

```sql
CREATE ALGORITHM=UNDEFINED DEFINER=`u979547041_bonifacios1`@`127.0.0.1` SQL SECURITY DEFINER VIEW `sr_today_sales`  AS SELECT `s`.`id` AS `id`, `s`.`sr_ticket_id` AS `sr_ticket_id`, `s`.`ticket_number` AS `ticket_number`, `s`.`folio` AS `folio`, `s`.`sale_date` AS `sale_date`, `s`.`sale_time` AS `sale_time`, `s`.`sale_datetime` AS `sale_datetime`, `s`.`table_id` AS `table_id`, `s`.`table_number` AS `table_number`, `s`.`waiter_id` AS `waiter_id`, `s`.`waiter_name` AS `waiter_name`, `s`.`covers` AS `covers`, `s`.`subtotal` AS `subtotal`, `s`.`tax` AS `tax`, `s`.`discount` AS `discount`, `s`.`tip` AS `tip`, `s`.`total` AS `total`, `s`.`status` AS `status`, `s`.`payment_type` AS `payment_type`, `s`.`opened_at` AS `opened_at`, `s`.`closed_at` AS `closed_at`, `s`.`created_at` AS `created_at`, `s`.`updated_at` AS `updated_at` FROM `sr_sales` AS `s` WHERE `s`.`sale_date` = curdate() ORDER BY `s`.`sale_datetime` DESC ;
```

### `v_sales_last_30`

```sql
CREATE ALGORITHM=UNDEFINED DEFINER=`u979547041_bonifacios1`@`127.0.0.1` SQL SECURITY DEFINER VIEW `v_sales_last_30`  AS SELECT `sales_daily`.`sale_date` AS `sale_date`, `sales_daily`.`cash_amount` AS `cash_amount`, `sales_daily`.`card_amount` AS `card_amount`, `sales_daily`.`other_amount` AS `other_amount`, `sales_daily`.`total_amount` AS `total_amount`, `sales_daily`.`covers` AS `covers`, `sales_daily`.`tickets` AS `tickets`, `sales_daily`.`source` AS `source`, dayname(`sales_daily`.`sale_date`) AS `day_name` FROM `sales_daily` WHERE `sales_daily`.`sale_date` >= curdate() - interval 30 day ORDER BY `sales_daily`.`sale_date` DESC ;
```

