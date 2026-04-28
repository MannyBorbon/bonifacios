<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    $conn = getConnection();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];

    $phoneRaw = trim((string)($data['phone'] ?? ''));
    $phone = preg_replace('/\D+/', '', $phoneRaw);
    
    // Debug: Mostrar qué recibimos
    echo json_encode([
        'success' => true,
        'debug' => [
            'phone_raw' => $phoneRaw,
            'phone_clean' => $phone,
            'phone_length' => strlen($phone),
            'data_received' => $data
        ],
        'message' => 'Debug info - phone processing'
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
