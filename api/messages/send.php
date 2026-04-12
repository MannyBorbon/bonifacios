<?php
require_once '../config/database.php';

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$senderId = $userId;
$recipientId = isset($data['recipient_id']) ? intval($data['recipient_id']) : 0;
$subject = isset($data['subject']) ? $conn->real_escape_string($data['subject']) : '';
$message = isset($data['message']) ? $conn->real_escape_string($data['message']) : '';
$parentId = isset($data['parent_message_id']) ? intval($data['parent_message_id']) : null;

if (!$recipientId || !$subject || !$message) {
    http_response_code(400);
    echo json_encode(['error' => 'Recipient, subject, and message are required']);
    exit();
}

$sql = "INSERT INTO messages (sender_id, recipient_id, subject, message, parent_message_id) 
        VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iissi", $senderId, $recipientId, $subject, $message, $parentId);

if ($stmt->execute()) {
    $messageId = $stmt->insert_id;
    
    // Get sender and recipient info for email notification
    $senderStmt = $conn->prepare("SELECT username, full_name FROM users WHERE id = ?");
    $senderStmt->bind_param("i", $senderId);
    $senderStmt->execute();
    $senderResult = $senderStmt->get_result();
    $sender = $senderResult->fetch_assoc();
    
    $recipientStmt = $conn->prepare("SELECT username, full_name, email FROM users WHERE id = ? AND is_active = TRUE");
    $recipientStmt->bind_param("i", $recipientId);
    $recipientStmt->execute();
    $recipientResult = $recipientStmt->get_result();
    $recipient = $recipientResult->fetch_assoc();
    
    // Send email notification to recipient
    if ($recipient && !empty($recipient['email']) && $sender) {
        $subject = "Nuevo mensaje de " . ($sender['full_name'] ?: $sender['username']);
        $messageBody = "Has recibido un nuevo mensaje en el sistema de Bonifacio's.\n\n";
        $messageBody .= "De: " . ($sender['full_name'] ?: $sender['username']) . "\n";
        $messageBody .= "Asunto: " . $subject . "\n";
        $messageBody .= "Mensaje: " . $message . "\n";
        $messageBody .= "Fecha y hora: " . date('d/m/Y H:i', strtotime('now')) . " (hora de Sonora)\n\n";
        $messageBody .= "Para responder, inicia sesión en el panel administrativo:\n";
        $messageBody .= "https://bonifaciossancarlos.com/admin/messages\n\n";
        $messageBody .= "O haz clic aquí: https://bonifaciossancarlos.com/admin/messages";
        
        $headers = "From: no-reply@bonifaciossancarlos.com\r\n";
        $headers .= "Reply-To: no-reply@bonifaciossancarlos.com\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();
        
        @mail($recipient['email'], $subject, $messageBody, $headers);
    }
    
    // Log activity
    $logSql = "INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) 
               VALUES (?, 'send_message', 'message', ?, ?)";
    $logStmt = $conn->prepare($logSql);
    $description = "Sent message to user $recipientId";
    $logStmt->bind_param("iis", $senderId, $messageId, $description);
    $logStmt->execute();
    
    echo json_encode([
        'message' => 'Message sent successfully',
        'messageId' => $messageId
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send message']);
}

$conn->close();
?>
