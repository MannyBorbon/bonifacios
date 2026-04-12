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
        echo json_encode(['error' => 'Only administrators can create quotes']);
        exit;
    }
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['name', 'phone', 'email', 'event_type', 'event_date', 'guests'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Field '$field' is required"]);
            exit;
        }
    }
    
    // Sanitize inputs
    $name = $conn->real_escape_string($data['name']);
    $phone = $conn->real_escape_string($data['phone']);
    $email = $conn->real_escape_string($data['email']);
    $eventType = $conn->real_escape_string($data['event_type']);
    $eventDate = $conn->real_escape_string($data['event_date']);
    $guests = intval($data['guests']);
    $location = $conn->real_escape_string($data['location'] ?? '');
    $notes = $conn->real_escape_string($data['notes'] ?? '');
    $status = $conn->real_escape_string($data['status'] ?? 'pending');
    $quoteAmount = !empty($data['quote_amount']) ? floatval($data['quote_amount']) : null;
    $assignedTo = !empty($data['assigned_to']) ? intval($data['assigned_to']) : null;
    
    // Insert quote
    $sql = "INSERT INTO event_quotes (name, phone, email, event_type, event_date, guests, location, notes, status, quote_amount, assigned_to, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssisssdi", $name, $phone, $email, $eventType, $eventDate, $guests, $location, $notes, $status, $quoteAmount, $assignedTo);
    
    if ($stmt->execute()) {
        $quoteId = $stmt->insert_id;
        
        echo json_encode([
            'success' => true,
            'message' => 'Quote created successfully',
            'quoteId' => $quoteId
        ]);
    } else {
        throw new Exception("Failed to create quote");
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>
