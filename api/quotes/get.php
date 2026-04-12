<?php
require_once '../config/database.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');
try {
    $userId = requireAuth();
    $conn = getConnection();
    $quoteId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if (!$quoteId) { http_response_code(400); echo json_encode(['error' => 'Quote ID required']); exit; }
    $stmt = $conn->prepare("SELECT q.*, u.full_name as assigned_name FROM event_quotes q LEFT JOIN users u ON q.assigned_to = u.id WHERE q.id = ?");
    $stmt->bind_param("i", $quoteId);
    $stmt->execute();
    $quote = $stmt->get_result()->fetch_assoc();
    if (!$quote) { http_response_code(404); echo json_encode(['error' => 'Quote not found']); exit; }
    echo json_encode(['success' => true, 'quote' => $quote]);
} catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
$conn->close();
?>
