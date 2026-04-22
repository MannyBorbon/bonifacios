<?php
require_once '../config/database.php';
header('Content-Type: application/json');

$userId = requireAuth();
$conn   = getConnection();

$folio = trim($_GET['folio'] ?? '');
if (!$folio) {
    http_response_code(400);
    echo json_encode(['error' => 'folio required']);
    $conn->close();
    exit;
}

$stmt = $conn->prepare("
    SELECT product_id, product_name, category, qty, unit_price, subtotal, discount, notes
    FROM sr_ticket_items
    WHERE folio = ?
    ORDER BY id ASC
");
$stmt->bind_param('s', $folio);
$stmt->execute();
$items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Castear tipos
foreach ($items as &$i) {
    $i['qty']        = floatval($i['qty']);
    $i['unit_price'] = floatval($i['unit_price']);
    $i['subtotal']   = floatval($i['subtotal']);
    $i['discount']   = floatval($i['discount']);
}

echo json_encode(['success' => true, 'folio' => $folio, 'items' => $items]);
$conn->close();
?>
