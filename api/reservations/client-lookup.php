<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$normalizePhone = static function (string $phone): string {
    return preg_replace('/\D+/', '', $phone);
};

try {
    $conn = getConnection();
    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];

    $phoneRaw = trim((string)($data['phone'] ?? ''));
    $phone = $normalizePhone($phoneRaw);
    if (strlen($phone) < 10) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Numero de celular invalido']);
        exit;
    }

    $sqlPhoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),'+',''),'.',''),'/','')";
    $sql = "SELECT id, customer_name, phone, email, guests, reservation_date, reservation_time, table_code, notes, occasion, status,
                   deposit_status, deposit_screenshot, deposit_uploaded_at, created_at, updated_at
            FROM special_reservations
            WHERE RIGHT($sqlPhoneExpr, 10) = RIGHT(?, 10)
            ORDER BY reservation_date DESC, reservation_time DESC, created_at DESC
            LIMIT 30";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('s', $phone);
    $stmt->execute();
    $result = $stmt->get_result();

    $reservations = [];
    while ($row = $result->fetch_assoc()) $reservations[] = $row;

    echo json_encode([
        'success' => true,
        'reservations' => $reservations
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

