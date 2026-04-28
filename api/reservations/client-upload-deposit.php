<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$normalizePhone = static function (string $phone): string {
    return preg_replace('/\D+/', '', $phone);
};

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
        exit;
    }

    $conn = getConnection();

    $reservationId = (int)($_POST['reservation_id'] ?? 0);
    $phoneRaw = trim((string)($_POST['phone'] ?? ''));
    $phone = $normalizePhone($phoneRaw);

    if ($reservationId <= 0 || strlen($phone) < 10) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos invalidos']);
        exit;
    }

    if (!isset($_FILES['screenshot']) || !is_array($_FILES['screenshot'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Debes adjuntar un screenshot']);
        exit;
    }

    $file = $_FILES['screenshot'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Error al subir archivo']);
        exit;
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $tmp = $file['tmp_name'];
    $mime = mime_content_type($tmp);
    if (!isset($allowed[$mime])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato no permitido. Usa JPG, PNG o WEBP']);
        exit;
    }

    $maxBytes = 8 * 1024 * 1024;
    if ((int)$file['size'] > $maxBytes) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Archivo demasiado grande (max 8MB)']);
        exit;
    }

    $sqlPhoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),'+',''),'.',''),'/','')";
    $validateSql = "SELECT id FROM special_reservations WHERE id = ? AND RIGHT($sqlPhoneExpr, 10) = RIGHT(?, 10) LIMIT 1";
    $validateStmt = $conn->prepare($validateSql);
    $validateStmt->bind_param('is', $reservationId, $phone);
    $validateStmt->execute();
    $belongs = $validateStmt->get_result()->fetch_assoc();
    if (!$belongs) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Reservacion no encontrada para este celular']);
        exit;
    }

    $uploadDir = __DIR__ . '/../../uploads/reservation-deposits';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0775, true);
    }

    $ext = $allowed[$mime];
    $safeName = 'deposit_' . $reservationId . '_' . time() . '_' . substr(bin2hex(random_bytes(6)), 0, 8) . '.' . $ext;
    $dest = $uploadDir . '/' . $safeName;
    if (!move_uploaded_file($tmp, $dest)) {
        throw new Exception('No se pudo guardar la imagen');
    }

    $publicPath = '/uploads/reservation-deposits/' . $safeName;
    $updateSql = "UPDATE special_reservations
                  SET status = 'uploaded',
                      notes = CONCAT(IFNULL(notes, ''), '\nComprobante: ', ?),
                      updated_at = NOW()
                  WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param('si', $publicPath, $reservationId);
    $updateStmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Comprobante enviado correctamente',
        'deposit_screenshot' => $publicPath
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

