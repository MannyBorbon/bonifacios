<?php
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

// Check if user is admin
$userId = $_SESSION['user_id'];
$conn = getConnection();

$userSql = "SELECT role FROM users WHERE id = ?";
$stmt = $conn->prepare($userSql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$userResult = $stmt->get_result();
$user = $userResult->fetch_assoc();

if ($user['role'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden - Admin only']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['to']) || !isset($data['subject']) || !isset($data['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: to, subject, message']);
    exit();
}

$to = $data['to'];
$subject = $data['subject'];
$message = $data['message'];
$from = 'info@bonifaciossancarlos.com';
$fromName = "Bonifacio's Restaurant";

// HTML email template
$htmlMessage = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1f; color: #D4AF37; padding: 20px; text-align: center; }
        .content { background: #f4f4f4; padding: 20px; }
        .footer { background: #1a1a1f; color: #F4E4C1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Bonifacio\'s Restaurant</h2>
        </div>
        <div class="content">
            ' . nl2br(htmlspecialchars($message)) . '
        </div>
        <div class="footer">
            <p>Bonifacio\'s Restaurant - San Carlos, Sonora</p>
            <p>info@bonifaciossancarlos.com | 622 173 8884</p>
        </div>
    </div>
</body>
</html>';

// Try multiple email methods for maximum compatibility
$email_sent = false;
$error_message = '';

// Method 1: Try PHPMailer if available (most reliable)
if (!$email_sent && class_exists('PHPMailer')) {
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.hostinger.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'info@bonifaciossancarlos.com';
        $mail->Password = 'Filipenses4:8@';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        
        $mail->setFrom('info@bonifaciossancarlos.com', "Bonifacio\'s Restaurant");
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlMessage;
        
        $mail->send();
        $email_sent = true;
    } catch (Exception $e) {
        $error_message = "PHPMailer: " . $e->getMessage();
    }
}

// Method 2: Try WordPress wp_mail if available (Hostinger compatible)
if (!$email_sent && function_exists('wp_mail')) {
    try {
        $headers = array('Content-Type: text/html; charset=UTF-8');
        wp_mail($to, $subject, $htmlMessage, $headers);
        $email_sent = true;
    } catch (Exception $e) {
        $error_message = "WordPress mail: " . $e->getMessage();
    }
}

// Method 3: Try enhanced mail() with proper headers
if (!$email_sent) {
    try {
        // Enhanced headers for better deliverability
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . $fromName . " <" . $from . ">\r\n";
        $headers .= "Reply-To: " . $from . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $headers .= "X-Priority: 3\r\n";
        
        // Use -f parameter for Return-Path (important for Hostinger)
        $mail_sent = mail($to, $subject, $htmlMessage, $headers, "-f" . $from);
        
        if ($mail_sent) {
            $email_sent = true;
        } else {
            $error_message = "mail() function failed";
        }
    } catch (Exception $e) {
        $error_message = "mail() function: " . $e->getMessage();
    }
}

// Return response
if ($email_sent) {
    echo json_encode([
        'success' => true,
        'message' => 'Correo enviado exitosamente'
    ]);
} else {
    error_log("Email sending failed: " . $error_message);
    http_response_code(500);
    echo json_encode([
        'error' => 'Error al enviar el correo. Por favor, contacte al administrador.',
        'debug' => $error_message // Only for debugging, remove in production
    ]);
}

$conn->close();
?>
