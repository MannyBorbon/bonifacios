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
    $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : [];
    $replaceAll = !empty($payload['replace_all']);

    $normalized = [];
    foreach ($items as $rawItem) {
        if (!is_array($rawItem)) {
            continue;
        }
        $normalized[] = bonifacios_layout_validate_item($rawItem);
    }

    $conn->begin_transaction();
    try {
        $keepIds = [];

        $selectByCode = $conn->prepare(
            'SELECT id FROM reservation_floor_layout_items WHERE code = ? LIMIT 1',
        );
        $update = $conn->prepare(
            'UPDATE reservation_floor_layout_items
             SET item_type = ?, code = ?, zone = ?, label = ?, shape = ?, x_pct = ?, y_pct = ?, w_pct = ?, h_pct = ?,
                 scale = ?, capacity = ?, tone = ?, is_hidden = ?, sort_order = ?
             WHERE id = ?',
        );
        $insert = $conn->prepare(
            'INSERT INTO reservation_floor_layout_items
             (item_type, code, zone, label, shape, x_pct, y_pct, w_pct, h_pct, scale, capacity, tone, is_hidden, sort_order)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        );

        foreach ($normalized as $item) {
            $code = isset($item['code']) ? (string) $item['code'] : '';
            $existingId = 0;
            if ($code !== '') {
                $selectByCode->bind_param('s', $code);
                $selectByCode->execute();
                $found = $selectByCode->get_result();
                $rowFound = $found ? $found->fetch_assoc() : false;
                if ($rowFound) {
                    $existingId = (int) ($rowFound['id'] ?? 0);
                }
            }

            $clientId = (int) ($item['id'] ?? 0);
            $targetId = $existingId > 0 ? $existingId : (($clientId > 0 && $existingId <= 0) ? $clientId : 0);

            if ($targetId > 0) {
                $update->bind_param(
                    'sssssdddddisiii',
                    $item['item_type'],
                    $item['code'],
                    $item['zone'],
                    $item['label'],
                    $item['shape'],
                    $item['x_pct'],
                    $item['y_pct'],
                    $item['w_pct'],
                    $item['h_pct'],
                    $item['scale'],
                    $item['capacity'],
                    $item['tone'],
                    $item['is_hidden'],
                    $item['sort_order'],
                    $targetId,
                );
                $update->execute();
                $keepIds[] = $targetId;
                continue;
            }

            $insert->bind_param(
                'sssssdddddisii',
                $item['item_type'],
                $item['code'],
                $item['zone'],
                $item['label'],
                $item['shape'],
                $item['x_pct'],
                $item['y_pct'],
                $item['w_pct'],
                $item['h_pct'],
                $item['scale'],
                $item['capacity'],
                $item['tone'],
                $item['is_hidden'],
                $item['sort_order'],
            );
            $insert->execute();
            $keepIds[] = (int) $conn->insert_id;
        }

        if ($replaceAll) {
            if (!empty($keepIds)) {
                $idList = implode(',', array_map('intval', array_unique($keepIds)));
                $conn->query("DELETE FROM reservation_floor_layout_items WHERE id NOT IN ($idList)");
            } else {
                $conn->query('DELETE FROM reservation_floor_layout_items');
            }
        }

        $conn->commit();
    } catch (Throwable $txe) {
        $conn->rollback();
        throw $txe;
    }

    $out = [];
    $q = $conn->query(
        'SELECT id, item_type, code, zone, label, shape, x_pct, y_pct, w_pct, h_pct, scale, capacity, tone, is_hidden, sort_order, updated_at
         FROM reservation_floor_layout_items
         ORDER BY zone ASC, sort_order ASC, id ASC',
    );
    if ($q) {
        while ($row = $q->fetch_assoc()) {
            $out[] = bonifacios_layout_payload_from_row($row);
        }
    }

    echo json_encode([
        'success' => true,
        'items' => $out,
        'count' => count($out),
        'replace_all' => $replaceAll,
    ]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

