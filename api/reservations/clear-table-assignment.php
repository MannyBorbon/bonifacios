<?php
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

    $id = (int)($data['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'id de reservación requerido']);
        exit;
    }

    try {
        $conn->query(
            'ALTER TABLE special_reservations ADD COLUMN secondary_table_code VARCHAR(32) NULL DEFAULT NULL AFTER table_code',
        );
    } catch (Throwable $e) { /* ignore */
    }

    $stmt = $conn->prepare(
        'UPDATE special_reservations SET table_code = NULL, secondary_table_code = NULL, updated_at = NOW() WHERE id = ?',
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows < 1) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Reservación no encontrada']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Mesa liberada en la reservación']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
