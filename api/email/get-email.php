<?php
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['email_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email ID required']);
    exit();
}

$emailId = intval($data['email_id']);

// IMAP configuration for Hostinger
$hostname = '{imap.hostinger.com:993/imap/ssl}INBOX';
$username = 'info@bonifaciossancarlos.com';
$password = 'Filipenses4:8@';

try {
    $inbox = imap_open($hostname, $username, $password) or die('Cannot connect to email: ' . imap_last_error());
    
    // Get email header
    $overview = imap_fetch_overview($inbox, $emailId, 0);
    
    // Get email structure
    $structure = imap_fetchstructure($inbox, $emailId);
    
    // Function to decode email part
    function decodePart($data, $encoding) {
        switch ($encoding) {
            case 0: // 7BIT
            case 1: // 8BIT
                return $data;
            case 2: // BINARY
                return $data;
            case 3: // BASE64
                return base64_decode($data);
            case 4: // QUOTED-PRINTABLE
                return quoted_printable_decode($data);
            case 5: // OTHER
                return $data;
            default:
                return $data;
        }
    }
    
    // Function to get email body
    function getBody($inbox, $emailId, $structure) {
        $body = '';
        $htmlBody = '';
        
        // Check if multipart
        if (isset($structure->parts) && count($structure->parts)) {
            // Multipart email
            for ($i = 0; $i < count($structure->parts); $i++) {
                $part = $structure->parts[$i];
                $partNum = $i + 1;
                
                // Get the body content
                $data = imap_fetchbody($inbox, $emailId, $partNum);
                
                // Decode based on encoding
                $data = decodePart($data, $part->encoding);
                
                // Convert charset if needed
                if (isset($part->parameters)) {
                    foreach ($part->parameters as $param) {
                        if (strtolower($param->attribute) == 'charset' && strtolower($param->value) != 'utf-8') {
                            $data = mb_convert_encoding($data, 'UTF-8', $param->value);
                        }
                    }
                }
                
                // Check content type
                if ($part->subtype == 'PLAIN') {
                    $body = $data;
                } elseif ($part->subtype == 'HTML') {
                    $htmlBody = $data;
                }
            }
        } else {
            // Simple email (not multipart)
            $data = imap_body($inbox, $emailId);
            
            // Decode based on encoding
            $data = decodePart($data, $structure->encoding);
            
            // Convert charset if needed
            if (isset($structure->parameters)) {
                foreach ($structure->parameters as $param) {
                    if (strtolower($param->attribute) == 'charset' && strtolower($param->value) != 'utf-8') {
                        $data = mb_convert_encoding($data, 'UTF-8', $param->value);
                    }
                }
            }
            
            if ($structure->subtype == 'HTML') {
                $htmlBody = $data;
            } else {
                $body = $data;
            }
        }
        
        // If we have HTML but no plain text, strip HTML tags for plain version
        if (empty($body) && !empty($htmlBody)) {
            $body = strip_tags($htmlBody);
        }
        
        return ['body' => $body, 'html' => $htmlBody];
    }
    
    $emailContent = getBody($inbox, $emailId, $structure);
    
    imap_close($inbox);
    
    if (isset($overview[0])) {
        $email = $overview[0];
        
        echo json_encode([
            'success' => true,
            'email' => [
                'id' => $emailId,
                'from' => $email->from,
                'subject' => isset($email->subject) ? imap_utf8($email->subject) : 'Sin asunto',
                'date' => date('Y-m-d H:i:s', strtotime($email->date)),
                'body' => $emailContent['body'],
                'html_body' => $emailContent['html'],
                'seen' => $email->seen
            ]
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Email not found']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error loading email: ' . $e->getMessage()]);
}
?>
