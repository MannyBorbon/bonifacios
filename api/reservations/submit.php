<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    $conn = getConnection();
    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];

    $required = ['customer_name', 'phone', 'guests', 'reservation_date', 'reservation_time', 'table_code'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Campo requerido: {$field}"]);
            exit;
        }
    }

    $customerName = trim((string)$data['customer_name']);
    $phone = trim((string)$data['phone']);
    $email = trim((string)($data['email'] ?? ''));
    $guests = (int)$data['guests'];
    $reservationDate = trim((string)$data['reservation_date']);
    $reservationTime = trim((string)$data['reservation_time']);
    $tableCode = strtoupper(trim((string)$data['table_code']));
    $notes = trim((string)($data['notes'] ?? ''));
    $occasion = trim((string)($data['occasion'] ?? 'Dia de las Madres'));
    $source = trim((string)($data['source'] ?? 'home_mothers_day'));
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

    if ($guests < 1 || $guests > 30) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Numero de personas invalido']);
        exit;
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $reservationDate)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato de fecha invalido']);
        exit;
    }

    if (!preg_match('/^\d{2}:\d{2}$/', $reservationTime)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato de hora invalido']);
        exit;
    }

    $hourSlot = substr($reservationTime, 0, 2) . ':00:00';

    $conn->begin_transaction();

    $checkSql = "SELECT id
                 FROM special_reservations
                 WHERE reservation_date = ?
                   AND table_code = ?
                   AND TIME_FORMAT(reservation_time, '%H:00:00') = ?
                   AND status IN ('pending', 'confirmed')
                 LIMIT 1
                 FOR UPDATE";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param('sss', $reservationDate, $tableCode, $hourSlot);
    $checkStmt->execute();
    $exists = $checkStmt->get_result()->fetch_assoc();
    if ($exists) {
        $conn->rollback();
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'La mesa ya esta ocupada para esa hora']);
        exit;
    }

    $insertSql = "INSERT INTO special_reservations
        (customer_name, phone, email, guests, reservation_date, reservation_time, table_code, notes, occasion, source, status, ip_address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())";
    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->bind_param(
        'sssisssssss',
        $customerName,
        $phone,
        $email,
        $guests,
        $reservationDate,
        $reservationTime,
        $tableCode,
        $notes,
        $occasion,
        $source,
        $ipAddress
    );

    if (!$insertStmt->execute()) {
        $conn->rollback();
        throw new Exception('No se pudo guardar la reservacion');
    }

    $conn->commit();

    echo json_encode([
        'success' => true,
        'reservation_id' => (int)$insertStmt->insert_id,
        'message' => 'Reservacion recibida correctamente'
    ]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        try { $conn->rollback(); } catch (Throwable $ignore) {}
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
