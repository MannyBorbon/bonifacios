<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();

    // Create table on demand for shared-hosting compatibility
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
    try { $conn->query("ALTER TABLE reservation_event_types ADD COLUMN is_home_cta TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) { /* ignore */ }
    try { $conn->query("ALTER TABLE reservation_event_types ADD COLUMN is_special TINYINT(1) NOT NULL DEFAULT 1"); } catch (Throwable $e) { /* ignore */ }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $public = isset($_GET['public']) && $_GET['public'] === '1';
        $homeOnly = isset($_GET['home']) && $_GET['home'] === '1';
        $where = $public ? "WHERE is_active = 1" : "WHERE 1=1";
        if ($homeOnly) $where .= " AND is_home_cta = 1";
        $result = $conn->query("SELECT id, name, slug, event_date, start_time, end_time, is_active, is_home_cta, is_special FROM reservation_event_types {$where} ORDER BY event_date IS NULL, event_date ASC, name ASC");
        $events = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $events[] = $row;
            }
        }

        if (count($events) === 0) {
            $defaults = [
                ['General', 'general', 0],
                ['San Valentin', 'san-valentin', 1],
                ['Dia de las Madres', 'dia-madres', 1],
                ['Dia del Padre', 'dia-del-padre', 1],
                ['Halloween', 'halloween', 1],
                ['Posadas', 'posadas', 1],
                ['Navidad', 'navidad', 1],
                ['Ano Nuevo', 'ano-nuevo', 1]
            ];
            $ins = $conn->prepare("INSERT IGNORE INTO reservation_event_types (name, slug, is_active, is_special) VALUES (?, ?, 1, ?)");
            foreach ($defaults as $d) {
                $ins->bind_param('ssi', $d[0], $d[1], $d[2]);
                $ins->execute();
            }
            $result = $conn->query("SELECT id, name, slug, event_date, start_time, end_time, is_active, is_home_cta, is_special FROM reservation_event_types {$where} ORDER BY event_date IS NULL, event_date ASC, name ASC");
            while ($row = $result->fetch_assoc()) {
                $events[] = $row;
            }
        }

        echo json_encode(['success' => true, 'events' => $events]);
        exit;
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = trim((string)($data['action'] ?? ''));
        if ($action === 'set_home_cta') {
            $targetId = intval($data['id'] ?? 0);
            if ($targetId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id requerido']);
                exit;
            }
            $conn->query("UPDATE reservation_event_types SET is_home_cta = 0");
            $stmt = $conn->prepare("UPDATE reservation_event_types SET is_home_cta = 1, is_active = 1 WHERE id = ?");
            $stmt->bind_param('i', $targetId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }
        $name = trim((string)($data['name'] ?? ''));
        $slug = trim((string)($data['slug'] ?? ''));
        $eventDate = trim((string)($data['event_date'] ?? ''));
        $startTime = trim((string)($data['start_time'] ?? ''));
        $endTime = trim((string)($data['end_time'] ?? ''));
        $isSpecial = isset($data['is_special']) ? (int)!!$data['is_special'] : 1;

        if ($name === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'El nombre del evento es obligatorio']);
            exit;
        }

        if ($slug === '') {
            $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
        }

        $stmt = $conn->prepare("INSERT INTO reservation_event_types (name, slug, event_date, start_time, end_time, is_active, is_special) VALUES (?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), 1, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), event_date = VALUES(event_date), start_time = VALUES(start_time), end_time = VALUES(end_time), is_active = 1, is_special = VALUES(is_special)");
        $stmt->bind_param('sssssi', $name, $slug, $eventDate, $startTime, $endTime, $isSpecial);
        $stmt->execute();

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

