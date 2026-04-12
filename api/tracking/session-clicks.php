<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$sessionId = isset($_GET['session_id']) ? intval($_GET['session_id']) : 0;
if (!$sessionId) {
    http_response_code(400);
    echo json_encode(['error' => 'session_id required']);
    exit();
}

$sql = "
    SELECT 
        uc.id,
        uc.event_type,
        uc.page_url,
        uc.element_id,
        uc.element_text,
        uc.element_class,
        uc.click_x,
        uc.click_y,
        uc.timestamp,
        uc.metadata
    FROM user_clicks uc
    WHERE uc.session_id = ?
      AND uc.event_type NOT IN ('window_focus', 'window_blur', 'visibility_change')
    ORDER BY uc.timestamp ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $sessionId);
$stmt->execute();
$result = $stmt->get_result();

$clicks = [];
while ($row = $result->fetch_assoc()) {
    $clicks[] = $row;
}

echo json_encode([
    'success' => true,
    'clicks' => $clicks
]);

$conn->close();
?>
