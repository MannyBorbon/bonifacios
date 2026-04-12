<?php
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Verificar que se envió un archivo
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió ninguna foto']);
    exit();
}

// Obtener ID de la solicitud
$applicationId = $_POST['application_id'] ?? null;

if (!$applicationId) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de solicitud requerido']);
    exit();
}

$file = $_FILES['photo'];
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
$maxSize = 50 * 1024 * 1024; // 50MB

// Validar tipo de archivo
if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de archivo no permitido. Solo JPG, PNG y WEBP.']);
    exit();
}

// Validar tamaño
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'La foto es demasiado grande. Máximo 50MB.']);
    exit();
}

// Directorios destino
$appDir = __DIR__ . '/../../uploads/applications/';
$empDir = __DIR__ . '/../uploads/employee-photos/';
foreach ([$appDir, $empDir] as $dir) {
    if (!file_exists($dir)) mkdir($dir, 0755, true);
}

// Generar nombre único basado en application_id
$extension = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
$filename  = "application_{$applicationId}." . strtolower($extension);

// Guardar en ambas ubicaciones
if (move_uploaded_file($file['tmp_name'], $appDir . $filename)) {
    @copy($appDir . $filename, $empDir . $filename);

    $conn     = getConnection();
    // Usar la ruta de employee-photos como canonical photo_url
    $photoUrl = "/api/uploads/employee-photos/{$filename}";

    $sql  = "UPDATE job_applications SET photo_url = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $photoUrl, $applicationId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'photo_url' => $photoUrl, 'filename' => $filename]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar en base de datos']);
    }
    $conn->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al subir el archivo']);
}
?>
