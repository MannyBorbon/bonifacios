<?php
require_once '../config/database.php';
require_once '../config/smtp.php';

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

header('Content-Type: application/json');

try {
    $conn = getConnection();
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['name', 'phone', 'event_type', 'date', 'location'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Field '$field' is required"]);
            exit;
        }
    }
    
    // Sanitize inputs
    $name = $conn->real_escape_string($data['name']);
    $phone = $conn->real_escape_string($data['phone']);
    $email = $conn->real_escape_string($data['email']);
    $type = $conn->real_escape_string($data['event_type']);
    $date = $conn->real_escape_string($data['date']);
    $guests = intval($data['guests']);
    $notes = $conn->real_escape_string($data['notes'] ?? '');
    $location = $conn->real_escape_string($data['location'] ?? '');
    
    // Insert quote request
    $sql = "INSERT INTO event_quotes (name, phone, email, event_type, event_date, guests, notes, location, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nueva_solicitud', NOW())";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssiss", $name, $phone, $email, $type, $date, $guests, $notes, $location);
    
    if ($stmt->execute()) {
        $quoteId = $stmt->insert_id;
        
        // Build admin notification HTML
        $adminHtml = "
<!DOCTYPE html><html><head><meta charset='UTF-8'>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
  .wrap{max-width:600px;margin:0 auto}
  .header{background:#1a1a1f;color:#D4AF37;padding:20px;text-align:center}
  .header h2{margin:0;font-size:20px}
  .content{background:#f9f9f9;padding:24px}
  .section{margin-bottom:16px}
  .label{font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px}
  .value{font-size:15px;color:#111;font-weight:bold}
  .btn{display:inline-block;margin-top:20px;padding:12px 28px;background:#D4AF37;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px}
  .footer{background:#1a1a1f;color:#F4E4C1;padding:12px;text-align:center;font-size:12px}
  .divider{border:none;border-top:1px solid #e0e0e0;margin:16px 0}
</style></head><body>
<div class='wrap'>
  <div class='header'><h2>Nueva Solicitud de Cotizaci&oacute;n</h2><p style='margin:4px 0 0;font-size:13px;color:#F4E4C1'>ID #$quoteId &nbsp;&middot;&nbsp; " . date('d/m/Y H:i') . " (Sonora)</p></div>
  <div class='content'>
    <p style='margin-top:0'>Se recibi&oacute; una nueva solicitud para un evento de tipo <strong>$type</strong>.</p>
    <hr class='divider'>
    <div class='section'><div class='label'>Cliente</div><div class='value'>$name</div></div>
    <div class='section'><div class='label'>Tel&eacute;fono</div><div class='value'>$phone</div></div>
    <div class='section'><div class='label'>Correo</div><div class='value'>$email</div></div>
    <hr class='divider'>
    <div class='section'><div class='label'>Tipo de evento</div><div class='value'>$type</div></div>
    <div class='section'><div class='label'>Fecha del evento</div><div class='value'>$date</div></div>
    <div class='section'><div class='label'>&Aacute;rea / Ubicaci&oacute;n</div><div class='value'>" . ($location ?: 'No especificada') . "</div></div>
    <div class='section'><div class='label'>Invitados aprox.</div><div class='value'>" . ($guests ?: '&mdash;') . "</div></div>
    " . ($notes ? "<div class='section'><div class='label'>Notas</div><div class='value' style='font-weight:normal'>$notes</div></div>" : "") . "
    <a href='https://bonifaciossancarlos.com/admin/quotes' class='btn'>Ver en el Panel de Cotizaciones</a>
  </div>
  <div class='footer'>Bonifacio's Restaurant &nbsp;&middot;&nbsp; San Carlos, Sonora &nbsp;&middot;&nbsp; info@bonifaciossancarlos.com</div>
</div>
</body></html>";

        // Get admin and viewer users and send via SMTP
        $usersStmt = $conn->prepare("SELECT email FROM users WHERE (role = 'administrador' OR role = 'viewer') AND is_active = TRUE AND email != ''");
        $usersStmt->execute();
        $usersResult = $usersStmt->get_result();
        $adminSubject = "Nueva Solicitud de Cotizacion #$quoteId - $type";
        while ($user = $usersResult->fetch_assoc()) {
            sendMail($user['email'], $adminSubject, $adminHtml, $email);
        }

        // Send confirmation email to client
        if (!empty($email)) {
            $clientHtml = "
<!DOCTYPE html><html><head><meta charset='UTF-8'>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
  .wrap{max-width:600px;margin:0 auto}
  .header{background:#1a1a1f;color:#D4AF37;padding:20px;text-align:center}
  .header h2{margin:0;font-size:20px}
  .content{background:#f9f9f9;padding:24px}
  .section{margin-bottom:12px}
  .label{font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px}
  .value{font-size:14px;color:#111}
  .footer{background:#1a1a1f;color:#F4E4C1;padding:12px;text-align:center;font-size:12px}
  .divider{border:none;border-top:1px solid #e0e0e0;margin:16px 0}
</style></head><body>
<div class='wrap'>
  <div class='header'><h2>&iexcl;Recibimos tu solicitud!</h2></div>
  <div class='content'>
    <p style='margin-top:0'>Hola <strong>$name</strong>,</p>
    <p>Gracias por tu inter&eacute;s. Hemos recibido tu solicitud de cotizaci&oacute;n y nos pondremos en contacto contigo a la brevedad.</p>
    <hr class='divider'>
    <div class='section'><div class='label'>Tipo de evento</div><div class='value'>$type</div></div>
    <div class='section'><div class='label'>Fecha</div><div class='value'>$date</div></div>
    <div class='section'><div class='label'>&Aacute;rea</div><div class='value'>" . ($location ?: '&mdash;') . "</div></div>
    <div class='section'><div class='label'>ID de seguimiento</div><div class='value'>#$quoteId</div></div>
    <hr class='divider'>
    <p style='font-size:13px;color:#555'>Si tienes dudas, cont&aacute;ctanos directamente:<br>&#128222; 622 173 8884 &nbsp;&middot;&nbsp; &#128231; info@bonifaciossancarlos.com</p>
  </div>
  <div class='footer'>Bonifacio's Restaurant &nbsp;&middot;&nbsp; San Carlos, Sonora</div>
</div>
</body></html>";
            sendMail($email, "Hemos recibido tu solicitud - Bonifacio's Restaurant", $clientHtml);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Quote request submitted successfully',
            'quoteId' => $quoteId
        ]);
        
    } else {
        throw new Exception("Failed to save quote request");
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>
