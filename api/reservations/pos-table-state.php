<?php
require_once '../config/database.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();

    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    $raw = strtoupper(trim((string) ($data['table_code'] ?? '')));
    $code = bonifacios_table_canonical_venue_code($raw) ?? $raw;
    $state = trim((string)($data['state'] ?? ''));

    if ($code === '' || !in_array($state, ['free', 'open_ticket', 'printed_unpaid'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'table_code y state (free|open_ticket|printed_unpaid) requeridos']);
        exit;
    }

    try {
        $conn->query("CREATE TABLE IF NOT EXISTS pos_table_live_state (
            table_code VARCHAR(32) NOT NULL,
            state ENUM('free','open_ticket','printed_unpaid') NOT NULL DEFAULT 'free',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (table_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) { /* ignore */ }

    if ($state === 'free') {
        $del = $conn->prepare('DELETE FROM pos_table_live_state WHERE table_code = ?');
        $del->bind_param('s', $code);
        $del->execute();
    } else {
        $up = $conn->prepare(
            'INSERT INTO pos_table_live_state (table_code, state) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE state = VALUES(state), updated_at = CURRENT_TIMESTAMP'
        );
        $up->bind_param('ss', $code, $state);
        $up->execute();
    }

    echo json_encode(['success' => true, 'table_code' => $code, 'state' => $state]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
