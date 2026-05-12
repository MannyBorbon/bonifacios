<?php
/**
 * Resolución de categorías de reserva por `slug`.
 *
 * Esquema y datos canónicos: `phpmyadminbonifaciostablas.sql` (tabla `reservation_event_types`
 * + columna `special_reservations.event_type_id`). Este archivo solo crea/semilla si la tabla
 * no existe o faltan slugs (entornos sin importar el dump completo).
 */
declare(strict_types=1);

/**
 * @return never
 */
function reservations_bootstrap_throw(string $msg): void
{
    throw new RuntimeException($msg);
}

function reservations_event_types_table_exists(mysqli $conn): bool
{
    $r = $conn->query("SHOW TABLES LIKE 'reservation_event_types'");
    return $r instanceof mysqli_result && $r->num_rows > 0;
}

function reservations_ensure_event_types_table(mysqli $conn): void
{
    $conn->query("
        CREATE TABLE IF NOT EXISTS reservation_event_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            slug VARCHAR(80) NOT NULL UNIQUE,
            event_date DATE NULL,
            start_time TIME NULL,
            end_time TIME NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            is_home_cta TINYINT(1) NOT NULL DEFAULT 0,
            is_special TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    try {
        $conn->query('ALTER TABLE reservation_event_types ADD COLUMN is_home_cta TINYINT(1) NOT NULL DEFAULT 0');
    } catch (Throwable $e) {
    }
    try {
        $conn->query('ALTER TABLE reservation_event_types ADD COLUMN is_special TINYINT(1) NOT NULL DEFAULT 1');
    } catch (Throwable $e) {
    }
}

/**
 * Mismos slugs/nombres que el INSERT del dump `phpmyadminbonifaciostablas.sql` (INSERT IGNORE no pisa filas existentes).
 *
 * @return void
 */
function reservations_seed_default_event_types(mysqli $conn): void
{
    $defaults = [
        ['Reserva general', 'general', 0],
        ['San Valentín', 'san-valentin', 1],
        ['Día de las Madres', 'dia-madres', 1],
        ['Día del Padre', 'dia-del-padre', 1],
        ['Halloween', 'halloween', 1],
        ['Posadas', 'posadas', 1],
        ['Navidad', 'navidad', 1],
        ['Año Nuevo', 'ano-nuevo', 1],
    ];
    $ins = $conn->prepare('INSERT IGNORE INTO reservation_event_types (name, slug, is_active, is_special) VALUES (?, ?, 1, ?)');
    if ($ins === false) {
        reservations_bootstrap_throw('prepare seed event types: ' . $conn->error);
    }
    foreach ($defaults as $d) {
        $ins->bind_param('ssi', $d[0], $d[1], $d[2]);
        $ins->execute();
    }
}

function reservations_normalize_default_event_names(mysqli $conn): void
{
    $stmt = $conn->prepare('UPDATE reservation_event_types SET name = ? WHERE slug = ?');
    if ($stmt === false) {
        return;
    }

    $canonicalBySlug = [
        'san-valentin' => 'San Valentín',
        'dia-madres' => 'Día de las Madres',
        'dia-del-padre' => 'Día del Padre',
        'ano-nuevo' => 'Año Nuevo',
    ];

    foreach ($canonicalBySlug as $slug => $name) {
        $stmt->bind_param('ss', $name, $slug);
        $stmt->execute();
    }
}

/**
 * Si ya importaste `phpmyadminbonifaciostablas.sql`, no hace nada salvo que falte algún slug.
 */
function reservations_bootstrap_event_types_if_needed(mysqli $conn): void
{
    if (!reservations_event_types_table_exists($conn)) {
        reservations_ensure_event_types_table($conn);
        reservations_seed_default_event_types($conn);

        return;
    }
    $general = reservations_get_event_type_by_slug($conn, 'general');
    $madres = reservations_get_event_type_by_slug($conn, 'dia-madres');
    if ($general === null || $madres === null) {
        reservations_seed_default_event_types($conn);
    }
    reservations_normalize_default_event_names($conn);
}

/**
 * @return array{id:int,name:string,slug:string}|null
 */
function reservations_get_event_type_by_slug(mysqli $conn, string $slug): ?array
{
    $stmt = $conn->prepare('SELECT id, name, slug FROM reservation_event_types WHERE slug = ? AND is_active = 1 LIMIT 1');
    if ($stmt === false) {
        return null;
    }
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) {
        return null;
    }

    return [
        'id' => (int) $row['id'],
        'name' => (string) $row['name'],
        'slug' => (string) $row['slug'],
    ];
}
