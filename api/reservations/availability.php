<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $conn = getConnection();

    // Log para debugging
    $rawInput = file_get_contents('php://input');
    error_log('availability.php - Raw input: ' . $rawInput);
    error_log('availability.php - REQUEST_METHOD: ' . $_SERVER['REQUEST_METHOD']);

    // Aceptar tanto GET como POST
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('availability.php - JSON parse error: ' . json_last_error_msg());
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON: ' . json_last_error_msg()]);
            exit;
        }
        $date = trim((string)($data['reservation_date'] ?? ''));
        $time = trim((string)($data['reservation_time'] ?? ''));
        error_log("availability.php - Parsed: date='$date', time='$time'");
    } else {
        $date = trim((string)($_GET['date'] ?? ''));
        $time = trim((string)($_GET['time'] ?? ''));
    }

    if ($date === '' || $time === '') {
        error_log("availability.php - Error: date='$date', time='$time' (empty)");
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Fecha y hora son requeridas', 'received_date' => $date, 'received_time' => $time]);
        exit;
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato de fecha invalido']);
        exit;
    }

    if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato de hora invalido']);
        exit;
    }

    $hourSlot = substr($time, 0, 2) . ':00:00';

    $sql = "SELECT id, customer_name, guests, table_code, reservation_time, status, deposit_status
            FROM special_reservations
            WHERE reservation_date = ?
              AND TIME_FORMAT(reservation_time, '%H:00:00') = ?
              AND status IN ('pending', 'confirmed')";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $date, $hourSlot);
    $stmt->execute();
    $result = $stmt->get_result();

    $occupied = [];
    while ($row = $result->fetch_assoc()) {
        $occupied[] = $row;
    }

    $tableCodes = array_values(array_unique(array_map(static function ($row) {
        return (string)($row['table_code'] ?? '');
    }, $occupied)));

    // Presion de ocupacion por mesa durante el dia completo (sirve para recomendaciones)
    $pressureSql = "SELECT table_code, COUNT(*) AS total
                    FROM special_reservations
                    WHERE reservation_date = ?
                      AND status IN ('pending', 'confirmed')
                    GROUP BY table_code";
    $pressureStmt = $conn->prepare($pressureSql);
    $pressureStmt->bind_param('s', $date);
    $pressureStmt->execute();
    $pressureRes = $pressureStmt->get_result();
    $tablePressure = [];
    while ($row = $pressureRes->fetch_assoc()) {
        $tablePressure[(string)$row['table_code']] = (int)$row['total'];
    }

    echo json_encode([
        'success' => true,
        'date' => $date,
        'time' => $time,
        'hour_slot' => $hourSlot,
        'occupied_table_codes' => $tableCodes,
        'occupied' => $occupied,
        'table_pressure' => $tablePressure
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
