<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');

try {
    require_once '../config/database.php';
} catch (Throwable $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Config load failed', 'message' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]));
}

try {
    $conn = getConnection();
    
    $data = json_decode(file_get_contents('php://input'), true);

// Check if this is an auto-accept from admin
$autoAccept = isset($data['autoAccept']) && $data['autoAccept'] === true;
$initialStatus = $autoAccept ? 'Aceptada' : 'Pendiente';

if (!isset($data['name']) || !isset($data['phone']) || !isset($data['position']) || !isset($data['experience'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Required fields missing']);
    exit();
}

$name = $conn->real_escape_string($data['name']);
$estudios = isset($data['estudios']) ? $conn->real_escape_string($data['estudios']) : null;
$email = isset($data['email']) ? $conn->real_escape_string($data['email']) : null;
$phone = $conn->real_escape_string($data['phone']);
$currentJob = isset($data['currentJob']) ? $conn->real_escape_string($data['currentJob']) : null;
$position = $conn->real_escape_string($data['position']);
$experience = isset($data['experience']) ? intval($data['experience']) : 0;
$address = isset($data['address']) ? $conn->real_escape_string($data['address']) : null;
$age = isset($data['age']) ? intval($data['age']) : null;
$gender = isset($data['gender']) ? $conn->real_escape_string($data['gender']) : null;

// Capture IP (geolocation will be done in background after response)
$ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
if (strpos($ipAddress, ',') !== false) {
    $ipAddress = trim(explode(',', $ipAddress)[0]);
}
$ipLocation = ''; // Will be updated in background

$sql = "INSERT INTO job_applications 
        (name, email, phone, age, gender, position, experience, current_job, address, estudios, status, ip_address, ip_location, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

$stmt = $conn->prepare($sql);

// Debug: Check if prepare failed
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'SQL prepare failed: ' . $conn->error]);
    exit();
}

$stmt->bind_param("sssississssss", 
    $name,
    $email,
    $phone,
    $age,
    $gender,
    $position,
    $experience,
    $currentJob,
    $address,
    $estudios,
    $initialStatus,
    $ipAddress,
    $ipLocation
);

if ($stmt->execute()) {
    $applicationId = $stmt->insert_id;

    // Analytics
    @$conn->query("INSERT INTO analytics (metric_type, metric_value, date) 
                   VALUES ('job_applications', 1, CURDATE()) 
                   ON DUPLICATE KEY UPDATE metric_value = metric_value + 1");

    // Enviar correo de notificación (SMTP rápido con fgets, ~2-3s)
    if (file_exists(__DIR__ . '/../config/smtp.php')) {
        require_once __DIR__ . '/../config/smtp.php';
        $adminEmails = [];
        $emailRes = $conn->query("SELECT email FROM users WHERE email IS NOT NULL AND email != '' AND role IN ('administrador','viewer','admin','superadmin')");
        if ($emailRes) {
            while ($row = $emailRes->fetch_assoc()) $adminEmails[] = trim($row['email']);
        }
        error_log('submit.php — destinatarios correo: ' . implode(', ', $adminEmails));
        if (!empty($adminEmails)) {
            $subject = "Nueva solicitud de empleo — {$name} ({$position})";
            $rows = [
                ['Nombre',        htmlspecialchars($name)],
                ['Puesto',        htmlspecialchars($position)],
                ['Teléfono',      htmlspecialchars($phone)],
                ['Correo',        htmlspecialchars($email ?? '—')],
                ['Edad',          $age ? (string)$age : '—'],
                ['Experiencia',   $experience . ' año(s)'],
                ['Estudios',      htmlspecialchars($estudios ?? '—')],
                ['Dirección',     htmlspecialchars($address ?? '—')],
                ['Género',        htmlspecialchars($gender ?? '—')],
                ['Trabajo actual',htmlspecialchars($currentJob ?? '—')],
                ['IP',            htmlspecialchars($ipAddress ?: '—')],
            ];
            $tableRows = '';
            foreach ($rows as [$lbl, $val]) {
                $tableRows .= "<tr>
                  <td style='padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#888;font-weight:600;font-size:13px;width:130px;white-space:nowrap;'>{$lbl}</td>
                  <td style='padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#222;font-size:13px;'>{$val}</td>
                </tr>";
            }
            $body = "<!DOCTYPE html><html lang='es'>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f5f5;padding:32px 0;'>
    <tr><td align='center'>
      <table width='560' cellpadding='0' cellspacing='0' style='background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);'>
        <tr><td style='background:linear-gradient(135deg,#1a2a4a,#2c4a7a);padding:32px;text-align:center;'>
          <p style='margin:0 0 6px;color:#D4AF37;font-size:11px;letter-spacing:3px;text-transform:uppercase;'>Bonifacio&apos;s Restaurant</p>
          <h1 style='margin:0;color:#fff;font-size:22px;font-weight:700;'>Nueva Solicitud de Empleo</h1>
        </td></tr>
        <tr><td style='padding:20px 32px 0;text-align:center;'>
          <span style='display:inline-block;background:#f0f4ff;color:#1a2a4a;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:700;border:1px solid #d0d9f0;'>{$position}</span>
        </td></tr>
        <tr><td style='padding:20px 32px;'>
          <table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;'>{$tableRows}</table>
        </td></tr>
        <tr><td style='padding:8px 32px 32px;text-align:center;'>
          <a href='https://bonifaciossancarlos.com/admin/applications' style='display:inline-block;background:linear-gradient(135deg,#1a2a4a,#2c4a7a);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;'>Ver solicitud en el panel &rarr;</a>
        </td></tr>
        <tr><td style='background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;'>
          <p style='margin:0;color:#aaa;font-size:12px;'>Bonifacio&apos;s Restaurant &middot; San Carlos, Sonora</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>";
            try {
                $sent = sendMail($adminEmails, $subject, $body);
                error_log('submit.php — sendMail resultado: ' . ($sent ? 'OK' : 'FALLO'));
            } catch (Throwable $ex) {
                error_log('submit.php — sendMail excepcion: ' . $ex->getMessage());
            }
        }
    }

    echo json_encode([
        'success'       => true,
        'message'       => 'Application submitted successfully',
        'applicationId' => $applicationId
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to submit application',
        'sql_error' => $stmt->error,
        'errno' => $stmt->errno
    ]);
}

$conn->close();

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'type' => get_class($e),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'trace' => explode("\n", $e->getTraceAsString())
    ]);
}
?>
