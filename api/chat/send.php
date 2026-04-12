<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$recipientId = isset($data['recipient_id']) ? intval($data['recipient_id']) : 0;
$conversationId = isset($data['conversation_id']) ? intval($data['conversation_id']) : 0;
$content = isset($data['content']) ? trim($data['content']) : '';

if (!$content) {
    http_response_code(400);
    echo json_encode(['error' => 'content required']);
    exit();
}

// If no conversation_id, find or create one with recipient
if (!$conversationId && $recipientId) {
    $u1 = min($userId, $recipientId);
    $u2 = max($userId, $recipientId);
    
    $find = $conn->prepare("SELECT id FROM chat_conversations WHERE user1_id = ? AND user2_id = ?");
    $find->bind_param("ii", $u1, $u2);
    $find->execute();
    $row = $find->get_result()->fetch_assoc();
    
    if ($row) {
        $conversationId = $row['id'];
    } else {
        $create = $conn->prepare("INSERT INTO chat_conversations (user1_id, user2_id) VALUES (?, ?)");
        $create->bind_param("ii", $u1, $u2);
        $create->execute();
        $conversationId = $conn->insert_id;
    }
} elseif (!$conversationId) {
    http_response_code(400);
    echo json_encode(['error' => 'conversation_id or recipient_id required']);
    exit();
}

// Verify user belongs to conversation
$check = $conn->prepare("SELECT id FROM chat_conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)");
$check->bind_param("iii", $conversationId, $userId, $userId);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Not authorized']);
    exit();
}

// Insert message
$stmt = $conn->prepare("INSERT INTO chat_messages (conversation_id, sender_id, message_type, content) VALUES (?, ?, 'text', ?)");
$stmt->bind_param("iis", $conversationId, $userId, $content);
$stmt->execute();
$messageId = $conn->insert_id;

// Update conversation timestamp
$updateConv = $conn->prepare("UPDATE chat_conversations SET last_message_at = NOW() WHERE id = ?");
$updateConv->bind_param("i", $conversationId);
$updateConv->execute();

// Return the new message
$msg = $conn->prepare("SELECT id, sender_id, message_type, content, file_url, file_name, file_size, is_read, created_at FROM chat_messages WHERE id = ?");
$msg->bind_param("i", $messageId);
$msg->execute();
$message = $msg->get_result()->fetch_assoc();

// Send email notification to recipient
try {
    // Find the other user in the conversation
    $convStmt = $conn->prepare("SELECT user1_id, user2_id FROM chat_conversations WHERE id = ?");
    $convStmt->bind_param("i", $conversationId);
    $convStmt->execute();
    $conv = $convStmt->get_result()->fetch_assoc();
    $otherUserId = ($conv['user1_id'] == $userId) ? $conv['user2_id'] : $conv['user1_id'];

    // Get recipient email and sender name
    $recipStmt = $conn->prepare("SELECT email, full_name FROM users WHERE id = ?");
    $recipStmt->bind_param("i", $otherUserId);
    $recipStmt->execute();
    $recipient = $recipStmt->get_result()->fetch_assoc();

    $senderStmt = $conn->prepare("SELECT full_name FROM users WHERE id = ?");
    $senderStmt->bind_param("i", $userId);
    $senderStmt->execute();
    $sender = $senderStmt->get_result()->fetch_assoc();

    if ($recipient && $recipient['email']) {
        $to = $recipient['email'];
        $subject = "Nuevo mensaje de " . $sender['full_name'] . " - Bonifacio's";
        $preview = mb_substr($content, 0, 100);
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8\r\n";
        $headers .= "From: Bonifacio's Chat <info@bonifaciossancarlos.com>\r\n";

        $htmlBody = "
        <div style='font-family:Arial,sans-serif;max-width:500px;margin:0 auto;'>
            <div style='background:#1a1a1f;color:#D4AF37;padding:16px 20px;text-align:center;border-radius:12px 12px 0 0;'>
                <h3 style='margin:0;'>Bonifacio's Chat</h3>
            </div>
            <div style='background:#f9f6ef;padding:20px;'>
                <p style='color:#333;margin:0 0 8px;'><strong>{$sender['full_name']}</strong> te envió un mensaje:</p>
                <div style='background:#fff;border-left:3px solid #D4AF37;padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;'>
                    <p style='color:#555;margin:0;font-size:14px;'>{$preview}</p>
                </div>
                <p style='text-align:center;margin:16px 0 0;'>
                    <a href='https://bonifaciossancarlos.com/admin/messages' style='display:inline-block;background:#D4AF37;color:#000;text-decoration:none;padding:10px 24px;border-radius:20px;font-size:13px;font-weight:bold;'>Ver Mensaje</a>
                </p>
            </div>
            <div style='background:#1a1a1f;color:#F4E4C1;padding:10px;text-align:center;font-size:11px;border-radius:0 0 12px 12px;'>
                Bonifacio's Restaurant · San Carlos, Sonora
            </div>
        </div>";

        @mail($to, $subject, $htmlBody, $headers);
    }
} catch (Exception $e) {
    // Silent fail - don't break the message send
}

echo json_encode([
    'success' => true,
    'message' => $message,
    'conversation_id' => $conversationId
]);

$conn->close();
?>
