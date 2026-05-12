<?php
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$conn = null;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    requireAuth();
    $conn = getConnection();

    $folio = trim((string)($_GET['folio'] ?? ''));
    $sr_ticket_id = trim((string)($_GET['sr_ticket_id'] ?? ''));

    if ($folio === '' && $sr_ticket_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'folio or sr_ticket_id required']);
        $conn->close();
        exit;
    }

    $folio_clean = str_replace('#', '', $folio);
    $ids = [];
    if ($folio !== '') {
        $ids[$folio] = true;
    }
    if ($folio_clean !== '') {
        $ids[$folio_clean] = true;
    }
    if ($sr_ticket_id !== '') {
        $ids[$sr_ticket_id] = true;
    }

    $stmt_ref = $conn->prepare('
        SELECT DISTINCT sr_ticket_id, folio, ticket_number
        FROM sr_sales
        WHERE sr_ticket_id = ? OR sr_ticket_id = ?
           OR folio = ? OR folio = ?
           OR ticket_number = ? OR ticket_number = ?
        LIMIT 20
    ');
    if ($stmt_ref) {
        $stmt_ref->bind_param('ssssss', $sr_ticket_id, $folio_clean, $folio, $folio_clean, $folio, $folio_clean);
        $stmt_ref->execute();
        $res = $stmt_ref->get_result();
        while ($row = $res->fetch_assoc()) {
            if (!empty($row['sr_ticket_id'])) {
                $ids[trim((string)$row['sr_ticket_id'])] = true;
            }
            if (!empty($row['folio'])) {
                $ids[trim((string)$row['folio'])] = true;
            }
            if (!empty($row['ticket_number'])) {
                $ids[trim((string)$row['ticket_number'])] = true;
            }
        }
    }

    $candidateIds = array_values(array_filter(array_keys($ids), static fn ($v) => $v !== ''));

    $items = [];
    if ($candidateIds !== []) {
        $search1 = array_slice($candidateIds, 0, 8);
        $where1 = implode(' OR ', array_fill(0, count($search1), 'folio = ?'));
        $sql1 = "
            SELECT product_id, product_name, category, qty, unit_price, subtotal, discount, notes
            FROM sr_ticket_items
            WHERE {$where1}
            ORDER BY id ASC
        ";
        $stmt = $conn->prepare($sql1);
        if ($stmt) {
            $types = str_repeat('s', count($search1));
            $bindParams = [$types];
            foreach ($search1 as $v) {
                $bindParams[] = $v;
            }
            $refs = [];
            foreach ($bindParams as $k => $v) {
                $refs[$k] = &$bindParams[$k];
            }
            call_user_func_array([$stmt, 'bind_param'], $refs);
            $stmt->execute();
            $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        }
    }

    if ($items === [] && $candidateIds !== []) {
        $search2 = array_slice($candidateIds, 0, 8);
        $where2 = implode(' OR ', array_fill(0, count($search2), 'sr_ticket_id = ?'));
        $sql2 = "
            SELECT product_id, product_name, '' AS category, quantity AS qty, unit_price, subtotal, discount, '' AS notes
            FROM sr_sale_items
            WHERE {$where2}
            ORDER BY id ASC
        ";
        $stmt2 = $conn->prepare($sql2);
        if ($stmt2) {
            $types = str_repeat('s', count($search2));
            $bindParams = [$types];
            foreach ($search2 as $v) {
                $bindParams[] = $v;
            }
            $refs = [];
            foreach ($bindParams as $k => $v) {
                $refs[$k] = &$bindParams[$k];
            }
            call_user_func_array([$stmt2, 'bind_param'], $refs);
            $stmt2->execute();
            $items = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
        }
    }

    foreach ($items as &$i) {
        $i['qty'] = floatval($i['qty'] ?? 0);
        $i['unit_price'] = floatval($i['unit_price'] ?? 0);
        $i['subtotal'] = floatval($i['subtotal'] ?? 0);
        $i['discount'] = floatval($i['discount'] ?? 0);
    }
    unset($i);

    echo json_encode([
        'success' => true,
        'folio' => $folio,
        'sr_ticket_id' => $sr_ticket_id,
        'count' => count($items),
        'items' => $items,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
