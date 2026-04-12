<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$sql = "SELECT m.*, 
        u.full_name as recipient_name, 
        u.avatar as recipient_avatar
        FROM messages m
        JOIN users u ON m.recipient_id = u.id
        WHERE m.sender_id = ?
        ORDER BY m.created_at DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
}

echo json_encode($messages);
$conn->close();
?>
