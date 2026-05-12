<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn = getConnection();

    $userStmt = $conn->prepare('SELECT role FROM users WHERE id = ?');
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $roleRow = $userStmt->get_result()->fetch_assoc();
    $role = strtolower((string)($roleRow['role'] ?? ''));
    $isAdmin = in_array($role, ['administrador', 'admin', 'superadmin'], true);

    if ($method === 'GET') {
        $quoteId = isset($_GET['quote_id']) ? intval($_GET['quote_id']) : 0;
        if (!$quoteId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'quote_id required']);
            $conn->close();
            exit;
        }
        $stmt = $conn->prepare(
            'SELECT n.*, u.full_name AS author_name FROM quote_notes n '
            . 'LEFT JOIN users u ON n.user_id = u.id WHERE n.quote_id = ? ORDER BY n.created_at DESC'
        );
        $stmt->bind_param('i', $quoteId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'notes' => $rows]);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            $data = [];
        }
        $quoteId = intval($data['quote_id'] ?? 0);
        $note = trim((string)($data['note'] ?? ''));
        if (!$quoteId || $note === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'quote_id and note required']);
            $conn->close();
            exit;
        }
        $stmt = $conn->prepare('INSERT INTO quote_notes (quote_id, user_id, note) VALUES (?, ?, ?)');
        $stmt->bind_param('iis', $quoteId, $userId, $note);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $fetch = $conn->prepare(
            'SELECT n.*, u.full_name AS author_name FROM quote_notes n '
            . 'LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?'
        );
        $fetch->bind_param('i', $newId);
        $fetch->execute();
        $newNote = $fetch->get_result()->fetch_assoc();
        echo json_encode(['success' => true, 'note' => $newNote]);
    } elseif ($method === 'DELETE') {
        $noteId = intval($_GET['id'] ?? 0);
        if (!$noteId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Note ID required']);
            $conn->close();
            exit;
        }
        $chk = $conn->prepare('SELECT id, user_id FROM quote_notes WHERE id = ?');
        $chk->bind_param('i', $noteId);
        $chk->execute();
        $noteRow = $chk->get_result()->fetch_assoc();
        if (!$noteRow) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Note not found']);
            $conn->close();
            exit;
        }
        if (!$isAdmin && (int)$noteRow['user_id'] !== (int)$userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Forbidden']);
            $conn->close();
            exit;
        }
        $stmt = $conn->prepare('DELETE FROM quote_notes WHERE id = ?');
        $stmt->bind_param('i', $noteId);
        $stmt->execute();
        echo json_encode(['success' => true]);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        $conn->close();
        exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
