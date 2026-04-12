<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$sessionId = $_SESSION['tracking_session_id'] ?? null;
$eventType = $data['eventType'] ?? 'visibility_change';
$isVisible = $data['isVisible'] ?? false;
$pageUrl = $data['pageUrl'] ?? '';

// Registrar evento de visibilidad
$sql = "INSERT INTO user_clicks (session_id, user_id, event_type, page_url, element_text, metadata) 
        VALUES (?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);

$elementText = $isVisible ? 'Ventana visible/maximizada' : 'Ventana minimizada/oculta';
$metadata = json_encode([
    'is_visible' => $isVisible,
    'timestamp' => date('Y-m-d H:i:s'),
    'action' => $isVisible ? 'window_focus' : 'window_blur'
]);

$stmt->bind_param("iissss", $sessionId, $userId, $eventType, $pageUrl, $elementText, $metadata);

if ($stmt->execute()) {
    // Si la ventana se minimizó/ocultó, actualizar última actividad
    if (!$isVisible) {
        $updateSql = "UPDATE user_sessions SET last_activity = NOW() WHERE id = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param("i", $sessionId);
        $updateStmt->execute();
    }
    
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to track visibility event']);
}

$conn->close();
?>
