<?php
require_once '../config/database.php';
require_once __DIR__ . '/layout-lib.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();
    bonifacios_layout_ensure_table($conn);

    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = [];
    }

    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    $code = isset($payload['code']) ? strtoupper(trim((string) $payload['code'])) : '';
    if ($id <= 0 && $code === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'id o code requerido']);
        exit;
    }

    if ($id > 0) {
        $st = $conn->prepare('DELETE FROM reservation_floor_layout_items WHERE id = ?');
        $st->bind_param('i', $id);
        $st->execute();
        $deleted = (int) $st->affected_rows;
    } else {
        $st = $conn->prepare('DELETE FROM reservation_floor_layout_items WHERE code = ?');
        $st->bind_param('s', $code);
        $st->execute();
        $deleted = (int) $st->affected_rows;
    }

    echo json_encode(['success' => true, 'deleted' => $deleted]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

