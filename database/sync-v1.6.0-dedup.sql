-- ==========================================================
-- Bonifacio's Sync v1.6.0 - Dedupe + Idempotencia
-- Ejecutar en phpMyAdmin (Hostinger) con sincronizador pausado.
-- ==========================================================

-- 0) Respaldos rápidos recomendados
-- CREATE TABLE sr_sales_bak_20260423 AS SELECT * FROM sr_sales;
-- CREATE TABLE sr_cash_movements_bak_20260423 AS SELECT * FROM sr_cash_movements;
-- CREATE TABLE sr_cancellations_bak_20260423 AS SELECT * FROM sr_cancellations;
-- CREATE TABLE sr_ticket_items_bak_20260423 AS SELECT * FROM sr_ticket_items;

-- 1) Limpiar duplicados sr_sales por sr_ticket_id (conservar id más alto)
DELETE s1
FROM sr_sales s1
JOIN sr_sales s2
  ON s1.sr_ticket_id = s2.sr_ticket_id
 AND s1.id < s2.id
WHERE s1.sr_ticket_id IS NOT NULL
  AND s1.sr_ticket_id <> '';

-- 2) Limpiar duplicados sr_cash_movements por movement_id
DELETE m1
FROM sr_cash_movements m1
JOIN sr_cash_movements m2
  ON m1.movement_id = m2.movement_id
 AND m1.id < m2.id
WHERE m1.movement_id IS NOT NULL
  AND m1.movement_id <> '';

-- 3) Limpiar duplicados sr_cancellations por (ticket_number, cancel_date)
DELETE c1
FROM sr_cancellations c1
JOIN sr_cancellations c2
  ON c1.ticket_number = c2.ticket_number
 AND c1.cancel_date   = c2.cancel_date
 AND c1.id < c2.id;

-- 4) Agregar llaves únicas para habilitar ON DUPLICATE KEY real (idempotente)
-- Si el índice ya existe, no hace nada.
SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db
    AND table_name = 'sr_sales'
    AND index_name = 'uq_sr_sales_ticket'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE sr_sales ADD UNIQUE KEY uq_sr_sales_ticket (sr_ticket_id)',
  'SELECT "skip uq_sr_sales_ticket (already exists)"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db
    AND table_name = 'sr_cash_movements'
    AND index_name = 'uq_sr_cash_movements_movement'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE sr_cash_movements ADD UNIQUE KEY uq_sr_cash_movements_movement (movement_id)',
  'SELECT "skip uq_sr_cash_movements_movement (already exists)"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db
    AND table_name = 'sr_cancellations'
    AND index_name = 'uq_sr_cancellations_ticket_date'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE sr_cancellations ADD UNIQUE KEY uq_sr_cancellations_ticket_date (ticket_number, cancel_date)',
  'SELECT "skip uq_sr_cancellations_ticket_date (already exists)"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) Índice de apoyo para ticket items (idempotente)
SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db
    AND table_name = 'sr_ticket_items'
    AND index_name = 'idx_sr_ticket_items_folio'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE sr_ticket_items ADD INDEX idx_sr_ticket_items_folio (folio)',
  'SELECT "skip idx_sr_ticket_items_folio (already exists)"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) Verificación rápida post-migración
-- SELECT sr_ticket_id, COUNT(*) c FROM sr_sales GROUP BY sr_ticket_id HAVING c > 1;
-- SELECT movement_id, COUNT(*) c FROM sr_cash_movements GROUP BY movement_id HAVING c > 1;
-- SELECT ticket_number, cancel_date, COUNT(*) c FROM sr_cancellations GROUP BY ticket_number, cancel_date HAVING c > 1;
