<?php
require_once '../config/database.php';

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

header('Content-Type: application/json');

try {
    $userId = requireAuth();
    $conn = getConnection();
    
    // Check if user is admin
    $userStmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $user = $userResult->fetch_assoc();
    
    if ($user['role'] !== 'administrador') {
        http_response_code(403);
        echo json_encode(['error' => 'Only administrators can update quotes']);
        exit;
    }
    
    // Get quote ID from URL
    $quoteId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$quoteId) {
        http_response_code(400);
        echo json_encode(['error' => 'Quote ID is required']);
        exit;
    }
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Check if quote exists
    $checkStmt = $conn->prepare("SELECT id FROM event_quotes WHERE id = ?");
    $checkStmt->bind_param("i", $quoteId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Quote not found']);
        exit;
    }
    
    // Build update query dynamically
    $updateFields = [];
    $params = [];
    $types = '';
    
    $allowedFields = [
        'name' => 's',
        'phone' => 's', 
        'email' => 's',
        'event_type' => 's',
        'event_date' => 's',
        'guests' => 'i',
        'location' => 's',
        'notes' => 's',
        'status' => 's',
        'quote_amount' => 'd',
        'assigned_to' => 'i',
        'cancellation_reason' => 's',
        'cancellation_notes' => 's',
    ];
    
    foreach ($allowedFields as $field => $type) {
        if (array_key_exists($field, $data)) {
            $updateFields[] = "$field = ?";
            if ($field === 'quote_amount' && ($data[$field] === '' || $data[$field] === null)) {
                $params[] = null;
                $types .= 'd';
            } else {
                $params[] = $conn->real_escape_string($data[$field]);
                $types .= $type;
            }
        }
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update']);
        exit;
    }
    
    // Add updated_at field
    $updateFields[] = "updated_at = NOW()";
    
    // Build query
    $sql = "UPDATE event_quotes SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $params[] = $quoteId;
    $types .= 'i';
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Quote updated successfully'
        ]);
    } else {
        throw new Exception("Failed to update quote");
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>
