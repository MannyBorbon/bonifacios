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
    $item = isset($payload['item']) && is_array($payload['item']) ? $payload['item'] : $payload;
    $itemNorm = bonifacios_layout_validate_item($item);

    if (($itemNorm['id'] ?? 0) > 0) {
        $sql = 'UPDATE reservation_floor_layout_items
                SET item_type = ?, code = ?, zone = ?, label = ?, shape = ?, x_pct = ?, y_pct = ?, w_pct = ?, h_pct = ?,
                    scale = ?, capacity = ?, tone = ?, is_hidden = ?, sort_order = ?
                WHERE id = ?';
        $st = $conn->prepare($sql);
        $st->bind_param(
            'sssssdddddisiii',
            $itemNorm['item_type'],
            $itemNorm['code'],
            $itemNorm['zone'],
            $itemNorm['label'],
            $itemNorm['shape'],
            $itemNorm['x_pct'],
            $itemNorm['y_pct'],
            $itemNorm['w_pct'],
            $itemNorm['h_pct'],
            $itemNorm['scale'],
            $itemNorm['capacity'],
            $itemNorm['tone'],
            $itemNorm['is_hidden'],
            $itemNorm['sort_order'],
            $itemNorm['id'],
        );
        $st->execute();
        $id = (int) $itemNorm['id'];
    } else {
        $sql = 'INSERT INTO reservation_floor_layout_items
                (item_type, code, zone, label, shape, x_pct, y_pct, w_pct, h_pct, scale, capacity, tone, is_hidden, sort_order)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        $st = $conn->prepare($sql);
        $st->bind_param(
            'sssssdddddisii',
            $itemNorm['item_type'],
            $itemNorm['code'],
            $itemNorm['zone'],
            $itemNorm['label'],
            $itemNorm['shape'],
            $itemNorm['x_pct'],
            $itemNorm['y_pct'],
            $itemNorm['w_pct'],
            $itemNorm['h_pct'],
            $itemNorm['scale'],
            $itemNorm['capacity'],
            $itemNorm['tone'],
            $itemNorm['is_hidden'],
            $itemNorm['sort_order'],
        );
        $st->execute();
        $id = (int) $conn->insert_id;
    }

    $out = null;
    $q = $conn->prepare(
        'SELECT id, item_type, code, zone, label, shape, x_pct, y_pct, w_pct, h_pct, scale, capacity, tone, is_hidden, sort_order, updated_at
         FROM reservation_floor_layout_items WHERE id = ? LIMIT 1',
    );
    $q->bind_param('i', $id);
    $q->execute();
    if ($res = $q->get_result()) {
        $row = $res->fetch_assoc();
        if ($row) {
            $out = bonifacios_layout_payload_from_row($row);
        }
    }

    echo json_encode(['success' => true, 'item' => $out, 'id' => $id]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

