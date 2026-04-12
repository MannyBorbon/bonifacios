<?php
require_once '../config/database.php';

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    $conn = getConnection();
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Log incoming data for debugging
    error_log("Received data: " . print_r($data, true));
    
    // Validate required fields
    $required = ['name', 'phone', 'email', 'event_type', 'date', 'guests'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Field '$field' is required", 'received_data' => $data]);
            exit;
        }
    }
    
    // Sanitize inputs
    $name = $conn->real_escape_string($data['name']);
    $phone = $conn->real_escape_string($data['phone']);
    $email = $conn->real_escape_string($data['email']);
    $type = $conn->real_escape_string($data['event_type']);
    $date = $conn->real_escape_string($data['date']);
    $guests = intval($data['guests']);
    $notes = $conn->real_escape_string($data['notes'] ?? '');
    $location = $conn->real_escape_string($data['location'] ?? '');
    
    // Check if table exists
    $tableCheck = $conn->prepare("SHOW TABLES LIKE 'event_quotes'");
    $tableCheck->execute();
    if ($tableCheck->get_result()->num_rows === 0) {
        http_response_code(500);
        echo json_encode(['error' => 'Table event_quotes does not exist']);
        exit;
    }
    
    // Insert quote request
    $sql = "INSERT INTO event_quotes (name, phone, email, event_type, event_date, guests, notes, location, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())";
    
    error_log("SQL: " . $sql);
    error_log("Params: " . print_r([$name, $phone, $email, $type, $date, $guests, $notes, $location], true));
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssis", $name, $phone, $email, $type, $date, $guests, $notes, $location);
    
    if ($stmt->execute()) {
        $quoteId = $stmt->insert_id;
        
        echo json_encode([
            'success' => true,
            'message' => 'Quote submitted successfully',
            'quote_id' => $quoteId
        ]);
    } else {
        throw new Exception("Failed to insert quote: " . $stmt->error);
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    error_log("Error in submit.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
