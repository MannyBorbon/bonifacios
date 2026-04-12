<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$unreadChat = 0;
$unreadMessages = 0;
$unreadEmails = 0;
$recentChats = [];

// Unread chat messages
try {
    $chatStmt = $conn->prepare("
        SELECT COUNT(*) as cnt FROM chat_messages cm
        JOIN chat_conversations cc ON cm.conversation_id = cc.id
        WHERE (cc.user1_id = ? OR cc.user2_id = ?)
        AND cm.sender_id != ?
        AND cm.is_read = FALSE
    ");
    if ($chatStmt) {
        $chatStmt->bind_param("iii", $userId, $userId, $userId);
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
    $emailResult = $conn->query("SELECT COUNT(*) as cnt FROM email_inbox WHERE seen = 0");
    if ($emailResult) {
        $r = $emailResult->fetch_assoc();
        $unreadEmails = (int)($r['cnt'] ?? 0);
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
    $qStmt = $conn->query("SELECT COUNT(*) as cnt FROM event_quotes WHERE status IN ('nueva_solicitud','pending')");
    if ($qStmt) $newQuotes = (int)($qStmt->fetch_assoc()['cnt'] ?? 0);
} catch (Exception $e) {}

// New job applications submitted in last 48 hours
$newApplications = 0;
try {
    $aStmt = $conn->query("SELECT COUNT(*) as cnt FROM job_applications WHERE created_at >= NOW() - INTERVAL 48 HOUR");
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
