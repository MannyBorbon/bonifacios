<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$conversationId = isset($_GET['conversation_id']) ? intval($_GET['conversation_id']) : 0;
$before = isset($_GET['before']) ? intval($_GET['before']) : 0;
$limit = 50;

if (!$conversationId) {
    http_response_code(400);
    echo json_encode(['error' => 'conversation_id required']);
    exit();
}

// Verify user belongs to this conversation
$check = $conn->prepare("SELECT id FROM chat_conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)");
$check->bind_param("iii", $conversationId, $userId, $userId);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Not authorized']);
    exit();
}

// Get messages
$where = "conversation_id = ?";
$params = [$conversationId];
$types = "i";

if ($before > 0) {
    $where .= " AND id < ?";
    $params[] = $before;
    $types .= "i";
}

$sql = "SELECT id, sender_id, message_type, content, file_url, file_name, file_size, is_read, created_at
        FROM chat_messages 
        WHERE $where
        ORDER BY created_at DESC 
        LIMIT $limit";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
}

// Mark unread messages from the other user as read
$markRead = $conn->prepare("UPDATE chat_messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE");
$markRead->bind_param("ii", $conversationId, $userId);
$markRead->execute();

// Return messages in chronological order
echo json_encode([
    'success' => true,
    'messages' => array_reverse($messages),
    'has_more' => count($messages) === $limit
]);

$conn->close();
?>
