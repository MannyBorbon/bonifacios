<?php
/**
 * Webhook / script Soft Restaurant: marcar reserva como cobrada y liberar mesa.
 * Misma lógica que Completar en dashboard (status completed + table_code NULL).
 */
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();

    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    $id = (int)($data['reservation_id'] ?? $data['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'reservation_id requerido']);
        exit;
    }

    $stmt = $conn->prepare(
        "UPDATE special_reservations SET status = 'completed', table_code = NULL, updated_at = NOW() WHERE id = ?
          AND (status IN ('pending','confirmed') OR deposit_status IN ('uploaded','confirmed'))"
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows < 1) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Reservación no encontrada o ya finalizada']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Mesa liberada y reserva completada']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
