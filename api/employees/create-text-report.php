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

$data = json_decode(file_get_contents('php://input'), true);

$personId = $data['person_id'] ?? null;
$folderPath = $data['folder_path'] ?? '/';
$reportName = $data['report_name'] ?? null;
$textContent = $data['text_content'] ?? null;

if (!$personId || !$reportName || !$textContent) {
    http_response_code(400);
    echo json_encode(['error' => 'Person ID, report name, and content are required']);
    exit();
}

try {
    $stmt = getPDO()->prepare("
        INSERT INTO employee_reports 
        (person_id, folder_path, report_name, report_type, text_content, created_by) 
        VALUES (?, ?, ?, 'text', ?, ?)
    ");
    
    $stmt->execute([
        $personId,
        $folderPath,
        $reportName,
        $textContent,
        $user
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Text report created successfully',
        'report_id' => getPDO()->lastInsertId()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
