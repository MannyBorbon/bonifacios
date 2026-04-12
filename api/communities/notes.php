<?php
/**
 * Notas de comunidad
 * POST   /api/communities/notes.php        → agregar nota  { community_id, content }
 * DELETE /api/communities/notes.php?id=    → eliminar nota
 */
declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../config/database.php';
requireAuth();

$conn   = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$user   = json_decode($_COOKIE['user'] ?? '{}', true) ?? [];

if ($method === 'POST') {
    $b           = json_decode(file_get_contents('php://input'), true);
    $commId      = intval($b['community_id'] ?? 0);
    $content     = trim($b['content'] ?? '');
    $createdBy   = $user['username'] ?? 'admin';

    if (!$commId || !$content) {
        http_response_code(400); echo json_encode(['success' => false, 'error' => 'community_id y content requeridos']); exit;
    }

    $stmt = $conn->prepare("INSERT INTO community_notes (community_id, content, created_by) VALUES (?,?,?)");
    $stmt->bind_param('iss', $commId, $content, $createdBy);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id, 'message' => 'Nota agregada']);
    } else {
        http_response_code(500); echo json_encode(['success' => false, 'error' => $stmt->error]);
    }
    $stmt->close();
    exit;
}

if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'id requerido']); exit; }

    $stmt = $conn->prepare("DELETE FROM community_notes WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    echo json_encode(['success' => true, 'deleted' => $stmt->affected_rows > 0]);
    $stmt->close();
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
