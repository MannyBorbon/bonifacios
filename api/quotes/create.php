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
        echo json_encode(['success' => false, 'error' => 'Only administrators can create quotes']);
        $conn->close();
        exit;
    }

    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }
    
    // Validate required fields
    $required = ['name', 'phone', 'email', 'event_type', 'event_date', 'guests'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
            $conn->close();
            exit;
        }
    }

    // Valores enlazados por prepared statement (sin real_escape_string)
    $name = trim((string)$data['name']);
    $phone = trim((string)$data['phone']);
    $email = trim((string)$data['email']);
    $eventType = trim((string)$data['event_type']);
    $eventDate = trim((string)$data['event_date']);
    $guests = (int)$data['guests'];
    $location = trim((string)($data['location'] ?? ''));
    $notes = trim((string)($data['notes'] ?? ''));
    $status = trim((string)($data['status'] ?? 'pending'));
    $quoteAmount = isset($data['quote_amount']) && $data['quote_amount'] !== '' && $data['quote_amount'] !== null
        ? (float)$data['quote_amount']
        : null;
    $assignedTo = !empty($data['assigned_to']) ? (int)$data['assigned_to'] : null;
    
    // Insert quote
    $sql = "INSERT INTO event_quotes (name, phone, email, event_type, event_date, guests, location, notes, status, quote_amount, assigned_to, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = $conn->prepare($sql);
    // quote_amount / assigned_to permiten NULL en BD: enlazar como string o null (mysqli mapea NULL correctamente)
    $quoteStr = $quoteAmount !== null ? number_format((float)$quoteAmount, 2, '.', '') : null;
    $assignStr = $assignedTo !== null ? (string)(int)$assignedTo : null;
    $stmt->bind_param(
        'sssssisssss',
        $name,
        $phone,
        $email,
        $eventType,
        $eventDate,
        $guests,
        $location,
        $notes,
        $status,
        $quoteStr,
        $assignStr
    );
    
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
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>
