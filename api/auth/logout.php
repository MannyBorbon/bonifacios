<?php
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No active session']);
    exit();
}

$conn = getConnection();
$userId = $_SESSION['user_id'];

// Obtener username para el log
$userSql = "SELECT username FROM users WHERE id = ?";
$userStmt = $conn->prepare($userSql);
$userStmt->bind_param("i", $userId);
$userStmt->execute();
$userResult = $userStmt->get_result();
$user = $userResult->fetch_assoc();

// Registrar actividad de logout (silencioso si tabla no existe)
try {
    $logSql = "INSERT INTO activity_log (user_id, action, description) VALUES (?, 'logout', ?)";
    $logStmt = $conn->prepare($logSql);
    if ($logStmt) {
        $description = "User {$user['username']} logged out";
        $logStmt->bind_param("is", $userId, $description);
        $logStmt->execute();
    }
} catch (Exception $e) {}

// Terminar sesión de tracking si existe
if (isset($_SESSION['tracking_session_id'])) {
    try {
        $sessionId = $_SESSION['tracking_session_id'];
        $endSessionSql = "UPDATE user_sessions 
                          SET ended_at = NOW(), 
                              is_active = FALSE,
                              duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
                          WHERE id = ?";
        $endStmt = $conn->prepare($endSessionSql);
        if ($endStmt) {
            $endStmt->bind_param("i", $sessionId);
            $endStmt->execute();
        }
    } catch (Exception $e) {}
}

// Destruir sesión PHP
session_destroy();

echo json_encode(['success' => true, 'message' => 'Logged out successfully']);

$conn->close();
?>
