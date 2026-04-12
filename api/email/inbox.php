<?php
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

// IMAP configuration for Hostinger
$hostname = '{imap.hostinger.com:993/imap/ssl}INBOX';
$username = 'info@bonifaciossancarlos.com';
$password = 'Filipenses4:8@';

try {
    // Connect to mailbox
    $inbox = imap_open($hostname, $username, $password) or die('Cannot connect to email: ' . imap_last_error());
    
    // Get emails (last 50)
    $emails = imap_search($inbox, 'ALL');
    $count = imap_num_msg($inbox);
    
    if ($emails) {
        // Sort emails by date (newest first)
        rsort($emails);
        
        // Limit to 50 most recent
        $emails = [];
        for ($i = $count; $i > max(0, $count - 50); $i--) {
            $overview = imap_fetch_overview($inbox, $i, 0);
            if (isset($overview[0])) {
                $email = $overview[0];
                
                // Get email structure to check encoding
                $structure = imap_fetchstructure($inbox, $i);
                
                // Get preview of email body (first 150 chars)
                $body = imap_fetchbody($inbox, $i, 1);
                if (!$body) {
                    $body = imap_body($inbox, $i);
                }
                
                // Decode based on encoding
                if (isset($structure->encoding)) {
                    if ($structure->encoding == 3) { // BASE64
                        $body = base64_decode($body);
                    } elseif ($structure->encoding == 4) { // QUOTED-PRINTABLE
                        $body = quoted_printable_decode($body);
                    }
                }
                
                // Strip HTML and get preview
                $preview = substr(strip_tags($body), 0, 150);
                
                // Decode subject if it has encoding
                $subject = isset($email->subject) ? imap_utf8($email->subject) : 'Sin asunto';
                // Additional quoted-printable decode for subject
                if (strpos($subject, '=?') !== false || strpos($subject, '=') !== false) {
                    $subject = quoted_printable_decode($subject);
                }
                
                $emails[] = [
                    'id' => $i,
                    'from' => $email->from,
                    'subject' => $subject,
                    'date' => date('Y-m-d H:i:s', strtotime($email->date)),
                    'preview' => $preview,
                    'seen' => $email->seen
                ];
            }
        }
        
        imap_close($inbox);
        
        echo json_encode([
            'success' => true,
            'emails' => $emails
        ]);
    } else {
        imap_close($inbox);
        echo json_encode([
            'success' => true,
            'emails' => []
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error al conectar con el correo: ' . $e->getMessage(),
        'note' => 'Asegúrate de actualizar la contraseña en inbox.php'
    ]);
}
?>
