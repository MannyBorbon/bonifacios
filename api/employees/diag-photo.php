<?php
require_once '../config/database.php';
header('Content-Type: application/json');

$conn = getConnection();

// 1. Applications with photo info
$apps = $conn->query("SELECT id, name, photo_url, status FROM job_applications ORDER BY created_at DESC LIMIT 20");
$appRows = $apps->fetch_all(MYSQLI_ASSOC);

// 2. Executive report photo fields
$ers = $conn->query("SELECT id, name, photo FROM executive_report ORDER BY id DESC LIMIT 20");
$erRows = $ers->fetch_all(MYSQLI_ASSOC);

// 3. Files in uploads/applications
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__, 2), '/');
$appDir  = $docRoot . '/uploads/applications/';
$empDir  = $docRoot . '/api/uploads/employee-photos/';

$appFiles = is_dir($appDir) ? array_values(array_diff(scandir($appDir), ['.', '..'])) : ['DIR NOT FOUND: ' . $appDir];
$empFiles = is_dir($empDir) ? array_values(array_diff(scandir($empDir), ['.', '..'])) : ['DIR NOT FOUND: ' . $empDir];

echo json_encode([
    'doc_root'       => $docRoot,
    'applications'   => $appRows,
    'executive_report' => $erRows,
    'uploads_applications_files' => $appFiles,
    'uploads_employee_photos_files' => $empFiles,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

$conn->close();
?>
