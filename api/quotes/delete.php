<?php
require_once '../config/database.php';

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

header('Content-Type: application/json');

try {
    $userId = requireAuth();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    $conn = getConnection();

    // Check if user is admin (rol real en BD: administrador / variantes legacy)
    $userStmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $user = $userResult->fetch_assoc();

    $role = strtolower((string)($user['role'] ?? ''));
    if (!in_array($role, ['administrador', 'admin', 'superadmin'], true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only administrators can delete quotes']);
        $conn->close();
        exit;
    }
    
    // Get quote ID from URL
    $quoteId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$quoteId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Quote ID is required']);
        $conn->close();
        exit;
    }
    
    // Check if quote exists
    $checkStmt = $conn->prepare("SELECT id FROM event_quotes WHERE id = ?");
    $checkStmt->bind_param("i", $quoteId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Quote not found']);
        $conn->close();
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
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>
