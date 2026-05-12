<?php
require_once '../config/database.php';

header('Content-Type: application/json');
date_default_timezone_set('America/Hermosillo');

try {
    $userId = requireAuth();
    $conn = getConnection();

    $userStmt = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $userRow = $userStmt->get_result()->fetch_assoc();
    $isAdmin = isset($userRow['role']) && strtolower((string)$userRow['role']) === 'administrador';

    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_notes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(160) NOT NULL,
          content MEDIUMTEXT NULL,
          note_scope ENUM('private','team') NOT NULL DEFAULT 'team',
          owner_user_id INT NULL,
          pinned TINYINT(1) NOT NULL DEFAULT 0,
          created_by INT NOT NULL,
          updated_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_workspace_notes_scope (note_scope),
          INDEX idx_workspace_notes_owner (owner_user_id),
          INDEX idx_workspace_notes_pinned (pinned),
          INDEX idx_workspace_notes_creator (created_by)
        )
    ");
    try { $conn->query("ALTER TABLE workspace_notes ADD COLUMN owner_user_id INT NULL"); } catch (Throwable $e) { /* ignore */ }
    $conn->query("UPDATE workspace_notes SET owner_user_id = created_by WHERE owner_user_id IS NULL");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $sql = "SELECT id, title, content, note_scope, owner_user_id, pinned, created_by, updated_by, created_at, updated_at FROM workspace_notes";
        if (!$isAdmin) {
            $sql .= " WHERE note_scope = 'team' OR owner_user_id = " . intval($userId);
        }
        $sql .= " ORDER BY pinned DESC, updated_at DESC, id DESC";
        $res = $conn->query($sql);
        $notes = [];
        while ($row = $res->fetch_assoc()) {
            $notes[] = $row;
        }
        echo json_encode(['success' => true, 'notes' => $notes]);
        exit;
    }

    if ($method === 'POST') {
        $payload = json_decode(file_get_contents('php://input'), true);
        $action = trim((string)($payload['action'] ?? ''));

        if ($action === 'create_note') {
            $title = trim((string)($payload['title'] ?? ''));
            $content = trim((string)($payload['content'] ?? ''));
            $scope = trim((string)($payload['note_scope'] ?? 'team'));
            if ($title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El título es obligatorio']);
                exit;
            }
            if (!in_array($scope, ['private', 'team'], true)) $scope = 'team';

            $stmt = $conn->prepare("INSERT INTO workspace_notes (title, content, note_scope, owner_user_id, pinned, created_by, updated_by) VALUES (?, ?, ?, ?, 0, ?, ?)");
            $stmt->bind_param('sssiii', $title, $content, $scope, $userId, $userId, $userId);
            $stmt->execute();
            echo json_encode(['success' => true, 'note_id' => (int)$stmt->insert_id]);
            exit;
        }

        if ($action === 'toggle_pin') {
            $noteId = intval($payload['note_id'] ?? 0);
            $pinned = intval($payload['pinned'] ?? 0) ? 1 : 0;
            if ($noteId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'note_id requerido']);
                exit;
            }

            $ownStmt = $conn->prepare("SELECT owner_user_id FROM workspace_notes WHERE id = ? LIMIT 1");
            $ownStmt->bind_param('i', $noteId);
            $ownStmt->execute();
            $own = $ownStmt->get_result()->fetch_assoc();
            if (!$own) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Nota no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($own['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar esta nota']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE workspace_notes SET pinned = ?, updated_by = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('iii', $pinned, $userId, $noteId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'update_note') {
            $noteId = intval($payload['note_id'] ?? 0);
            $title = trim((string)($payload['title'] ?? ''));
            $content = trim((string)($payload['content'] ?? ''));
            if ($noteId <= 0 || $title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'note_id y title son obligatorios']);
                exit;
            }

            $ownStmt = $conn->prepare("SELECT owner_user_id FROM workspace_notes WHERE id = ? LIMIT 1");
            $ownStmt->bind_param('i', $noteId);
            $ownStmt->execute();
            $own = $ownStmt->get_result()->fetch_assoc();
            if (!$own) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Nota no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($own['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar esta nota']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE workspace_notes SET title = ?, content = ?, updated_by = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('ssii', $title, $content, $userId, $noteId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'delete_note') {
            $noteId = intval($payload['note_id'] ?? 0);
            if ($noteId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'note_id requerido']);
                exit;
            }

            $ownStmt = $conn->prepare("SELECT owner_user_id FROM workspace_notes WHERE id = ? LIMIT 1");
            $ownStmt->bind_param('i', $noteId);
            $ownStmt->execute();
            $own = $ownStmt->get_result()->fetch_assoc();
            if (!$own) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Nota no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($own['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para eliminar esta nota']);
                exit;
            }

            $stmt = $conn->prepare("DELETE FROM workspace_notes WHERE id = ?");
            $stmt->bind_param('i', $noteId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Acción no válida']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

