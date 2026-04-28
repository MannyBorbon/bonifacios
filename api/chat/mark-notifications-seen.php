<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// Persist per-user seen markers to prevent bell counter from reappearing on reload
$conn->query("
    CREATE TABLE IF NOT EXISTS user_notification_state (
        user_id INT PRIMARY KEY,
        seen_chat_at DATETIME NULL,
        seen_email_at DATETIME NULL,
        seen_quotes_at DATETIME NULL,
        seen_applications_at DATETIME NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
");

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

// Mark emails as seen (global inbox fallback)
try { $conn->query("UPDATE email_inbox SET seen = 1 WHERE seen = 0"); } catch (Exception $e) {}

// Save all markers as seen now for this user
try {
    $stmtState = $conn->prepare("
        INSERT INTO user_notification_state (user_id, seen_chat_at, seen_email_at, seen_quotes_at, seen_applications_at)
        VALUES (?, NOW(), NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            seen_chat_at = NOW(),
            seen_email_at = NOW(),
            seen_quotes_at = NOW(),
            seen_applications_at = NOW()
    ");
    if ($stmtState) {
        $stmtState->bind_param("i", $userId);
        $stmtState->execute();
    }
} catch (Exception $e) {}

echo json_encode(['success' => true]);
$conn->close();
?>
