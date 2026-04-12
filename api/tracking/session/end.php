<?php
require_once '../../config/database.php';
if (session_status() === PHP_SESSION_NONE) { session_start(); }

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

// Prefer POST body (sent by sendBeacon/explicit logout), fallback to PHP session
$sessionId    = isset($data['sessionId'])    ? intval($data['sessionId'])    : ($_SESSION['tracking_session_id'] ?? null);
$sessionToken = $data['sessionToken'] ?? ($_SESSION['tracking_session_token'] ?? null);

if (!$sessionId) {
    http_response_code(400);
    echo json_encode(['error' => 'No active session']);
    exit();
}

// Calculate duration
$sql = "UPDATE user_sessions 
        SET ended_at = NOW(), 
            is_active = FALSE,
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
        WHERE id = ? AND is_active = TRUE";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $sessionId);

if ($stmt->execute()) {
    unset($_SESSION['tracking_session_id']);
    unset($_SESSION['tracking_session_token']);
    
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to end session']);
}

$conn->close();
?>
