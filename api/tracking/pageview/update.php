<?php
require_once '../../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$pageViewId = isset($data['pageViewId']) ? intval($data['pageViewId']) : 0;
$timeOnPage = isset($data['timeOnPage']) ? intval($data['timeOnPage']) : 0;
$scrollDepth = isset($data['scrollDepth']) ? intval($data['scrollDepth']) : 0;

if (!$pageViewId) {
    echo json_encode(['success' => false]);
    exit();
}

$sql = "UPDATE page_views SET time_on_page = ?, scroll_depth = ? WHERE id = ? AND user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iiii", $timeOnPage, $scrollDepth, $pageViewId, $userId);
$stmt->execute();

echo json_encode(['success' => true]);
$conn->close();
?>
