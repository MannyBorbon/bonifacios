<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$sessionId = $_SESSION['tracking_session_id'] ?? (isset($data['sessionId']) ? intval($data['sessionId']) : null);
$eventType = $data['eventType'] ?? 'click';
$pageUrl = $data['pageUrl'] ?? '';
$elementId = $data['elementId'] ?? null;
$elementClass = $data['elementClass'] ?? null;
$elementText = $data['elementText'] ?? null;
$clickX = $data['clickX'] ?? null;
$clickY = $data['clickY'] ?? null;
$metadata = isset($data['metadata']) ? json_encode($data['metadata']) : null;

$sql = "INSERT INTO user_clicks (session_id, user_id, event_type, page_url, element_id, element_class, element_text, click_x, click_y, metadata) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iisssssiss", $sessionId, $userId, $eventType, $pageUrl, $elementId, $elementClass, $elementText, $clickX, $clickY, $metadata);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to track click']);
}

$conn->close();
?>
