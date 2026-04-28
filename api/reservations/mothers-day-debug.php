<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    // Test conexión
    $conn = getConnection();
    echo json_encode(['success' => true, 'message' => 'Conexión OK']);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
