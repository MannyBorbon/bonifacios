<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();

    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) $data = [];

    $id = (int)($data['id'] ?? 0);
    $status = trim((string)($data['status'] ?? ''));
    $extraNote = trim((string)($data['note'] ?? ''));

    $allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
    if ($id <= 0 || !in_array($status, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos invalidos']);
        exit;
    }

    if ($extraNote !== '') {
        $sql = "UPDATE special_reservations
                SET status = ?, notes = CONCAT(COALESCE(notes,''), CASE WHEN COALESCE(notes,'') = '' THEN '' ELSE '\n\n' END, ?), updated_at = NOW()
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $noteWithPrefix = '[ADMIN] ' . $extraNote;
        $stmt->bind_param('ssi', $status, $noteWithPrefix, $id);
    } else {
        $sql = "UPDATE special_reservations SET status = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('si', $status, $id);
    }

    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Estado actualizado']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

