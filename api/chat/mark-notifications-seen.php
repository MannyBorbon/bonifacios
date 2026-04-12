<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// Mark chat messages as read
try {
    $stmt = $conn->prepare("
        UPDATE chat_messages cm
        JOIN chat_conversations cc ON cm.conversation_id = cc.id
        SET cm.is_read = TRUE
        WHERE (cc.user1_id = ? OR cc.user2_id = ?)
        AND cm.sender_id != ?
        AND cm.is_read = FALSE
    ");
    if ($stmt) {
        $stmt->bind_param("iii", $userId, $userId, $userId);
        $stmt->execute();
    }
} catch (Exception $e) {}

// Mark emails as seen
try {
    $conn->query("UPDATE email_inbox SET seen = 1 WHERE seen = 0");
} catch (Exception $e) {}

echo json_encode(['success' => true]);
$conn->close();
?>
