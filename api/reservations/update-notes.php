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
    $notes = trim((string)($data['notes'] ?? ''));
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de reservación inválido']);
        exit;
    }
    
    // Verificar que la reservación existe
    $checkSql = "SELECT id FROM special_reservations WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    $exists = $checkStmt->get_result()->fetch_assoc();
    
    if (!$exists) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Reservación no encontrada']);
        exit;
    }
    
    // Actualizar notas
    $updateSql = "UPDATE special_reservations 
                   SET notes = ?, updated_at = NOW() 
                   WHERE id = ?";
    
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param('si', $notes, $id);
    
    if ($updateStmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Notas actualizadas correctamente',
            'notes' => $notes
        ]);
    } else {
        throw new Exception('Error al actualizar notas: ' . $updateStmt->error);
    }
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
