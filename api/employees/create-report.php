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

// Check required parameters
if (!isset($_POST['employee_id']) || !isset($_POST['report_name']) || !isset($_POST['report_type'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit();
}

$employeeId = intval($_POST['employee_id']);
$reportName = trim($_POST['report_name']);
$reportType = $_POST['report_type'];

// Validate report type
if (!in_array($reportType, ['file', 'text'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid report type']);
    exit();
}

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/employee-reports/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filePath = null;
$content = null;
$photoPath = null;

if ($reportType === 'file') {
    // Handle file upload
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded']);
        exit();
    }

    $file = $_FILES['file'];
    $allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif'];
    
    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type']);
        exit();
    }

    if ($file['size'] > 10 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'File too large. Max 10MB']);
        exit();
    }

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'report_' . $employeeId . '_' . time() . '.' . $extension;

    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to upload file']);
        exit();
    }

    $filePath = '/api/uploads/employee-reports/' . $filename;
} else {
    // Handle text content
    if (!isset($_POST['content']) || empty(trim($_POST['content']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Content is required for text reports']);
        exit();
    }
    $content = trim($_POST['content']);
}

// Handle optional photo upload (for both file and text reports)
if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $photo = $_FILES['photo'];
    $allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (in_array($photo['type'], $allowedPhotoTypes) && $photo['size'] <= 5 * 1024 * 1024) {
        $photoExt = pathinfo($photo['name'], PATHINFO_EXTENSION);
        $photoFilename = 'photo_' . $employeeId . '_' . time() . '.' . $photoExt;
        
        if (move_uploaded_file($photo['tmp_name'], $uploadDir . $photoFilename)) {
            $photoPath = '/api/uploads/employee-reports/' . $photoFilename;
        }
    }
}

// Check if table exists first
$tableCheck = $conn->query("SHOW TABLES LIKE 'employee_reports'");
if ($tableCheck->num_rows === 0) {
    http_response_code(500);
    echo json_encode(['error' => 'La tabla employee_reports no existe. Ejecuta el SQL en phpMyAdmin primero.']);
    $conn->close();
    exit();
}

// Check if photo_path column exists
$hasPhotoPath = false;
$colCheck = $conn->query("SHOW COLUMNS FROM employee_reports LIKE 'photo_path'");
if ($colCheck && $colCheck->num_rows > 0) {
    $hasPhotoPath = true;
}

// Save report to database
if ($hasPhotoPath) {
    $sql = "INSERT INTO employee_reports (employee_id, report_name, report_type, file_path, content, photo_path, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isssssi", $employeeId, $reportName, $reportType, $filePath, $content, $photoPath, $userId);
} else {
    $sql = "INSERT INTO employee_reports (employee_id, report_name, report_type, file_path, content, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("issssi", $employeeId, $reportName, $reportType, $filePath, $content, $userId);
}

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Reporte creado exitosamente',
        'report_id' => $conn->insert_id
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar reporte', 'sql_error' => $stmt->error]);
}

$conn->close();
?>
