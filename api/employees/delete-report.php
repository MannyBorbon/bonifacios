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
$reportId = $data['report_id'] ?? null;

if (!$reportId) {
    http_response_code(400);
    echo json_encode(['error' => 'Report ID is required']);
    exit();
}

try {
    // Get report info before deleting
    $stmt = getPDO()->prepare("SELECT file_path, report_type FROM employee_reports WHERE id = ?");
    $stmt->execute([$reportId]);
    $report = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$report) {
        http_response_code(404);
        echo json_encode(['error' => 'Report not found']);
        exit();
    }
    
    // Delete file if it exists
    if ($report['report_type'] === 'file' && $report['file_path']) {
        $filePath = __DIR__ . '/../../' . $report['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
    
    // Delete from database
    $stmt = getPDO()->prepare("DELETE FROM employee_reports WHERE id = ?");
    $stmt->execute([$reportId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Report deleted successfully'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
