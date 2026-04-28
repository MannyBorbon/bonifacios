<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();
header('Content-Type: application/json');

try {
    $conn->query("
        CREATE TABLE IF NOT EXISTS support_tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            created_by INT NOT NULL,
            title VARCHAR(180) NOT NULL,
            category VARCHAR(60) DEFAULT 'general',
            priority VARCHAR(20) DEFAULT 'normal',
            status VARCHAR(20) DEFAULT 'open',
            conversation_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $status = trim((string)($_GET['status'] ?? ''));
        $sql = "SELECT st.*, u.full_name AS creator_name
                FROM support_tickets st
                LEFT JOIN users u ON u.id = st.created_by
                WHERE 1=1";
        $types = '';
        $params = [];
        if ($status !== '') {
            $sql .= " AND st.status = ?";
            $types .= 's';
            $params[] = $status;
        }
        $sql .= " ORDER BY st.updated_at DESC LIMIT 100";
        $stmt = $conn->prepare($sql);
        if ($types !== '') $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $tickets = [];
        while ($row = $result->fetch_assoc()) $tickets[] = $row;
        echo json_encode(['success' => true, 'tickets' => $tickets]);
        exit;
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $title = trim((string)($data['title'] ?? ''));
        $category = trim((string)($data['category'] ?? 'general'));
        $priority = trim((string)($data['priority'] ?? 'normal'));
        $status = trim((string)($data['status'] ?? 'open'));
        $conversationId = isset($data['conversation_id']) && $data['conversation_id'] !== '' ? intval($data['conversation_id']) : null;

        if ($id > 0) {
            $stmt = $conn->prepare("UPDATE support_tickets SET title = COALESCE(NULLIF(?, ''), title), category = ?, priority = ?, status = ?, conversation_id = ? WHERE id = ?");
            $stmt->bind_param('ssssii', $title, $category, $priority, $status, $conversationId, $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($title === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'title required']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO support_tickets (created_by, title, category, priority, status, conversation_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('issssi', $userId, $title, $category, $priority, $status, $conversationId);
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

