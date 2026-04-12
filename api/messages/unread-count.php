<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$sql = "SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = FALSE";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

echo json_encode(['count' => $row['count']]);
$conn->close();
?>
