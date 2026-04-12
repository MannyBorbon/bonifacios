<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$sessionId = $_SESSION['tracking_session_id'] ?? (isset($data['sessionId']) ? intval($data['sessionId']) : null);
$pageUrl = $data['pageUrl'] ?? '';
$pageTitle = $data['pageTitle'] ?? '';
$referrer = $data['referrer'] ?? '';

$sql = "INSERT INTO page_views (session_id, user_id, page_url, page_title, referrer) 
        VALUES (?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iisss", $sessionId, $userId, $pageUrl, $pageTitle, $referrer);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'pageViewId' => $conn->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to track page view']);
}

$conn->close();
?>
