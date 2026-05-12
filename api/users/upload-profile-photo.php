<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    $conn->close();
    exit();
}

// Get user info
$userSql = 'SELECT username, role FROM users WHERE id = ?';
$stmt = $conn->prepare($userSql);
$stmt->bind_param('i', $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
    $conn->close();
    exit();
}

// Only allow Manuel and Misael to upload photos
$allowedUsers = ['manuel', 'misael'];
if (!in_array(strtolower($user['username']), $allowedUsers, true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Solo Manuel y Misael pueden subir fotos de perfil']);
    $conn->close();
    exit();
}

// Check if file was uploaded
if (!isset($_FILES['photo']) || !is_array($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No se recibió ninguna foto']);
    $conn->close();
    exit();
}

$file = $_FILES['photo'];
$tmp = $file['tmp_name'] ?? '';

// Max 5MB
if (($file['size'] ?? 0) > 5 * 1024 * 1024 || ($file['size'] ?? 0) <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'La imagen es demasiado grande o está vacía. Máximo 5MB']);
    $conn->close();
    exit();
}

if ($tmp === '' || !is_uploaded_file($tmp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Archivo de subida inválido']);
    $conn->close();
    exit();
}

$mimeToExt = [
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
];

$detected = null;
if (function_exists('mime_content_type')) {
    $detected = mime_content_type($tmp);
} elseif (function_exists('finfo_open')) {
    $fi = finfo_open(FILEINFO_MIME_TYPE);
    if ($fi) {
        $detected = finfo_file($fi, $tmp);
        finfo_close($fi);
    }
}

if ($detected === null || $detected === false || !isset($mimeToExt[$detected])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Tipo de archivo no permitido. Solo JPG, PNG, GIF o WEBP']);
    $conn->close();
    exit();
}

$ext = $mimeToExt[$detected];

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/profile-photos/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = 'profile_' . $userId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($tmp, $filepath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al guardar la imagen']);
    $conn->close();
    exit();
}

// Update user profile photo in database
$photoUrl = '/api/uploads/profile-photos/' . $filename;
$updateSql = 'UPDATE users SET profile_photo = ? WHERE id = ?';
$updateStmt = $conn->prepare($updateSql);
$updateStmt->bind_param('si', $photoUrl, $userId);

if ($updateStmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Foto de perfil actualizada',
        'photoUrl' => $photoUrl,
    ]);
} else {
    @unlink($filepath);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al actualizar la base de datos']);
}

$conn->close();
?>
