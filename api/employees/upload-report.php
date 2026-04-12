<?php
require_once '../config/database.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$user = $_SESSION['user_id'];

// Check if user is admin
$stmt = getPDO()->prepare("SELECT role FROM users WHERE id = ?");
$stmt->execute([$user]);
$userRole = $stmt->fetchColumn();

if ($userRole !== 'administrador') {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$personId = $_POST['person_id'] ?? null;
$folderPath = $_POST['folder_path'] ?? '/';
$reportName = $_POST['report_name'] ?? null;

if (!$personId || !$reportName) {
    http_response_code(400);
    echo json_encode(['error' => 'Person ID and report name are required']);
    exit();
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit();
}

$file = $_FILES['file'];
$fileType = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// Validate file type
$allowedTypes = ['pdf', 'doc', 'docx'];
if (!in_array($fileType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Only PDF and DOC/DOCX files are allowed']);
    exit();
}

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../../uploads/reports/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$uniqueName = uniqid() . '_' . time() . '.' . $fileType;
$filePath = $uploadDir . $uniqueName;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit();
}

// Save to database
try {
    $stmt = getPDO()->prepare("
        INSERT INTO employee_reports 
        (person_id, folder_path, report_name, report_type, file_path, file_type, created_by) 
        VALUES (?, ?, ?, 'file', ?, ?, ?)
    ");
    
    $stmt->execute([
        $personId,
        $folderPath,
        $reportName,
        'uploads/reports/' . $uniqueName,
        $fileType,
        $user
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Report uploaded successfully',
        'report_id' => getPDO()->lastInsertId()
    ]);
} catch (PDOException $e) {
    // Delete uploaded file if database insert fails
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
