<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

$conn = getConnection();

// Check if user is admin
$userSql = "SELECT role FROM users WHERE id = ?";
$stmt = $conn->prepare($userSql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$userResult = $stmt->get_result();
$user = $userResult->fetch_assoc();

if ($user['role'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden - Admin only']);
    exit();
}

// Check if file and employee_id were uploaded
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió ninguna foto']);
    exit();
}

if (!isset($_POST['employee_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Employee ID required']);
    exit();
}

$employeeId = intval($_POST['employee_id']);
$photoType = isset($_POST['photo_type']) ? $_POST['photo_type'] : 'profile';
$file = $_FILES['photo'];
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de archivo no permitido. Solo imágenes JPG, PNG, GIF o WEBP']);
    exit();
}

// Max 50MB
if ($file['size'] > 50 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'La imagen es demasiado grande. Máximo 50MB']);
    exit();
}

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/employee-photos/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$prefix = $photoType === 'id' ? 'id_' : 'employee_';
$filename = $prefix . $employeeId . '_' . time() . '.' . $extension;
$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar la imagen']);
    exit();
}

// Update employee photo in database
$photoUrl = '/api/uploads/employee-photos/' . $filename;
$dbColumn = $photoType === 'id' ? 'id_photo' : 'photo';

// Update employee_files
$updateStmt = $conn->prepare("UPDATE employee_files SET {$dbColumn} = ? WHERE id = ?");
$updateStmt->bind_param("si", $photoUrl, $employeeId);
$updateStmt->execute();

// Also update executive_report.photo (this is what Employees.jsx actually reads)
if ($photoType !== 'id') {
    $erStmt = $conn->prepare(
        "UPDATE executive_report er
         JOIN employee_files ef ON TRIM(LOWER(er.name)) = TRIM(LOWER(ef.name))
         SET er.photo = ?
         WHERE ef.id = ?"
    );
    $erStmt->bind_param("si", $photoUrl, $employeeId);
    $erStmt->execute();
}

echo json_encode([
    'success' => true,
    'message' => 'Foto actualizada',
    'photoUrl' => $photoUrl
]);

$conn->close();
?>
