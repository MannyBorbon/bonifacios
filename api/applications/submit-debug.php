<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');

try {
    require_once '../config/database.php';
    $conn = getConnection();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        throw new Exception('No JSON data received');
    }
    
    // Check required fields
    if (!isset($data['name']) || !isset($data['phone']) || !isset($data['position']) || !isset($data['experience'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Required fields missing', 'received' => array_keys($data)]);
        exit();
    }
    
    $autoAccept = isset($data['autoAccept']) && $data['autoAccept'] === true;
    $initialStatus = $autoAccept ? 'Aceptada' : 'Pendiente';
    
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
    
    // Ensure ip columns exist
    @$conn->query("ALTER TABLE job_applications ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL");
    @$conn->query("ALTER TABLE job_applications ADD COLUMN ip_location TEXT DEFAULT NULL");
    
    // Capture IP
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    if (strpos($ipAddress, ',') !== false) {
        $ipAddress = trim(explode(',', $ipAddress)[0]);
    }
    
    // Geolocate
    $ipLocation = '';
    if ($ipAddress && $ipAddress !== '127.0.0.1' && $ipAddress !== '::1') {
        $geo = @file_get_contents("http://ip-api.com/json/{$ipAddress}?fields=status,city,regionName,country,lat,lon,isp&lang=es");
        if ($geo) {
            $geoData = json_decode($geo, true);
            if ($geoData && $geoData['status'] === 'success') {
                $parts = [];
                if (!empty($geoData['city']))       $parts[] = $geoData['city'];
                if (!empty($geoData['regionName'])) $parts[] = $geoData['regionName'];
                if (!empty($geoData['country']))    $parts[] = $geoData['country'];
                $ipLocation = implode(', ', $parts);
                if (!empty($geoData['lat']) && !empty($geoData['lon'])) {
                    $ipLocation .= " ({$geoData['lat']}, {$geoData['lon']})";
                }
                if (!empty($geoData['isp'])) {
                    $ipLocation .= " - ISP: {$geoData['isp']}";
                }
            }
        }
    }
    
    $sql = "INSERT INTO job_applications 
            (name, email, phone, age, gender, position, experience, current_job, address, estudios, status, ip_address, ip_location, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('SQL prepare failed: ' . $conn->error);
    }
    
    $bindResult = $stmt->bind_param("sssississssss", 
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
    
    if (!$bindResult) {
        throw new Exception('bind_param failed: ' . $stmt->error);
    }
    
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error . ' (errno: ' . $stmt->errno . ')');
    }
    
    $applicationId = $stmt->insert_id;
    
    // Analytics
    @$conn->query("INSERT INTO analytics (metric_type, metric_value, date) 
                   VALUES ('job_applications', 1, CURDATE()) 
                   ON DUPLICATE KEY UPDATE metric_value = metric_value + 1");
    
    echo json_encode([
        'success' => true,
        'message' => 'Application submitted successfully',
        'applicationId' => $applicationId,
        'debug' => [
            'ip' => $ipAddress,
            'location' => $ipLocation,
            'status' => $initialStatus
        ]
    ]);
    
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    
    // Email notification (after response)
    if (file_exists(__DIR__ . '/../config/smtp.php')) {
        require_once '../config/smtp.php';
        $adminEmails = [];
        $emailRes = $conn->query("SELECT email FROM users WHERE email IS NOT NULL AND email != '' AND is_active = 1");
        if ($emailRes) {
            while ($row = $emailRes->fetch_assoc()) $adminEmails[] = $row['email'];
        }
        if (!empty($adminEmails)) {
            $subject = "Nueva solicitud de empleo — {$name} ({$position})";
            $body  = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>";
            $body .= "<body style='font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;'>";
            $body .= "<div style='max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:28px;'>";
            $body .= "<h2 style='color:#1a2a4a;'>Nueva Solicitud de Empleo</h2>";
            $body .= "<table style='width:100%;font-size:14px;border-collapse:collapse;'>";
            $rows = [
                ['Nombre',      htmlspecialchars($name)],
                ['Puesto',      htmlspecialchars($position)],
                ['Teléfono',    htmlspecialchars($phone)],
                ['Correo',      htmlspecialchars($email ?? '—')],
                ['Edad',        $age ? (string)$age : '—'],
                ['Experiencia', $experience . ' año(s)'],
                ['Estudios',    htmlspecialchars($estudios ?? '—')],
                ['Dirección',   htmlspecialchars($address ?? '—')],
                ['IP',          htmlspecialchars($ipAddress)],
                ['Ubicación',   htmlspecialchars($ipLocation ?: '—')],
            ];
            foreach ($rows as [$lbl, $val]) {
                $body .= "<tr style='border-bottom:1px solid #eee;'>";
                $body .= "<td style='padding:7px 4px;color:#666;font-weight:600;width:110px;'>{$lbl}</td>";
                $body .= "<td style='padding:7px 4px;color:#222;'>{$val}</td></tr>";
            }
            $body .= "</table>";
            $body .= "<div style='margin-top:20px;text-align:center;'>";
            $body .= "<a href='https://bonifaciossancarlos.com/admin/applications' style='background:#1a2a4a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;'>Ver en el panel</a>";
            $body .= "</div></div></body></html>";
            try { @sendMail($adminEmails, $subject, $body); } catch (Throwable $e) {}
        }
    }
    
    $conn->close();
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
