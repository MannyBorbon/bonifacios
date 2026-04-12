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
        pv.id,
        pv.page_url,
        pv.page_title,
        pv.referrer,
        pv.time_on_page,
        pv.scroll_depth,
        pv.viewed_at
    FROM page_views pv
    WHERE pv.session_id = ?
    ORDER BY pv.viewed_at ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $sessionId);
$stmt->execute();
$result = $stmt->get_result();

$pages = [];
while ($row = $result->fetch_assoc()) {
    $pages[] = $row;
}

echo json_encode([
    'success' => true,
    'pages' => $pages
]);

$conn->close();
?>
