<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

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

$seenState = [
    'seen_chat_at' => null,
    'seen_email_at' => null,
    'seen_quotes_at' => null,
    'seen_applications_at' => null
];
try {
    $seenStmt = $conn->prepare("SELECT seen_chat_at, seen_email_at, seen_quotes_at, seen_applications_at FROM user_notification_state WHERE user_id = ?");
    if ($seenStmt) {
        $seenStmt->bind_param("i", $userId);
        $seenStmt->execute();
        $seenRow = $seenStmt->get_result()->fetch_assoc();
        if ($seenRow) $seenState = $seenRow;
    }
} catch (Exception $e) {}

$unreadChat = 0;
$unreadMessages = 0;
$unreadEmails = 0;
$recentChats = [];

// Unread chat messages
try {
    $chatQuery = "
        SELECT COUNT(*) as cnt FROM chat_messages cm
        JOIN chat_conversations cc ON cm.conversation_id = cc.id
        WHERE (cc.user1_id = ? OR cc.user2_id = ?)
        AND cm.sender_id != ?
        AND cm.is_read = FALSE";
    if (!empty($seenState['seen_chat_at'])) {
        $chatQuery .= " AND cm.created_at > ?";
    }
    $chatStmt = $conn->prepare($chatQuery);
    if ($chatStmt) {
        if (!empty($seenState['seen_chat_at'])) {
            $chatStmt->bind_param("iiis", $userId, $userId, $userId, $seenState['seen_chat_at']);
        } else {
            $chatStmt->bind_param("iii", $userId, $userId, $userId);
        }
        $chatStmt->execute();
        $r = $chatStmt->get_result()->fetch_assoc();
        $unreadChat = (int)($r['cnt'] ?? 0);
    }
} catch (Exception $e) {}

// Unread old messages (legacy system)
try {
    $msgStmt = $conn->prepare("SELECT COUNT(*) as cnt FROM messages WHERE recipient_id = ? AND is_read = 0");
    if ($msgStmt) {
        $msgStmt->bind_param("i", $userId);
        $msgStmt->execute();
        $r = $msgStmt->get_result()->fetch_assoc();
        $unreadMessages = (int)($r['cnt'] ?? 0);
    }
} catch (Exception $e) {}

// Unread inbox emails
try {
    if (!empty($seenState['seen_email_at'])) {
        $emailStmt = $conn->prepare("SELECT COUNT(*) as cnt FROM email_inbox WHERE seen = 0 AND created_at > ?");
        if ($emailStmt) {
            $emailStmt->bind_param("s", $seenState['seen_email_at']);
            $emailStmt->execute();
            $r = $emailStmt->get_result()->fetch_assoc();
            $unreadEmails = (int)($r['cnt'] ?? 0);
        }
    } else {
        $emailResult = $conn->query("SELECT COUNT(*) as cnt FROM email_inbox WHERE seen = 0");
        if ($emailResult) {
            $r = $emailResult->fetch_assoc();
            $unreadEmails = (int)($r['cnt'] ?? 0);
        }
    }
} catch (Exception $e) {}

// Recent chat notifications
try {
    $rcStmt = $conn->prepare("
        SELECT cm.id, cm.content, cm.message_type, cm.created_at, u.full_name as sender_name
        FROM chat_messages cm
        JOIN chat_conversations cc ON cm.conversation_id = cc.id
        JOIN users u ON cm.sender_id = u.id
        WHERE (cc.user1_id = ? OR cc.user2_id = ?)
        AND cm.sender_id != ?
        AND cm.is_read = FALSE
        ORDER BY cm.created_at DESC
        LIMIT 10
    ");
    if ($rcStmt) {
        $rcStmt->bind_param("iii", $userId, $userId, $userId);
        $rcStmt->execute();
        $rcResult = $rcStmt->get_result();
        while ($row = $rcResult->fetch_assoc()) {
            $recentChats[] = $row;
        }
    }
} catch (Exception $e) {}

// New quote requests (nueva_solicitud or pending = not yet attended)
$newQuotes = 0;
try {
    $quotesQuery = "SELECT COUNT(*) as cnt FROM event_quotes WHERE status IN ('nueva_solicitud','pending')";
    if (!empty($seenState['seen_quotes_at'])) {
        $quotesQuery .= " AND created_at > '" . $conn->real_escape_string($seenState['seen_quotes_at']) . "'";
    }
    $qStmt = $conn->query($quotesQuery);
    if ($qStmt) $newQuotes = (int)($qStmt->fetch_assoc()['cnt'] ?? 0);
} catch (Exception $e) {}

// New job applications submitted in last 48 hours
$newApplications = 0;
try {
    $appQuery = "SELECT COUNT(*) as cnt FROM job_applications WHERE created_at >= NOW() - INTERVAL 48 HOUR";
    if (!empty($seenState['seen_applications_at'])) {
        $appQuery .= " AND created_at > '" . $conn->real_escape_string($seenState['seen_applications_at']) . "'";
    }
    $aStmt = $conn->query($appQuery);
    if ($aStmt) $newApplications = (int)($aStmt->fetch_assoc()['cnt'] ?? 0);
} catch (Exception $e) {}

$totalUnread = $unreadChat + $unreadEmails + $newQuotes + $newApplications;

echo json_encode([
    'success' => true,
    'unread_chat' => $unreadChat,
    'unread_emails' => $unreadEmails,
    'unread_messages' => $unreadMessages,
    'new_quotes' => $newQuotes,
    'new_applications' => $newApplications,
    'total' => $totalUnread,
    'recent_chats' => $recentChats
]);

$conn->close();
?>
