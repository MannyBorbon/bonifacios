<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    requireAuth();
    $conn = getConnection();

    $quoteId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$quoteId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Quote ID required']);
        $conn->close();
        exit;
    }

    $stmt = $conn->prepare(
        'SELECT q.*, u.full_name AS assigned_name FROM event_quotes q '
        . 'LEFT JOIN users u ON q.assigned_to = u.id WHERE q.id = ?'
    );
    $stmt->bind_param('i', $quoteId);
    $stmt->execute();
    $quote = $stmt->get_result()->fetch_assoc();

    if (!$quote) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Quote not found']);
        $conn->close();
        exit;
    }

    echo json_encode(['success' => true, 'quote' => $quote]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
