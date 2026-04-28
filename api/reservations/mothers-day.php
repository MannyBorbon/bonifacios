<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    $conn = getConnection();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];

    // Campos requeridos
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
    $notes = trim((string)($data['notes'] ?? ''));
    $tableCode = 'MD-' . date('Ymd') . '-' . rand(100, 999);

    // Validaciones básicas
    if ($guests < 1 || $guests > 20) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Numero de personas invalido']);
        exit;
    }

    // Insert simple solo con columnas que existen
    $sql = "INSERT INTO special_reservations 
            (customer_name, phone, email, guests, reservation_date, reservation_time, table_code, notes, occasion, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Dia de las Madres', 'pending', NOW(), NOW())";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sssissss', 
        $customerName, $phone, $email, $guests, $reservationDate, 
        $reservationTime, $tableCode, $notes
    );

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'reservation_id' => $stmt->insert_id,
            'table_code' => $tableCode,
            'message' => '¡Reservación para Día de las Madres recibida correctamente! Te contactaremos pronto.'
        ]);
    } else {
        throw new Exception('Error al guardar: ' . $stmt->error);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
