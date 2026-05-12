<?php
require_once '../config/database.php';
require_once __DIR__ . '/event-types-bootstrap.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    $conn = getConnection();
    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];

    $required = ['customer_name', 'phone', 'guests', 'reservation_date', 'reservation_time'];
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
    $tableCodeInput = trim((string)($data['table_code'] ?? ''));
    $notes = trim((string)($data['notes'] ?? ''));
    $source = trim((string)($data['source'] ?? ''));
    $occasion = trim((string)($data['occasion'] ?? ''));

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Correo electronico no valido']);
        exit;
    }

    // Esquema canónico: `phpmyadminbonifaciostablas.sql` → table_code VARCHAR(50).
    if ($tableCodeInput === '') {
        $tableCode = 'WEB-' . date('Ymd') . '-' . mt_rand(100, 999);
    } else {
        $tableCode = substr(strtoupper($tableCodeInput), 0, 50);
    }

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

    try {
        $conn->query('ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion');
    } catch (Throwable $e) {
        /* columna ya existe */
    }
    reservations_bootstrap_event_types_if_needed($conn);
    $generalType = reservations_get_event_type_by_slug($conn, 'general');
    if ($generalType === null) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudo cargar la categoria de reserva general']);
        exit;
    }
    $eventTypeId = $generalType['id'];
    if ($occasion === '') {
        $occasion = $generalType['name'];
    }

    $notesOut = $notes;
    if ($source !== '' && $source !== 'home_mothers_day') {
        $notesOut = trim('[origen:' . $source . ']' . ($notesOut !== '' ? "\n" : '') . $notesOut);
    }

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
    if ($checkStmt === false) {
        throw new Exception('prepare check: ' . $conn->error);
    }
    $checkStmt->bind_param('sss', $reservationDate, $tableCode, $hourSlot);
    if (!$checkStmt->execute()) {
        throw new Exception('check execute: ' . $checkStmt->error);
    }
    $exists = $checkStmt->get_result()->fetch_assoc();
    if ($exists) {
        $conn->rollback();
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'La mesa ya esta ocupada para esa hora']);
        exit;
    }

    $canonForBusy = bonifacios_table_canonical_venue_code($tableCode);
    if (
        $canonForBusy !== null
        && $canonForBusy !== ''
        && !preg_match('/^WEB-/i', $tableCode)
        && $reservationDate === date('Y-m-d')
        && bonifacios_table_live_busy($conn, $canonForBusy, $reservationDate)
    ) {
        $conn->rollback();
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'La mesa esta en uso en el restaurante en este momento (cuenta abierta o pendiente de cobro). Elige otra mesa u horario.',
        ]);
        exit;
    }

    // Reservacion desde /reservacion → siempre categoria `general` (eventos importantes usan otros endpoints).
    $insertSql = "INSERT INTO special_reservations
        (customer_name, phone, email, guests, reservation_date, reservation_time, table_code, notes, occasion, event_type_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())";
    $insertStmt = $conn->prepare($insertSql);
    if ($insertStmt === false) {
        throw new Exception('prepare insert: ' . $conn->error);
    }
    $insertStmt->bind_param(
        'sssisssssi',
        $customerName,
        $phone,
        $email,
        $guests,
        $reservationDate,
        $reservationTime,
        $tableCode,
        $notesOut,
        $occasion,
        $eventTypeId
    );

    if (!$insertStmt->execute()) {
        $conn->rollback();
        throw new Exception($insertStmt->error ?: 'No se pudo guardar la reservacion');
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
