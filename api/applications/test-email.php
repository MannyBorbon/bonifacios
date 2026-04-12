<?php
// Diagnóstico de correo — visita: https://bonifaciossancarlos.com/api/applications/test-email.php
header('Content-Type: application/json');

$result = [];

// 1. DB + usuarios destinatarios
try {
    require_once __DIR__ . '/../config/database.php';
    $conn = getConnection();
    $res  = $conn->query("SELECT email, role FROM users WHERE email IS NOT NULL AND email != '' AND role IN ('administrador','viewer','admin','superadmin')");
    $emails = [];
    if ($res) while ($r = $res->fetch_assoc()) $emails[] = $r;
    $result['db_emails'] = $emails;
} catch (Throwable $e) {
    $result['db_error'] = $e->getMessage();
}

// 2. Conexión SMTP
require_once __DIR__ . '/../config/smtp.php';

$socket = @fsockopen('ssl://' . SMTP_HOST, SMTP_PORT, $errno, $errstr, 8);
if (!$socket) {
    $result['smtp_connect'] = "FALLO — $errno: $errstr";
} else {
    stream_set_timeout($socket, 8);
    $greeting = smtpReadFull($socket);
    $result['smtp_greeting'] = trim($greeting);

    $ehlo = smtpCmd($socket, 'EHLO bonifaciossancarlos.com');
    $result['smtp_ehlo'] = trim($ehlo);

    smtpCmd($socket, 'AUTH LOGIN');
    smtpCmd($socket, base64_encode(SMTP_USER));
    $authResp = smtpCmd($socket, base64_encode(SMTP_PASS));
    $result['smtp_auth'] = trim($authResp);
    $result['smtp_auth_ok'] = strpos($authResp, '235') !== false;

    if ($result['smtp_auth_ok']) {
        // Intentar mandar correo de prueba al primer admin
        $testTo = !empty($emails) ? $emails[0]['email'] : SMTP_USER;
        $sent = sendMail([$testTo], 'Prueba SMTP — Bonifacios', '<h2>Prueba de correo exitosa</h2><p>El sistema de notificaciones funciona correctamente.</p>');
        $result['test_email_sent_to'] = $testTo;
        $result['test_email_result']  = $sent ? 'ENVIADO OK' : 'FALLO';
    }

    fclose($socket);
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
