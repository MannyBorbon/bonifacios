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
    
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Only administrators can delete quotes']);
        exit;
    }
    
    // Get quote ID from URL
    $quoteId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$quoteId) {
        http_response_code(400);
        echo json_encode(['error' => 'Quote ID is required']);
        exit;
    }
    
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
    
    // Delete quote
    $stmt = $conn->prepare("DELETE FROM event_quotes WHERE id = ?");
    $stmt->bind_param("i", $quoteId);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Quote deleted successfully'
        ]);
    } else {
        throw new Exception("Failed to delete quote");
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>
