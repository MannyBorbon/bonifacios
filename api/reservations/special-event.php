<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    $conn = getConnection();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];

    $required = ['customer_name', 'phone', 'guests', 'reservation_date', 'reservation_time', 'event_type_id'];
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
    $notes = trim((string)($data['notes'] ?? ''));
    $eventTypeId = (int)$data['event_type_id'];

    if ($guests < 1 || $guests > 20) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Numero de personas invalido']);
        exit;
    }

    $evtStmt = $conn->prepare("SELECT id, name, slug FROM reservation_event_types WHERE id = ? AND is_active = 1");
    $evtStmt->bind_param('i', $eventTypeId);
    $evtStmt->execute();
    $event = $evtStmt->get_result()->fetch_assoc();
    if (!$event) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Evento especial no valido']);
        exit;
    }

    try { $conn->query("ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion"); } catch (Throwable $e) { /* ignore */ }

    $tableCode = strtoupper(substr((string)$event['slug'], 0, 2)) . '-' . date('Ymd') . '-' . rand(100, 999);
    $occasion = $event['name'];

    $sql = "INSERT INTO special_reservations
            (customer_name, phone, email, guests, reservation_date, reservation_time, table_code, notes, occasion, event_type_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sssisssssi', $customerName, $phone, $email, $guests, $reservationDate, $reservationTime, $tableCode, $notes, $occasion, $eventTypeId);

    if (!$stmt->execute()) {
        throw new Exception('No se pudo guardar la reservacion');
    }

    echo json_encode([
        'success' => true,
        'reservation_id' => (int)$stmt->insert_id,
        'message' => 'Reservacion especial recibida correctamente'
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

