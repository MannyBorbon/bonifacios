<?php
require_once '../../config/database.php';
if (session_status() === PHP_SESSION_NONE) { session_start(); }

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$sessionId = isset($data['sessionId']) ? intval($data['sessionId']) : ($_SESSION['tracking_session_id'] ?? null);

if ($sessionId) {
    $stmt = $conn->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE id = ? AND is_active = TRUE");
    $stmt->bind_param("i", $sessionId);
    $stmt->execute();
}

echo json_encode(['success' => true]);
$conn->close();
?>
