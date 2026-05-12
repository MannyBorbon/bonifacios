<?php
/**
 * Alta de cotización pública desde el cotizador de eventos (sin sesión).
 * Inserta `event_quotes` + snapshot en `quote_cotizaciones` (v1).
 */

require_once __DIR__ . '/../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw !== false ? $raw : '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido']);
    exit;
}

$contact = $payload['contact'] ?? null;
$items = $payload['items'] ?? null;
$clientTotal = isset($payload['total']) ? (float) $payload['total'] : null;

if (!is_array($contact) || !is_array($items)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'contact e items son obligatorios']);
    exit;
}

$name = trim((string) ($contact['name'] ?? ''));
$phone = trim((string) ($contact['phone'] ?? ''));
$email = trim((string) ($contact['email'] ?? ''));
$eventType = trim((string) ($contact['type'] ?? ''));
$eventDate = trim((string) ($contact['date'] ?? ''));
$guestsRaw = $contact['guests'] ?? '';
$notesUser = trim((string) ($contact['notes'] ?? ''));

if ($name === '' || mb_strlen($name) > 255) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nombre inválido']);
    exit;
}
if ($phone === '' || mb_strlen($phone) > 50) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Teléfono inválido']);
    exit;
}
if ($eventType === '' || mb_strlen($eventType) > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Tipo de evento inválido']);
    exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $eventDate)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Fecha de evento inválida']);
    exit;
}

$guests = is_numeric($guestsRaw) ? (int) $guestsRaw : 0;
if ($guests < 0 || $guests > 50000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Número de invitados inválido']);
    exit;
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Correo electrónico inválido']);
    exit;
}
if ($email === '') {
    $email = 'pendiente-cotizador@bonifaciossancarlos.com';
}

if (count($items) === 0 || count($items) > 80) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'El carrito debe tener entre 1 y 80 productos']);
    exit;
}

$normalized = [];
$calcTotal = 0.0;

foreach ($items as $row) {
    if (!is_array($row)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato de ítem inválido']);
        exit;
    }
    $mid = isset($row['id']) ? (int) $row['id'] : 0;
    $qty = isset($row['qty']) ? (int) $row['qty'] : 0;
    $price = isset($row['price']) ? (float) $row['price'] : 0.0;
    $iname = trim((string) ($row['name'] ?? ''));
    if ($mid < 0 || $mid > 2147483647 || $qty < 1 || $qty > 999) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cantidad o producto inválido']);
        exit;
    }
    if ($iname === '' || mb_strlen($iname) > 255 || $price < 0 || $price > 999999.99) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Producto o precio inválido']);
        exit;
    }
    $line = round($price * $qty, 2);
    $calcTotal += $line;
    $normalized[] = [
        'menu_item_id' => $mid,
        'name'         => $iname,
        'qty'          => $qty,
        'unit_price'   => round($price, 2),
        'line_total'   => $line,
    ];
}

$calcTotal = round($calcTotal, 2);
if ($clientTotal === null || abs($calcTotal - (float) $clientTotal) > 0.05) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'El total no coincide con los productos']);
    exit;
}

$notes = $notesUser;
if ($notes !== '' && mb_strlen($notes) > 6000) {
    $notes = mb_substr($notes, 0, 6000);
}
$notesPrefix = '[Cotizador público web] ';
$notes = $notes === '' ? $notesPrefix . 'Origen: formulario /cotizador' : $notesPrefix . $notes;

$conn = getConnection();

try {
    $conn->begin_transaction();

    $location = '';
    $status = 'nueva_solicitud';
    $quoteStr = number_format($calcTotal, 2, '.', '');

    $sql = 'INSERT INTO event_quotes (
        name, phone, email, event_type, event_type_other, event_date, guests, notes, location, status, quote_amount, assigned_to, created_at
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, NOW())';

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('prepare event_quotes: ' . $conn->error);
    }

    $bindTypes = str_repeat('s', 5) . 'i' . str_repeat('s', 4);
    $stmt->bind_param(
        $bindTypes,
        $name,
        $phone,
        $email,
        $eventType,
        $eventDate,
        $guests,
        $notes,
        $location,
        $status,
        $quoteStr
    );

    if (!$stmt->execute()) {
        throw new RuntimeException('insert event_quotes: ' . $stmt->error);
    }

    $quoteId = (int) $stmt->insert_id;
    $stmt->close();

    $folio = 'EVT-' . str_pad((string) $quoteId, 6, '0', STR_PAD_LEFT);

    $cotPayload = [
        'source'       => 'public_event_cotizador',
        'folio'        => $folio,
        'items'        => $normalized,
        'contact'      => [
            'name'   => $name,
            'phone'  => $phone,
            'email'  => $email === 'pendiente-cotizador@bonifaciossancarlos.com' ? '' : $email,
            'type'   => $eventType,
            'date'   => $eventDate,
            'guests' => $guests,
            'notes'  => $notesUser,
        ],
        'total'        => $calcTotal,
        'submitted_at' => date('c'),
    ];

    $dataJson = json_encode($cotPayload, JSON_UNESCAPED_UNICODE);
    if ($dataJson === false) {
        throw new RuntimeException('json_encode cotización');
    }

    $v = 1;
    $stmt2 = $conn->prepare(
        'INSERT INTO quote_cotizaciones (quote_id, version_number, data, is_final, created_by) VALUES (?, ?, ?, 1, NULL)'
    );
    if (!$stmt2) {
        throw new RuntimeException('prepare quote_cotizaciones: ' . $conn->error);
    }
    $stmt2->bind_param('iis', $quoteId, $v, $dataJson);
    if (!$stmt2->execute()) {
        throw new RuntimeException('insert quote_cotizaciones: ' . $stmt2->error);
    }
    $stmt2->close();

    $conn->commit();

    echo json_encode([
        'success'  => true,
        'folio'    => $folio,
        'quote_id' => $quoteId,
        'total'    => $calcTotal,
    ]);
    $conn->close();
    exit;
} catch (Throwable $e) {
    try {
        $conn->rollback();
    } catch (Throwable $ignored) {
    }
    error_log('public-submit.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo registrar la cotización. Intenta más tarde.']);
}

$conn->close();
