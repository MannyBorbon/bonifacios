<?php
// Correo de notificación — llamado internamente por submit.php via cURL fire-and-forget
define('INTERNAL_SECRET', 'bfc_notify_2025');

$isCli  = (php_sapi_name() === 'cli');
$isPost = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
$secret = $_SERVER['HTTP_X_INTERNAL'] ?? '';

if (!$isCli && !($isPost && $secret === INTERNAL_SECRET) && !isset($_GET['app_id'])) {
    http_response_code(403); die('Access denied');
}

$body_raw      = $isCli ? '' : file_get_contents('php://input');
$body_data     = $body_raw ? (json_decode($body_raw, true) ?? []) : [];
$applicationId = $argv[1] ?? $body_data['application_id'] ?? $_GET['app_id'] ?? null;

if (!$applicationId) {
    die('Application ID required');
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/smtp.php';

$conn = getConnection();

// Get application data
$stmt = $conn->prepare("SELECT * FROM job_applications WHERE id = ?");
$stmt->bind_param("i", $applicationId);
$stmt->execute();
$result = $stmt->get_result();
$app = $result->fetch_assoc();

if (!$app) {
    die('Application not found');
}

// Get admin emails
$adminEmails = [];
$emailRes = $conn->query("SELECT email FROM users WHERE email IS NOT NULL AND email != '' AND is_active = 1");
if ($emailRes) {
    while ($row = $emailRes->fetch_assoc()) {
        $adminEmails[] = $row['email'];
    }
}

if (empty($adminEmails)) {
    die('No admin emails found');
}

// Geo lookup — actualizar ip_location en DB antes de mandar correo
if (!empty($app['ip_address']) && !in_array($app['ip_address'], ['127.0.0.1', '::1']) && empty($app['ip_location'])) {
    $ctx = stream_context_create(['http' => ['timeout' => 5]]);
    $geo = @file_get_contents("http://ip-api.com/json/{$app['ip_address']}?fields=status,city,regionName,country,lat,lon,isp&lang=es", false, $ctx);
    if ($geo) {
        $geoData = json_decode($geo, true);
        if ($geoData && $geoData['status'] === 'success') {
            $parts = [];
            if (!empty($geoData['city']))       $parts[] = $geoData['city'];
            if (!empty($geoData['regionName'])) $parts[] = $geoData['regionName'];
            if (!empty($geoData['country']))    $parts[] = $geoData['country'];
            $loc = implode(', ', $parts);
            if (!empty($geoData['lat']) && !empty($geoData['lon'])) $loc .= " ({$geoData['lat']}, {$geoData['lon']})";
            if (!empty($geoData['isp'])) $loc .= " - ISP: {$geoData['isp']}";
            $app['ip_location'] = $loc;
            $upd = $conn->prepare("UPDATE job_applications SET ip_location = ? WHERE id = ?");
            $upd->bind_param('si', $loc, $applicationId);
            $upd->execute();
        }
    }
}

// Build email
$subject = "Nueva solicitud de empleo — {$app['name']} ({$app['position']})";
$tableRows = '';

$rows = [
    ['Nombre',      htmlspecialchars($app['name'])],
    ['Puesto',      htmlspecialchars($app['position'])],
    ['Teléfono',    htmlspecialchars($app['phone'])],
    ['Correo',      htmlspecialchars($app['email'] ?? '—')],
    ['Edad',        $app['age'] ? (string)$app['age'] : '—'],
    ['Experiencia', $app['experience'] . ' año(s)'],
    ['Estudios',    htmlspecialchars($app['estudios'] ?? '—')],
    ['Dirección',   htmlspecialchars($app['address'] ?? '—')],
    ['IP',          htmlspecialchars($app['ip_address'] ?? '—')],
    ['Ubicación',   htmlspecialchars($app['ip_location'] ?? '—')],
];

foreach ($rows as [$lbl, $val]) {
    $tableRows .= "
    <tr>
      <td style='padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#888;font-weight:600;font-size:13px;width:130px;white-space:nowrap;'>{$lbl}</td>
      <td style='padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#222;font-size:13px;'>{$val}</td>
    </tr>";
}

$pos  = htmlspecialchars($app['position']);
$body = "<!DOCTYPE html>
<html lang='es'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f5f5;padding:32px 0;'>
    <tr><td align='center'>
      <table width='560' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);'>
        <tr>
          <td style='background:linear-gradient(135deg,#1a2a4a 0%,#2c4a7a 100%);padding:32px 32px 24px;text-align:center;'>
            <p style='margin:0 0 8px 0;color:#D4AF37;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;'>Bonifacio&apos;s Restaurant</p>
            <h1 style='margin:0;color:#ffffff;font-size:22px;font-weight:700;'>Nueva Solicitud de Empleo</h1>
            <p style='margin:10px 0 0;color:rgba(255,255,255,0.6);font-size:13px;'>Se ha recibido una nueva solicitud</p>
          </td>
        </tr>
        <tr>
          <td style='padding:20px 32px 0;text-align:center;'>
            <span style='display:inline-block;background:#f0f4ff;color:#1a2a4a;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:700;border:1px solid #d0d9f0;'>{$pos}</span>
          </td>
        </tr>
        <tr>
          <td style='padding:20px 32px;'>
            <table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;'>
              {$tableRows}
            </table>
          </td>
        </tr>
        <tr>
          <td style='padding:8px 32px 32px;text-align:center;'>
            <a href='https://bonifaciossancarlos.com/admin/applications' style='display:inline-block;background:linear-gradient(135deg,#1a2a4a,#2c4a7a);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.5px;'>Ver solicitud en el panel &rarr;</a>
          </td>
        </tr>
        <tr>
          <td style='background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;'>
            <p style='margin:0;color:#aaa;font-size:12px;'>Bonifacio&apos;s Restaurant &middot; San Carlos, Sonora</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";

// Send email
$success = sendMail($adminEmails, $subject, $body);

$conn->close();

echo $success ? "Email sent\n" : "Email failed\n";
?>
