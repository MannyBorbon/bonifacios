<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
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
    $tableCode = trim((string)($data['table_code'] ?? ''));
    $notes = trim((string)($data['notes'] ?? ''));
    $occasion = trim((string)($data['occasion'] ?? ''));
    $eventTypeId = isset($data['event_type_id']) && $data['event_type_id'] !== '' ? intval($data['event_type_id']) : null;
    
    // Validaciones
    if ($guests < 1 || $guests > 20) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Numero de personas invalido (1-20)']);
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
    
    // Generar código de mesa si no se proporciona
    if (empty($tableCode)) {
        $tableCode = 'Interior Mesa ' . rand(1, 11); // Asignar mesa interior aleatoria
    }
    
    // Ensure event-type support exists
    try {
        $conn->query("ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion");
    } catch (Throwable $e) { /* ignore if already exists */ }

    // Insertar reservación
    $sql = "INSERT INTO special_reservations 
            (customer_name, phone, email, guests, reservation_date, reservation_time, table_code, notes, occasion, event_type_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sssisssssi', 
        $customerName, $phone, $email, $guests, $reservationDate, 
        $reservationTime, $tableCode, $notes, $occasion, $eventTypeId
    );
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'reservation_id' => $stmt->insert_id,
            'table_code' => $tableCode,
            'message' => 'Reservación creada correctamente'
        ]);
    } else {
        throw new Exception('Error al crear reservación: ' . $stmt->error);
    }
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
