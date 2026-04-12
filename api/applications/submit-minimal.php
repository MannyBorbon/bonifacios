<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

try {
    require_once '../config/database.php';
    $conn = getConnection();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['name']) || !isset($data['phone']) || !isset($data['position'])) {
        throw new Exception('Missing required fields');
    }
    
    // Minimal INSERT - only required fields
    $sql = "INSERT INTO job_applications (name, phone, position, experience, status, created_at) 
            VALUES (?, ?, ?, ?, 'Pendiente', NOW())";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    
    $name = $conn->real_escape_string($data['name']);
    $phone = $conn->real_escape_string($data['phone']);
    $position = $conn->real_escape_string($data['position']);
    $experience = isset($data['experience']) ? intval($data['experience']) : 0;
    
    $stmt->bind_param("sssi", $name, $phone, $position, $experience);
    
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }
    
    echo json_encode([
        'success' => true,
        'applicationId' => $stmt->insert_id,
        'message' => 'Minimal test successful'
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => basename($e->getFile())
    ]);
}
?>
