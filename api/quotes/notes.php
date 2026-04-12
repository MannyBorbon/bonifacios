<?php
require_once '../config/database.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
try {
    $userId = requireAuth();
    $conn = getConnection();

    if ($method === 'GET') {
        $quoteId = isset($_GET['quote_id']) ? intval($_GET['quote_id']) : 0;
        if (!$quoteId) { http_response_code(400); echo json_encode(['error' => 'quote_id required']); exit; }
        $stmt = $conn->prepare("SELECT n.*, u.full_name as author_name FROM quote_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.quote_id = ? ORDER BY n.created_at DESC");
        $stmt->bind_param("i", $quoteId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'notes' => $rows]);

    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $quoteId = intval($data['quote_id'] ?? 0);
        $note = trim($data['note'] ?? '');
        if (!$quoteId || !$note) { http_response_code(400); echo json_encode(['error' => 'quote_id and note required']); exit; }
        $stmt = $conn->prepare("INSERT INTO quote_notes (quote_id, user_id, note) VALUES (?, ?, ?)");
        $stmt->bind_param("iis", $quoteId, $userId, $note);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $fetch = $conn->prepare("SELECT n.*, u.full_name as author_name FROM quote_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?");
        $fetch->bind_param("i", $newId);
        $fetch->execute();
        $newNote = $fetch->get_result()->fetch_assoc();
        echo json_encode(['success' => true, 'note' => $newNote]);

    } elseif ($method === 'DELETE') {
        $noteId = intval($_GET['id'] ?? 0);
        if (!$noteId) { http_response_code(400); echo json_encode(['error' => 'Note ID required']); exit; }
        $stmt = $conn->prepare("DELETE FROM quote_notes WHERE id = ?");
        $stmt->bind_param("i", $noteId);
        $stmt->execute();
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
$conn->close();
?>
