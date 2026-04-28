<?php
require_once '../config/database.php';
$userId = requireAuth();
$conn = getConnection();
header('Content-Type: application/json');

try {
    $conn->query("
        CREATE TABLE IF NOT EXISTS support_ticket_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_id INT NOT NULL,
            user_id INT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        $ticketId = intval($_GET['ticket_id'] ?? 0);
        if ($ticketId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ticket_id required']);
            exit;
        }
        $stmt = $conn->prepare("
            SELECT stm.id, stm.ticket_id, stm.user_id, stm.message, stm.created_at, u.full_name
            FROM support_ticket_messages stm
            LEFT JOIN users u ON u.id = stm.user_id
            WHERE stm.ticket_id = ?
            ORDER BY stm.created_at ASC
        ");
        $stmt->bind_param('i', $ticketId);
        $stmt->execute();
        $result = $stmt->get_result();
        $messages = [];
        while ($row = $result->fetch_assoc()) $messages[] = $row;
        echo json_encode(['success' => true, 'messages' => $messages]);
        exit;
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $ticketId = intval($data['ticket_id'] ?? 0);
        $message = trim((string)($data['message'] ?? ''));
        if ($ticketId <= 0 || $message === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ticket_id and message required']);
            exit;
        }
        $stmt = $conn->prepare("INSERT INTO support_ticket_messages (ticket_id, user_id, message) VALUES (?, ?, ?)");
        $stmt->bind_param('iis', $ticketId, $userId, $message);
        $stmt->execute();
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

