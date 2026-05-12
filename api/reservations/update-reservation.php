<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();

    $payload = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = [];
    }

    $id = isset($payload['id']) ? (int) $payload['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID inválido']);
        exit;
    }

    $customerName = trim((string) ($payload['customer_name'] ?? ''));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $guests = isset($payload['guests']) ? (int) $payload['guests'] : 0;
    $reservationDate = trim((string) ($payload['reservation_date'] ?? ''));
    $reservationTime = trim((string) ($payload['reservation_time'] ?? ''));
    $occasion = trim((string) ($payload['occasion'] ?? ''));
    $status = strtolower(trim((string) ($payload['status'] ?? 'pending')));
    $notes = trim((string) ($payload['notes'] ?? ''));
    $eventTypeId = isset($payload['event_type_id']) && $payload['event_type_id'] !== ''
        ? (int) $payload['event_type_id']
        : null;

    if ($customerName === '' || $phone === '' || $guests <= 0 || $reservationDate === '' || $reservationTime === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Faltan campos requeridos']);
        exit;
    }
    if ($guests < 1 || $guests > 30) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Número de personas inválido']);
        exit;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $reservationDate)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Fecha inválida (YYYY-MM-DD)']);
        exit;
    }
    if (!preg_match('/^\d{2}:\d{2}$/', $reservationTime)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Hora inválida (HH:MM)']);
        exit;
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Correo inválido']);
        exit;
    }

    $allowedStatus = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!in_array($status, $allowedStatus, true)) {
        $status = 'pending';
    }

    try {
        $conn->query('ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion');
    } catch (Throwable $e) { /* columna ya existe */
    }

    if ($eventTypeId !== null) {
        $chk = $conn->prepare('SELECT id FROM reservation_event_types WHERE id = ? LIMIT 1');
        if ($chk) {
            $chk->bind_param('i', $eventTypeId);
            $chk->execute();
            $ok = $chk->get_result()->fetch_assoc();
            if (!$ok) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Tipo de evento no válido']);
                exit;
            }
        }
    }

    if ($eventTypeId === null) {
        $sql = 'UPDATE special_reservations
                SET customer_name = ?, phone = ?, email = ?, guests = ?, reservation_date = ?, reservation_time = ?,
                    occasion = ?, event_type_id = NULL, status = ?, notes = ?, updated_at = NOW()
                WHERE id = ?';
        $st = $conn->prepare($sql);
        $st->bind_param(
            'sssisssssi',
            $customerName,
            $phone,
            $email,
            $guests,
            $reservationDate,
            $reservationTime,
            $occasion,
            $status,
            $notes,
            $id,
        );
    } else {
        $sql = 'UPDATE special_reservations
                SET customer_name = ?, phone = ?, email = ?, guests = ?, reservation_date = ?, reservation_time = ?,
                    occasion = ?, event_type_id = ?, status = ?, notes = ?, updated_at = NOW()
                WHERE id = ?';
        $st = $conn->prepare($sql);
        $st->bind_param(
            'sssisssissi',
            $customerName,
            $phone,
            $email,
            $guests,
            $reservationDate,
            $reservationTime,
            $occasion,
            $eventTypeId,
            $status,
            $notes,
            $id,
        );
    }
    $st->execute();

    $out = null;
    $q = $conn->prepare(
        'SELECT sr.*, ret.name AS event_type_name, ret.slug AS event_type_slug
         FROM special_reservations sr
         LEFT JOIN reservation_event_types ret ON ret.id = sr.event_type_id
         WHERE sr.id = ?
         LIMIT 1',
    );
    $q->bind_param('i', $id);
    $q->execute();
    $out = $q->get_result()->fetch_assoc();

    echo json_encode([
        'success' => true,
        'reservation' => $out,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

