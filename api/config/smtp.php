<?php
// Hostinger SMTP credentials
define('SMTP_HOST', 'smtp.hostinger.com');
define('SMTP_PORT', 465);
define('SMTP_USER', 'info@bonifaciossancarlos.com');
define('SMTP_PASS', 'Filipenses4:8@');
define('SMTP_NAME', "Bonifacios Restaurant");

/**
 * Encode a mail header value for UTF-8 subjects.
 */
function smtpEncodeHeader($str) {
    if (preg_match('/[^\x20-\x7E]/', $str)) {
        // Contains non-ASCII — encode each word
        return '=?UTF-8?B?' . base64_encode($str) . '?=';
    }
    return $str;
}

/**
 * Read one SMTP response line.
 */
function smtpRead($socket) {
    return fgets($socket, 1024) ?: '';
}

/**
 * Read full SMTP response (multi-line).
 */
function smtpReadFull($socket) {
    $response = '';
    do {
        $line = smtpRead($socket);
        $response .= $line;
    } while (strlen($line) >= 4 && $line[3] === '-');
    return $response;
}

/**
 * Send a command and read response.
 */
function smtpCmd($socket, $cmd) {
    fwrite($socket, $cmd . "\r\n");
    return smtpReadFull($socket);
}

/**
 * Send an HTML email via Hostinger SMTP (SSL port 465).
 * Returns true on success, false on failure.
 */
function sendMail($to, $subject, $htmlBody, $replyTo = '') {
    $socket = @fsockopen('ssl://' . SMTP_HOST, SMTP_PORT, $errno, $errstr, 8);
    if (!$socket) return false;

    stream_set_timeout($socket, 8);

    smtpReadFull($socket); // greeting

    smtpCmd($socket, 'EHLO bonifaciossancarlos.com');
    smtpCmd($socket, 'AUTH LOGIN');
    smtpCmd($socket, base64_encode(SMTP_USER));
    $authResp = smtpCmd($socket, base64_encode(SMTP_PASS));

    if (strpos($authResp, '235') === false) {
        fclose($socket);
        return false;
    }

    smtpCmd($socket, 'MAIL FROM:<' . SMTP_USER . '>');

    $recipients = is_array($to) ? $to : [$to];
    foreach ($recipients as $recipient) {
        smtpCmd($socket, 'RCPT TO:<' . trim($recipient) . '>');
    }

    smtpCmd($socket, 'DATA');

    // Build message headers + body
    $toHeader = is_array($to) ? implode(', ', $to) : $to;
    $encodedSubject = smtpEncodeHeader($subject);
    $messageId = '<' . time() . '.' . uniqid() . '@bonifaciossancarlos.com>';
    $boundary = '----=_Part_' . md5(uniqid());

    $msg  = "From: " . SMTP_NAME . " <" . SMTP_USER . ">\r\n";
    $msg .= "To: $toHeader\r\n";
    $msg .= "Subject: $encodedSubject\r\n";
    $msg .= "Message-ID: $messageId\r\n";
    $msg .= "Date: " . date('r') . "\r\n";
    $msg .= "MIME-Version: 1.0\r\n";
    $msg .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
    if ($replyTo) $msg .= "Reply-To: $replyTo\r\n";
    $msg .= "\r\n";
    
    // Plain text version
    $msg .= "--$boundary\r\n";
    $msg .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $msg .= strip_tags($htmlBody) . "\r\n\r\n";
    
    // HTML version
    $msg .= "--$boundary\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $msg .= $htmlBody . "\r\n\r\n";
    
    $msg .= "--$boundary--\r\n";

    fwrite($socket, $msg);
    fwrite($socket, "\r\n.\r\n"); // SMTP data terminator
    smtpReadFull($socket); // data accepted response

    smtpCmd($socket, 'QUIT');
    fclose($socket);
    return true;
}
?>

