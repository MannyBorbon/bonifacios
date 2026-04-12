<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$recipientId = isset($_POST['recipient_id']) ? intval($_POST['recipient_id']) : 0;
$conversationId = isset($_POST['conversation_id']) ? intval($_POST['conversation_id']) : 0;
$content = isset($_POST['content']) ? trim($_POST['content']) : '';

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit();
}

// Find or create conversation
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

$file = $_FILES['file'];
$maxSize = 50 * 1024 * 1024; // 50MB

if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large (max 50MB)']);
    exit();
}

// Determine message type from MIME
$mime = $file['type'];
$messageType = 'file';
if (strpos($mime, 'image/') === 0) $messageType = 'image';
elseif (strpos($mime, 'video/') === 0) $messageType = 'video';
elseif (strpos($mime, 'audio/') === 0) $messageType = 'audio';

// Create upload directory
$uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/chat/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$uniqueName = uniqid('chat_') . '_' . time() . '.' . $ext;
$filePath = $uploadDir . $uniqueName;
$fileUrl = '/uploads/chat/' . $uniqueName;

if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit();
}

// Convert non-browser-compatible audio to MP3 if ffmpeg is available
if ($messageType === 'audio') {
    $browserAudio = ['mp3', 'wav', 'ogg', 'webm', 'aac', 'm4a', 'mp4'];
    $extLower = strtolower($ext);
    if (!in_array($extLower, $browserAudio)) {
        $mp3Name = uniqid('chat_') . '_' . time() . '.mp3';
        $mp3Path = $uploadDir . $mp3Name;
        $ffmpegCmd = "ffmpeg -i " . escapeshellarg($filePath) . " -acodec libmp3lame -ab 128k " . escapeshellarg($mp3Path) . " 2>&1";
        @exec($ffmpegCmd, $output, $returnCode);
        if ($returnCode === 0 && file_exists($mp3Path)) {
            @unlink($filePath);
            $filePath = $mp3Path;
            $fileUrl = '/uploads/chat/' . $mp3Name;
            $uniqueName = $mp3Name;
            $ext = 'mp3';
        }
    }
}

// Insert message
$stmt = $conn->prepare("INSERT INTO chat_messages (conversation_id, sender_id, message_type, content, file_url, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)");
$fileName = $file['name'];
$fileSize = $file['size'];
$stmt->bind_param("iissssi", $conversationId, $userId, $messageType, $content, $fileUrl, $fileName, $fileSize);
$stmt->execute();
$messageId = $conn->insert_id;

// Update conversation timestamp
$conn->query("UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $conversationId");

// Return the new message
$msg = $conn->prepare("SELECT id, sender_id, message_type, content, file_url, file_name, file_size, is_read, created_at FROM chat_messages WHERE id = ?");
$msg->bind_param("i", $messageId);
$msg->execute();
$message = $msg->get_result()->fetch_assoc();

// Send email notification to recipient
try {
    $convStmt = $conn->prepare("SELECT user1_id, user2_id FROM chat_conversations WHERE id = ?");
    $convStmt->bind_param("i", $conversationId);
    $convStmt->execute();
    $conv = $convStmt->get_result()->fetch_assoc();
    $otherUserId = ($conv['user1_id'] == $userId) ? $conv['user2_id'] : $conv['user1_id'];

    $recipStmt = $conn->prepare("SELECT email, full_name FROM users WHERE id = ?");
    $recipStmt->bind_param("i", $otherUserId);
    $recipStmt->execute();
    $recipientUser = $recipStmt->get_result()->fetch_assoc();

    $senderStmt = $conn->prepare("SELECT full_name FROM users WHERE id = ?");
    $senderStmt->bind_param("i", $userId);
    $senderStmt->execute();
    $sender = $senderStmt->get_result()->fetch_assoc();

    if ($recipientUser && $recipientUser['email']) {
        $typeLabel = $messageType === 'image' ? 'una foto' : ($messageType === 'video' ? 'un video' : ($messageType === 'audio' ? 'un audio' : 'un archivo'));
        $subj = "Nuevo mensaje de " . $sender['full_name'] . " - Bonifacio's";
        $hdrs = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\nFrom: Bonifacio's Chat <info@bonifaciossancarlos.com>\r\n";
        $body = "
        <div style='font-family:Arial,sans-serif;max-width:500px;margin:0 auto;'>
            <div style='background:#1a1a1f;color:#D4AF37;padding:16px 20px;text-align:center;border-radius:12px 12px 0 0;'>
                <h3 style='margin:0;'>Bonifacio's Chat</h3>
            </div>
            <div style='background:#f9f6ef;padding:20px;'>
                <p style='color:#333;margin:0 0 8px;'><strong>{$sender['full_name']}</strong> te envió {$typeLabel}</p>
                <p style='text-align:center;margin:16px 0 0;'>
                    <a href='https://bonifaciossancarlos.com/admin/messages' style='display:inline-block;background:#D4AF37;color:#000;text-decoration:none;padding:10px 24px;border-radius:20px;font-size:13px;font-weight:bold;'>Ver Mensaje</a>
                </p>
            </div>
            <div style='background:#1a1a1f;color:#F4E4C1;padding:10px;text-align:center;font-size:11px;border-radius:0 0 12px 12px;'>
                Bonifacio's Restaurant · San Carlos, Sonora
            </div>
        </div>";
        @mail($recipientUser['email'], $subj, $body, $hdrs);
    }
} catch (Exception $e) { /* silent */ }

echo json_encode([
    'success' => true,
    'message' => $message,
    'conversation_id' => $conversationId
]);

$conn->close();
?>
