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
        CREATE TABLE IF NOT EXISTS workspace_lists (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(140) NOT NULL,
          description VARCHAR(255) NULL,
          color_tag VARCHAR(30) NULL,
          created_by INT NOT NULL,
          owner_user_id INT NULL,
          is_archived TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_workspace_lists_creator (created_by),
          INDEX idx_workspace_lists_owner (owner_user_id),
          INDEX idx_workspace_lists_archived (is_archived)
        )
    ");
    try { $conn->query("ALTER TABLE workspace_lists ADD COLUMN owner_user_id INT NULL"); } catch (Throwable $e) { /* ignore */ }
    $conn->query("UPDATE workspace_lists SET owner_user_id = created_by WHERE owner_user_id IS NULL");

    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_list_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          list_id INT NOT NULL,
          content VARCHAR(255) NOT NULL,
          is_done TINYINT(1) NOT NULL DEFAULT 0,
          priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
          due_date DATE NULL,
          assigned_to INT NULL,
          sort_order INT NOT NULL DEFAULT 0,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_workspace_items_list (list_id),
          INDEX idx_workspace_items_done (is_done),
          INDEX idx_workspace_items_sort (list_id, sort_order)
        )
    ");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $lists = [];
        $sql = "SELECT id, title, description, color_tag, created_by, owner_user_id, is_archived, created_at, updated_at FROM workspace_lists WHERE is_archived = 0";
        if (!$isAdmin) {
            $sql .= " AND owner_user_id = " . intval($userId);
        }
        $sql .= " ORDER BY updated_at DESC, id DESC";
        $res = $conn->query($sql);
        while ($row = $res->fetch_assoc()) {
            $row['items'] = [];
            $lists[$row['id']] = $row;
        }

        if (count($lists) > 0) {
            $itemsRes = $conn->query("SELECT id, list_id, content, is_done, priority, due_date, assigned_to, sort_order, created_by, created_at, updated_at FROM workspace_list_items ORDER BY sort_order ASC, id ASC");
            while ($item = $itemsRes->fetch_assoc()) {
                $listId = (int)$item['list_id'];
                if (isset($lists[$listId])) {
                    $lists[$listId]['items'][] = $item;
                }
            }
        }

        echo json_encode(['success' => true, 'lists' => array_values($lists)]);
        exit;
    }

    if ($method === 'POST') {
        $payload = json_decode(file_get_contents('php://input'), true);
        $action = trim((string)($payload['action'] ?? ''));

        if ($action === 'create_list') {
            $title = trim((string)($payload['title'] ?? ''));
            $description = trim((string)($payload['description'] ?? ''));
            $colorTag = trim((string)($payload['color_tag'] ?? ''));
            $ownerUserId = intval($payload['owner_user_id'] ?? $userId);
            if ($title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El título de la lista es obligatorio']);
                exit;
            }
            if (!$isAdmin) {
                $ownerUserId = $userId;
            }

            $stmt = $conn->prepare("INSERT INTO workspace_lists (title, description, color_tag, created_by, owner_user_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param('sssii', $title, $description, $colorTag, $userId, $ownerUserId);
            $stmt->execute();
            echo json_encode(['success' => true, 'list_id' => (int)$stmt->insert_id]);
            exit;
        }

        if ($action === 'update_list') {
            $listId = intval($payload['list_id'] ?? 0);
            $title = trim((string)($payload['title'] ?? ''));
            if ($listId <= 0 || $title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'list_id y título son obligatorios']);
                exit;
            }

            $ownerCheck = $conn->prepare("SELECT owner_user_id FROM workspace_lists WHERE id = ? LIMIT 1");
            $ownerCheck->bind_param('i', $listId);
            $ownerCheck->execute();
            $owner = $ownerCheck->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Lista no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar esta lista']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE workspace_lists SET title = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('si', $title, $listId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'delete_list') {
            $listId = intval($payload['list_id'] ?? 0);
            if ($listId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'list_id requerido']);
                exit;
            }

            $ownerCheck = $conn->prepare("SELECT owner_user_id FROM workspace_lists WHERE id = ? LIMIT 1");
            $ownerCheck->bind_param('i', $listId);
            $ownerCheck->execute();
            $owner = $ownerCheck->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Lista no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para eliminar esta lista']);
                exit;
            }

            $delItems = $conn->prepare("DELETE FROM workspace_list_items WHERE list_id = ?");
            $delItems->bind_param('i', $listId);
            $delItems->execute();
            $delList = $conn->prepare("DELETE FROM workspace_lists WHERE id = ?");
            $delList->bind_param('i', $listId);
            $delList->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'add_item') {
            $listId = intval($payload['list_id'] ?? 0);
            $content = trim((string)($payload['content'] ?? ''));
            $priority = trim((string)($payload['priority'] ?? 'medium'));
            if ($listId <= 0 || $content === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'list_id y content son obligatorios']);
                exit;
            }
            if (!in_array($priority, ['low', 'medium', 'high'], true)) $priority = 'medium';

            $ownerCheck = $conn->prepare("SELECT owner_user_id FROM workspace_lists WHERE id = ? LIMIT 1");
            $ownerCheck->bind_param('i', $listId);
            $ownerCheck->execute();
            $owner = $ownerCheck->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Lista no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar esta lista']);
                exit;
            }

            $sortQ = $conn->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM workspace_list_items WHERE list_id = ?");
            $sortQ->bind_param('i', $listId);
            $sortQ->execute();
            $sortData = $sortQ->get_result()->fetch_assoc();
            $nextSort = (int)($sortData['next_sort'] ?? 1);

            $stmt = $conn->prepare("INSERT INTO workspace_list_items (list_id, content, priority, sort_order, created_by) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param('issii', $listId, $content, $priority, $nextSort, $userId);
            $stmt->execute();
            echo json_encode(['success' => true, 'item_id' => (int)$stmt->insert_id]);
            exit;
        }

        if ($action === 'update_item') {
            $itemId = intval($payload['item_id'] ?? 0);
            $content = trim((string)($payload['content'] ?? ''));
            if ($itemId <= 0 || $content === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'item_id y contenido son obligatorios']);
                exit;
            }

            $ownerSql = "SELECT l.owner_user_id
                         FROM workspace_list_items i
                         INNER JOIN workspace_lists l ON l.id = i.list_id
                         WHERE i.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $itemId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Ítem no encontrado']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar este ítem']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE workspace_list_items SET content = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('si', $content, $itemId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'delete_item') {
            $itemId = intval($payload['item_id'] ?? 0);
            if ($itemId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'item_id requerido']);
                exit;
            }

            $ownerSql = "SELECT l.owner_user_id
                         FROM workspace_list_items i
                         INNER JOIN workspace_lists l ON l.id = i.list_id
                         WHERE i.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $itemId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Ítem no encontrado']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para eliminar este ítem']);
                exit;
            }

            $stmt = $conn->prepare("DELETE FROM workspace_list_items WHERE id = ?");
            $stmt->bind_param('i', $itemId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'toggle_item') {
            $itemId = intval($payload['item_id'] ?? 0);
            $isDone = intval($payload['is_done'] ?? 0) ? 1 : 0;
            if ($itemId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'item_id requerido']);
                exit;
            }

            $ownerSql = "SELECT l.owner_user_id
                         FROM workspace_list_items i
                         INNER JOIN workspace_lists l ON l.id = i.list_id
                         WHERE i.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $itemId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Ítem no encontrado']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar este ítem']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE workspace_list_items SET is_done = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('ii', $isDone, $itemId);
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

