<?php
require_once '../config/database.php';
header('Content-Type: application/json');

try {
    requireAuth();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    if (empty($_FILES['image'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No image received']);
        exit;
    }

    $file = $_FILES['image'];
    $allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!in_array($file['type'], $allowed)) {
        http_response_code(400);
        echo json_encode(['error' => 'Tipo no permitido']);
        exit;
    }

    if ($file['size'] > 20 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'Imagen demasiado grande (máx 20MB)']);
        exit;
    }

    $uploadDir = __DIR__ . '/../uploads/note-images/';
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

    $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
    $filename = 'note_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;

    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar imagen']);
        exit;
    }

    echo json_encode(['success' => true, 'url' => '/api/uploads/note-images/' . $filename]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
