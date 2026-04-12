<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// Get all conversations for this user, with last message and other user info
$sql = "
    SELECT 
        c.id as conversation_id,
        c.last_message_at,
        CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END as other_user_id,
        u.full_name as other_name,
        u.username as other_username,
        u.profile_photo as other_avatar,
        m.content as last_message,
        m.message_type as last_message_type,
        m.sender_id as last_sender_id,
        m.created_at as last_message_time,
        (SELECT COUNT(*) FROM chat_messages cm 
         WHERE cm.conversation_id = c.id 
         AND cm.sender_id != ? 
         AND cm.is_read = FALSE) as unread_count
    FROM chat_conversations c
    JOIN users u ON u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
    LEFT JOIN chat_messages m ON m.id = (
        SELECT id FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
    )
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY c.last_message_at DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iiiii", $userId, $userId, $userId, $userId, $userId);
$stmt->execute();
$result = $stmt->get_result();

$conversations = [];
while ($row = $result->fetch_assoc()) {
    $conversations[] = $row;
}

echo json_encode(['success' => true, 'conversations' => $conversations]);
$conn->close();
?>
