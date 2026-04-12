<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

$conn = getConnection();

// Get user info
$userSql = "SELECT username, role FROM users WHERE id = ?";
$stmt = $conn->prepare($userSql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$userResult = $stmt->get_result();
$user = $userResult->fetch_assoc();

// Only allow Manuel and Misael to upload photos
$allowedUsers = ['manuel', 'misael'];
if (!in_array(strtolower($user['username']), $allowedUsers)) {
    http_response_code(403);
    echo json_encode(['error' => 'Solo Manuel y Misael pueden subir fotos de perfil']);
    exit();
}

// Check if file was uploaded
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió ninguna foto']);
    exit();
}

$file = $_FILES['photo'];
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de archivo no permitido. Solo imágenes JPG, PNG, GIF o WEBP']);
    exit();
}

// Max 5MB
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'La imagen es demasiado grande. Máximo 5MB']);
    exit();
}

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/profile-photos/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'profile_' . $userId . '_' . time() . '.' . $extension;
$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar la imagen']);
    exit();
}

// Update user profile photo in database
$photoUrl = '/api/uploads/profile-photos/' . $filename;
$updateSql = "UPDATE users SET profile_photo = ? WHERE id = ?";
$updateStmt = $conn->prepare($updateSql);
$updateStmt->bind_param("si", $photoUrl, $userId);

if ($updateStmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Foto de perfil actualizada',
        'photoUrl' => $photoUrl
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al actualizar la base de datos']);
}

$conn->close();
?>
