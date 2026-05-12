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

    $userStmt = $conn->prepare('SELECT role FROM users WHERE id = ?');
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $userRow = $userResult->fetch_assoc();

    $role = strtolower((string)($userRow['role'] ?? ''));
    if (!in_array($role, ['administrador', 'admin', 'superadmin'], true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only administrators can update quotes']);
        $conn->close();
        exit;
    }

    $quoteId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$quoteId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Quote ID is required']);
        $conn->close();
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    $checkStmt = $conn->prepare('SELECT id FROM event_quotes WHERE id = ?');
    $checkStmt->bind_param('i', $quoteId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Quote not found']);
        $conn->close();
        exit;
    }

    /** @var list<string> $updateFields */
    $updateFields = [];
    /** @var array<int|string|float|null> $params */
    $params = [];
    $types = '';

    $stringFields = [
        'name', 'phone', 'email', 'event_type', 'event_date',
        'location', 'notes', 'status', 'cancellation_reason', 'cancellation_notes',
    ];

    foreach ($stringFields as $field) {
        if (!array_key_exists($field, $data)) {
            continue;
        }
        $updateFields[] = '`' . $field . '` = ?';
        $v = $data[$field];
        $params[] = $v === null ? null : trim((string)$v);
        $types .= 's';
    }

    if (array_key_exists('guests', $data)) {
        $updateFields[] = '`guests` = ?';
        $params[] = (int)$data['guests'];
        $types .= 'i';
    }

    if (array_key_exists('quote_amount', $data)) {
        $updateFields[] = '`quote_amount` = ?';
        $qa = $data['quote_amount'];
        if ($qa === '' || $qa === null) {
            $params[] = null;
        } else {
            $params[] = number_format((float)$qa, 2, '.', '');
        }
        $types .= 's';
    }

    if (array_key_exists('assigned_to', $data)) {
        $updateFields[] = '`assigned_to` = ?';
        $at = $data['assigned_to'];
        if ($at === '' || $at === null) {
            $params[] = null;
        } else {
            $params[] = (string)(int)$at;
        }
        $types .= 's';
    }

    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No valid fields to update']);
        $conn->close();
        exit;
    }

    $updateFields[] = 'updated_at = NOW()';

    $sql = 'UPDATE event_quotes SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
    $params[] = $quoteId;
    $types .= 'i';

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Quote updated successfully',
        ]);
    } else {
        throw new Exception('Failed to update quote');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
