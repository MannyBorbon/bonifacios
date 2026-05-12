<?php
require_once '../config/database.php';
require_once __DIR__ . '/layout-lib.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();
    bonifacios_layout_ensure_table($conn);

    $rows = [];
    $q = $conn->query(
        'SELECT id, item_type, code, zone, label, shape, x_pct, y_pct, w_pct, h_pct, scale, capacity, tone, is_hidden, sort_order, updated_at
         FROM reservation_floor_layout_items
         ORDER BY zone ASC, sort_order ASC, id ASC',
    );
    if ($q) {
        while ($row = $q->fetch_assoc()) {
            $rows[] = bonifacios_layout_payload_from_row($row);
        }
    }

    echo json_encode([
        'success' => true,
        'items' => $rows,
        'count' => count($rows),
        'generated_at' => date('c'),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

