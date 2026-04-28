<?php
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    // Solo para debug - recibir y mostrar datos
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    if (!is_array($data)) {
        throw new Exception('Datos inválidos recibidos: ' . $rawInput);
    }
    
    // Simular respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Datos recibidos correctamente (debug mode)',
        'data_received' => $data,
        'reservation_id' => 12345,
        'table_code' => 'MD-20260510-123'
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
