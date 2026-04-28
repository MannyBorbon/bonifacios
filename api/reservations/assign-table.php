<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];
    
    $id = (int)($data['id'] ?? 0);
    $tableCode = trim((string)($data['table_code'] ?? ''));
    
    if ($id <= 0 || empty($tableCode)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de reservación y código de mesa son requeridos']);
        exit;
    }
    
    // Validar formato del código de mesa (ej: CD-5, TA-15, TB-3)
    if (!preg_match('/^(CD|TA|TB)-\d+$/', $tableCode)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato de mesa inválido. Use: CD-1, TA-15, TB-3']);
        exit;
    }
    
    // Verificar que la reservación existe
    $checkSql = "SELECT id FROM special_reservations WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    
    if ($checkStmt->get_result()->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Reservación no encontrada']);
        exit;
    }
    
    // Actualizar el código de mesa
    $updateSql = "UPDATE special_reservations SET table_code = ?, updated_at = NOW() WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param('si', $tableCode, $id);
    
    if ($updateStmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Mesa asignada correctamente',
            'table_code' => $tableCode
        ]);
    } else {
        throw new Exception('Error al asignar mesa: ' . $updateStmt->error);
    }
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
