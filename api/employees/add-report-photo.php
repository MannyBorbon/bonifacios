<?php
require_once '../config/database.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$userId = $_SESSION['user_id'];
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

if (!isset($_POST['report_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'report_id is required']);
    exit();
}

$reportId = intval($_POST['report_id']);

// Check if report exists
$checkSql = "SELECT id FROM employee_reports WHERE id = ?";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("i", $reportId);
$checkStmt->execute();
if ($checkStmt->get_result()->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Report not found']);
    exit();
}

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/employee-reports/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Handle file upload
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No photo uploaded']);
    exit();
}

$photo = $_FILES['photo'];
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

if (!in_array($photo['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only images allowed']);
    exit();
}

if ($photo['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Max 5MB']);
    exit();
}

$extension = pathinfo($photo['name'], PATHINFO_EXTENSION);
$filename = 'additional_' . $reportId . '_' . time() . '_' . uniqid() . '.' . $extension;

if (!move_uploaded_file($photo['tmp_name'], $uploadDir . $filename)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to upload photo']);
    exit();
}

$photoPath = '/api/uploads/employee-reports/' . $filename;

// Check if table exists first
$tableCheck = $conn->query("SHOW TABLES LIKE 'report_photos'");
if ($tableCheck->num_rows === 0) {
    // Create table if it doesn't exist
    $createTableSql = "CREATE TABLE IF NOT EXISTS `report_photos` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `report_id` int(11) NOT NULL,
      `photo_path` varchar(500) NOT NULL,
      `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_report_id` (`report_id`),
      CONSTRAINT `fk_report_photos_report` FOREIGN KEY (`report_id`) REFERENCES `employee_reports` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $conn->query($createTableSql);
}

// Save photo to database
$sql = "INSERT INTO report_photos (report_id, photo_path) VALUES (?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("is", $reportId, $photoPath);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Photo added successfully',
        'photo_path' => $photoPath,
        'photo_id' => $conn->insert_id
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error saving photo', 'sql_error' => $stmt->error]);
}

$conn->close();
?>
