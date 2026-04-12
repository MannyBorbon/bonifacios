<?php
require_once '../config/database.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$personId = $_GET['person_id'] ?? null;
$folderPath = $_GET['folder_path'] ?? '/';

if (!$personId) {
    http_response_code(400);
    echo json_encode(['error' => 'Person ID is required']);
    exit();
}

try {
    // Get reports in current folder
    $stmt = getPDO()->prepare("
        SELECT r.*, u.username as created_by_name
        FROM employee_reports r
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.person_id = ? AND r.folder_path = ?
        ORDER BY r.created_at DESC
    ");
    
    $stmt->execute([$personId, $folderPath]);
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get subfolders
    $stmt = getPDO()->prepare("
        SELECT DISTINCT 
            SUBSTRING_INDEX(SUBSTRING(folder_path, LENGTH(?) + 1), '/', 1) as folder_name
        FROM employee_reports
        WHERE person_id = ? 
        AND folder_path LIKE CONCAT(?, '%')
        AND folder_path != ?
        AND SUBSTRING(folder_path, LENGTH(?) + 1) != ''
    ");
    
    $stmt->execute([$folderPath, $personId, $folderPath, $folderPath, $folderPath]);
    $folders = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Remove empty values and duplicates
    $folders = array_values(array_unique(array_filter($folders)));
    
    echo json_encode([
        'success' => true,
        'reports' => $reports,
        'folders' => $folders,
        'current_path' => $folderPath
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
