<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID invalido']);
        exit;
    }

    try {
        $conn->query("ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion");
    } catch (Throwable $e) { /* ignore if exists */ }

    $sql = "SELECT id, customer_name, phone, email, guests, reservation_date, reservation_time, table_code, notes, occasion, event_type_id, status, created_at, updated_at
            FROM special_reservations
            WHERE id = ?
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Reservacion no encontrada']);
        exit;
    }

    echo json_encode(['success' => true, 'reservation' => $row]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

