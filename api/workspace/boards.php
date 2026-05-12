<?php
require_once '../config/database.php';

header('Content-Type: application/json');
date_default_timezone_set('America/Hermosillo');

try {
    $userId = requireAuth();
    $conn = getConnection();

    $userStmt = $conn->prepare("SELECT id, role, full_name, username FROM users WHERE id = ? LIMIT 1");
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $currentUser = $userStmt->get_result()->fetch_assoc();
    $isAdmin = isset($currentUser['role']) && strtolower((string)$currentUser['role']) === 'administrador';

    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_boards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(140) NOT NULL,
            description VARCHAR(255) NULL,
            created_by INT NOT NULL,
            owner_user_id INT NULL,
            is_archived TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_workspace_boards_creator (created_by),
            INDEX idx_workspace_boards_owner (owner_user_id),
            INDEX idx_workspace_boards_archived (is_archived)
        )
    ");
    try { $conn->query("ALTER TABLE workspace_boards ADD COLUMN owner_user_id INT NULL"); } catch (Throwable $e) { /* ignore */ }
    $conn->query("UPDATE workspace_boards SET owner_user_id = created_by WHERE owner_user_id IS NULL");

    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_board_columns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            board_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            status_key VARCHAR(40) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_workspace_columns_board (board_id),
            INDEX idx_workspace_columns_sort (board_id, sort_order)
        )
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_board_cards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            board_id INT NOT NULL,
            column_id INT NOT NULL,
            title VARCHAR(180) NOT NULL,
            details TEXT NULL,
            priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
            due_date DATE NULL,
            assigned_to INT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_workspace_cards_board (board_id),
            INDEX idx_workspace_cards_column (column_id),
            INDEX idx_workspace_cards_sort (column_id, sort_order)
        )
    ");
    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_card_checklist_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            content VARCHAR(255) NOT NULL,
            is_done TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_workspace_checklist_card (card_id),
            INDEX idx_workspace_checklist_sort (card_id, sort_order)
        )
    ");
    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_card_comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            content TEXT NOT NULL,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_workspace_comments_card (card_id),
            INDEX idx_workspace_comments_created (created_at)
        )
    ");
    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_card_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            action_key VARCHAR(80) NOT NULL,
            action_label VARCHAR(180) NOT NULL,
            actor_user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_workspace_activity_card (card_id),
            INDEX idx_workspace_activity_created (created_at)
        )
    ");

    $logCardActivity = function($cardId, $actionKey, $actionLabel, $actorUserId) use ($conn) {
        $stmt = $conn->prepare("INSERT INTO workspace_card_activity (card_id, action_key, action_label, actor_user_id) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('issi', $cardId, $actionKey, $actionLabel, $actorUserId);
        $stmt->execute();
    };

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (isset($_GET['users']) && $_GET['users'] === '1') {
            if (!$isAdmin) {
                echo json_encode(['success' => true, 'users' => [[
                    'id' => (int)$currentUser['id'],
                    'username' => $currentUser['username'],
                    'full_name' => $currentUser['full_name'],
                ]]]);
                exit;
            }

            $usersRes = $conn->query("SELECT id, username, full_name, role FROM users WHERE is_active = 1 ORDER BY full_name ASC");
            $users = [];
            while ($u = $usersRes->fetch_assoc()) {
                $users[] = $u;
            }
            echo json_encode(['success' => true, 'users' => $users]);
            exit;
        }

        $boards = [];
        $boardSql = "SELECT b.id, b.name, b.description, b.created_by, b.owner_user_id, b.is_archived, b.created_at, b.updated_at, u.full_name AS owner_name, u.username AS owner_username
                     FROM workspace_boards b
                     LEFT JOIN users u ON u.id = b.owner_user_id
                     WHERE b.is_archived = 0";
        if (!$isAdmin) {
            $boardSql .= " AND b.owner_user_id = " . intval($userId);
        }
        $boardSql .= " ORDER BY b.updated_at DESC, b.id DESC";
        $boardResult = $conn->query($boardSql);
        while ($row = $boardResult->fetch_assoc()) {
            $row['columns'] = [];
            $boards[$row['id']] = $row;
        }

        if (count($boards) === 0) {
            $insertBoard = $conn->prepare("INSERT INTO workspace_boards (name, description, created_by) VALUES (?, ?, ?)");
            $defaultName = 'Operación diaria';
            $defaultDescription = 'Tablero principal para el equipo';
            $insertBoard->bind_param('ssi', $defaultName, $defaultDescription, $userId);
            $insertBoard->execute();
            $boardId = (int)$insertBoard->insert_id;
            $updOwner = $conn->prepare("UPDATE workspace_boards SET owner_user_id = ? WHERE id = ?");
            $updOwner->bind_param('ii', $userId, $boardId);
            $updOwner->execute();

            $defaultColumns = [
                ['Pendiente', 'pending', 1],
                ['En proceso', 'in_progress', 2],
                ['Terminado', 'done', 3],
                ['Cancelado', 'cancelled', 4],
            ];
            $insertColumn = $conn->prepare("INSERT INTO workspace_board_columns (board_id, name, status_key, sort_order) VALUES (?, ?, ?, ?)");
            foreach ($defaultColumns as $col) {
                $insertColumn->bind_param('issi', $boardId, $col[0], $col[1], $col[2]);
                $insertColumn->execute();
            }

            $boardResult = $conn->query($boardSql);
            while ($row = $boardResult->fetch_assoc()) {
                $row['columns'] = [];
                $boards[$row['id']] = $row;
            }
        }

        $columnResult = $conn->query("SELECT id, board_id, name, status_key, sort_order FROM workspace_board_columns ORDER BY sort_order ASC, id ASC");
        while ($col = $columnResult->fetch_assoc()) {
            $boardId = (int)$col['board_id'];
            if (!isset($boards[$boardId])) continue;
            $col['cards'] = [];
            $boards[$boardId]['columns'][$col['id']] = $col;
        }

        $cardResult = $conn->query("SELECT id, board_id, column_id, title, details, priority, due_date, assigned_to, sort_order, created_by, created_at, updated_at FROM workspace_board_cards ORDER BY sort_order ASC, id ASC");
        $cardIds = [];
        while ($card = $cardResult->fetch_assoc()) {
            $boardId = (int)$card['board_id'];
            $columnId = (int)$card['column_id'];
            if (!isset($boards[$boardId])) continue;
            if (!isset($boards[$boardId]['columns'][$columnId])) continue;
            $card['checklist_total'] = 0;
            $card['checklist_done'] = 0;
            $boards[$boardId]['columns'][$columnId]['cards'][] = $card;
            $cardIds[] = (int)$card['id'];
        }

        if (count($cardIds) > 0) {
            $idsCsv = implode(',', array_map('intval', $cardIds));
            $checkAgg = $conn->query("
                SELECT card_id, COUNT(*) AS total_items, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done_items
                FROM workspace_card_checklist_items
                WHERE card_id IN ($idsCsv)
                GROUP BY card_id
            ");
            $checkMap = [];
            while ($row = $checkAgg->fetch_assoc()) {
                $checkMap[(int)$row['card_id']] = [
                    'total' => (int)$row['total_items'],
                    'done' => (int)$row['done_items'],
                ];
            }
            foreach ($boards as $bId => $boardRef) {
                foreach ($boardRef['columns'] as $cId => $columnRef) {
                    foreach ($columnRef['cards'] as $idx => $card) {
                        $cardId = (int)$card['id'];
                        if (isset($checkMap[$cardId])) {
                            $boards[$bId]['columns'][$cId]['cards'][$idx]['checklist_total'] = $checkMap[$cardId]['total'];
                            $boards[$bId]['columns'][$cId]['cards'][$idx]['checklist_done'] = $checkMap[$cardId]['done'];
                        }
                    }
                }
            }
        }

        $out = [];
        foreach ($boards as $board) {
            $board['columns'] = array_values($board['columns']);
            $out[] = $board;
        }

        echo json_encode(['success' => true, 'boards' => $out]);
        exit;
    }

    if ($method === 'POST') {
        $payload = json_decode(file_get_contents('php://input'), true);
        $action = trim((string)($payload['action'] ?? ''));

        if ($action === 'create_board') {
            $name = trim((string)($payload['name'] ?? ''));
            $description = trim((string)($payload['description'] ?? ''));
            $ownerUserId = intval($payload['owner_user_id'] ?? $userId);
            if ($name === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El nombre del tablero es obligatorio']);
                exit;
            }

            if (!$isAdmin) {
                $ownerUserId = $userId;
            }

            $insertBoard = $conn->prepare("INSERT INTO workspace_boards (name, description, created_by) VALUES (?, ?, ?)");
            $insertBoard->bind_param('ssi', $name, $description, $userId);
            $insertBoard->execute();
            $boardId = (int)$insertBoard->insert_id;
            $updOwner = $conn->prepare("UPDATE workspace_boards SET owner_user_id = ? WHERE id = ?");
            $updOwner->bind_param('ii', $ownerUserId, $boardId);
            $updOwner->execute();

            $defaultColumns = [
                ['Pendiente', 'pending', 1],
                ['En proceso', 'in_progress', 2],
                ['Terminado', 'done', 3],
                ['Cancelado', 'cancelled', 4],
            ];
            $insertColumn = $conn->prepare("INSERT INTO workspace_board_columns (board_id, name, status_key, sort_order) VALUES (?, ?, ?, ?)");
            foreach ($defaultColumns as $col) {
                $insertColumn->bind_param('issi', $boardId, $col[0], $col[1], $col[2]);
                $insertColumn->execute();
            }

            echo json_encode(['success' => true, 'board_id' => $boardId]);
            exit;
        }

        if ($action === 'create_card') {
            $boardId = intval($payload['board_id'] ?? 0);
            $columnId = intval($payload['column_id'] ?? 0);
            $title = trim((string)($payload['title'] ?? ''));
            $details = trim((string)($payload['details'] ?? ''));
            $priority = trim((string)($payload['priority'] ?? 'medium'));
            $dueDate = trim((string)($payload['due_date'] ?? ''));
            $assignedTo = intval($payload['assigned_to'] ?? 0);

            if ($boardId <= 0 || $columnId <= 0 || $title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'board_id, column_id y title son obligatorios']);
                exit;
            }

            $boardOwnerCheck = $conn->prepare("SELECT owner_user_id FROM workspace_boards WHERE id = ? LIMIT 1");
            $boardOwnerCheck->bind_param('i', $boardId);
            $boardOwnerCheck->execute();
            $boardInfo = $boardOwnerCheck->get_result()->fetch_assoc();
            if (!$boardInfo) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Tablero no encontrado']);
                exit;
            }
            if (!$isAdmin && intval($boardInfo['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar este tablero']);
                exit;
            }

            if (!in_array($priority, ['low', 'medium', 'high'], true)) {
                $priority = 'medium';
            }
            if ($dueDate === '') $dueDate = null;
            if ($assignedTo <= 0) $assignedTo = null;

            $sortRes = $conn->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM workspace_board_cards WHERE column_id = ?");
            $sortRes->bind_param('i', $columnId);
            $sortRes->execute();
            $nextSort = 1;
            $sortData = $sortRes->get_result()->fetch_assoc();
            if ($sortData && isset($sortData['next_sort'])) {
                $nextSort = (int)$sortData['next_sort'];
            }

            $insertCard = $conn->prepare("INSERT INTO workspace_board_cards (board_id, column_id, title, details, priority, due_date, assigned_to, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insertCard->bind_param('iissssiii', $boardId, $columnId, $title, $details, $priority, $dueDate, $assignedTo, $nextSort, $userId);
            $insertCard->execute();
            $newCardId = (int)$insertCard->insert_id;
            $logCardActivity($newCardId, 'create_card', 'Card creada', $userId);
            if ($assignedTo) {
                $logCardActivity($newCardId, 'assign_card', 'Card asignada a un usuario', $userId);
            }
            if ($dueDate) {
                $logCardActivity($newCardId, 'set_due_date', 'Fecha límite definida', $userId);
            }

            echo json_encode(['success' => true, 'card_id' => $newCardId]);
            exit;
        }

        if ($action === 'get_card_detail') {
            $cardId = intval($payload['card_id'] ?? 0);
            if ($cardId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'card_id requerido']);
                exit;
            }
            $ownerSql = "SELECT c.id, c.title, c.details, c.priority, c.due_date, c.assigned_to, c.column_id, c.board_id, b.owner_user_id
                         FROM workspace_board_cards c
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE c.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $cardId);
            $ownerStmt->execute();
            $card = $ownerStmt->get_result()->fetch_assoc();
            if (!$card) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Card no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($card['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para ver esta card']);
                exit;
            }

            $checklist = [];
            $checkStmt = $conn->prepare("SELECT id, card_id, content, is_done, sort_order, created_by, created_at, updated_at FROM workspace_card_checklist_items WHERE card_id = ? ORDER BY sort_order ASC, id ASC");
            $checkStmt->bind_param('i', $cardId);
            $checkStmt->execute();
            $checkRes = $checkStmt->get_result();
            while ($row = $checkRes->fetch_assoc()) $checklist[] = $row;

            $comments = [];
            $commentSql = "SELECT cm.id, cm.card_id, cm.content, cm.created_by, cm.created_at, u.full_name, u.username
                           FROM workspace_card_comments cm
                           LEFT JOIN users u ON u.id = cm.created_by
                           WHERE cm.card_id = ?
                           ORDER BY cm.created_at DESC, cm.id DESC";
            $commentStmt = $conn->prepare($commentSql);
            $commentStmt->bind_param('i', $cardId);
            $commentStmt->execute();
            $commentRes = $commentStmt->get_result();
            while ($row = $commentRes->fetch_assoc()) $comments[] = $row;

            $activity = [];
            $actSql = "SELECT a.id, a.card_id, a.action_key, a.action_label, a.actor_user_id, a.created_at, u.full_name, u.username
                       FROM workspace_card_activity a
                       LEFT JOIN users u ON u.id = a.actor_user_id
                       WHERE a.card_id = ?
                       ORDER BY a.created_at DESC, a.id DESC
                       LIMIT 30";
            $actStmt = $conn->prepare($actSql);
            $actStmt->bind_param('i', $cardId);
            $actStmt->execute();
            $actRes = $actStmt->get_result();
            while ($row = $actRes->fetch_assoc()) $activity[] = $row;

            echo json_encode(['success' => true, 'card' => $card, 'checklist' => $checklist, 'comments' => $comments, 'activity' => $activity]);
            exit;
        }

        if ($action === 'create_column') {
            $boardId = intval($payload['board_id'] ?? 0);
            $name = trim((string)($payload['name'] ?? ''));
            if ($boardId <= 0 || $name === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'board_id y name son obligatorios']);
                exit;
            }

            $ownerCheck = $conn->prepare("SELECT owner_user_id FROM workspace_boards WHERE id = ? LIMIT 1");
            $ownerCheck->bind_param('i', $boardId);
            $ownerCheck->execute();
            $owner = $ownerCheck->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Tablero no encontrado']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar este tablero']);
                exit;
            }

            $sortStmt = $conn->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM workspace_board_columns WHERE board_id = ?");
            $sortStmt->bind_param('i', $boardId);
            $sortStmt->execute();
            $sortData = $sortStmt->get_result()->fetch_assoc();
            $nextSort = (int)($sortData['next_sort'] ?? 1);

            $statusKey = strtolower(preg_replace('/[^a-z0-9]+/', '_', $name));
            if ($statusKey === '') $statusKey = 'custom';
            $insert = $conn->prepare("INSERT INTO workspace_board_columns (board_id, name, status_key, sort_order) VALUES (?, ?, ?, ?)");
            $insert->bind_param('issi', $boardId, $name, $statusKey, $nextSort);
            $insert->execute();

            echo json_encode(['success' => true, 'column_id' => (int)$insert->insert_id]);
            exit;
        }

        if ($action === 'delete_column') {
            $columnId = intval($payload['column_id'] ?? 0);
            if ($columnId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'column_id requerido']);
                exit;
            }

            $ownerSql = "SELECT b.owner_user_id, c.board_id
                         FROM workspace_board_columns c
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE c.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $columnId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Columna no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar este tablero']);
                exit;
            }

            $countStmt = $conn->prepare("SELECT COUNT(*) AS total FROM workspace_board_columns WHERE board_id = ?");
            $countStmt->bind_param('i', $owner['board_id']);
            $countStmt->execute();
            $countData = $countStmt->get_result()->fetch_assoc();
            if (intval($countData['total'] ?? 0) <= 1) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El tablero debe mantener al menos una columna']);
                exit;
            }

            $delCards = $conn->prepare("DELETE FROM workspace_board_cards WHERE column_id = ?");
            $delCards->bind_param('i', $columnId);
            $delCards->execute();
            $delColumn = $conn->prepare("DELETE FROM workspace_board_columns WHERE id = ?");
            $delColumn->bind_param('i', $columnId);
            $delColumn->execute();

            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'update_board') {
            $boardId = intval($payload['board_id'] ?? 0);
            $name = trim((string)($payload['name'] ?? ''));
            if ($boardId <= 0 || $name === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'board_id y name son obligatorios']);
                exit;
            }

            $ownerCheck = $conn->prepare("SELECT owner_user_id FROM workspace_boards WHERE id = ? LIMIT 1");
            $ownerCheck->bind_param('i', $boardId);
            $ownerCheck->execute();
            $owner = $ownerCheck->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Tablero no encontrado']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar este tablero']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE workspace_boards SET name = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('si', $name, $boardId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'archive_board') {
            $boardId = intval($payload['board_id'] ?? 0);
            if ($boardId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'board_id requerido']);
                exit;
            }

            $ownerCheck = $conn->prepare("SELECT owner_user_id FROM workspace_boards WHERE id = ? LIMIT 1");
            $ownerCheck->bind_param('i', $boardId);
            $ownerCheck->execute();
            $owner = $ownerCheck->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Tablero no encontrado']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para archivar este tablero']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE workspace_boards SET is_archived = 1, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('i', $boardId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'update_column') {
            $columnId = intval($payload['column_id'] ?? 0);
            $name = trim((string)($payload['name'] ?? ''));
            if ($columnId <= 0 || $name === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'column_id y name son obligatorios']);
                exit;
            }

            $ownerSql = "SELECT b.owner_user_id
                         FROM workspace_board_columns c
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE c.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $columnId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Columna no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar esta columna']);
                exit;
            }

            $statusKey = strtolower(preg_replace('/[^a-z0-9]+/', '_', $name));
            if ($statusKey === '') $statusKey = 'custom';
            $stmt = $conn->prepare("UPDATE workspace_board_columns SET name = ?, status_key = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('ssi', $name, $statusKey, $columnId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'update_card') {
            $cardId = intval($payload['card_id'] ?? 0);
            $title = trim((string)($payload['title'] ?? ''));
            if ($cardId <= 0 || $title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'card_id y title son obligatorios']);
                exit;
            }

            $ownerSql = "SELECT b.owner_user_id
                         FROM workspace_board_cards c
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE c.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $cardId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Card no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para editar esta card']);
                exit;
            }

            $prevStmt = $conn->prepare("SELECT title, details, priority, due_date, assigned_to FROM workspace_board_cards WHERE id = ? LIMIT 1");
            $prevStmt->bind_param('i', $cardId);
            $prevStmt->execute();
            $prev = $prevStmt->get_result()->fetch_assoc();

            $details = trim((string)($payload['details'] ?? ''));
            $priority = trim((string)($payload['priority'] ?? 'medium'));
            if (!in_array($priority, ['low', 'medium', 'high'], true)) {
                $priority = 'medium';
            }
            $dueDate = trim((string)($payload['due_date'] ?? ''));
            if ($dueDate === '') $dueDate = null;
            $assignedTo = intval($payload['assigned_to'] ?? 0);
            if ($assignedTo <= 0) $assignedTo = null;

            $stmt = $conn->prepare("UPDATE workspace_board_cards SET title = ?, details = ?, priority = ?, due_date = ?, assigned_to = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('ssssii', $title, $details, $priority, $dueDate, $assignedTo, $cardId);
            $stmt->execute();
            $logCardActivity($cardId, 'update_card', 'Card actualizada', $userId);
            if ($prev) {
                if ((string)$prev['priority'] !== (string)$priority) {
                    $logCardActivity($cardId, 'change_priority', 'Prioridad de card actualizada', $userId);
                }
                $prevDue = $prev['due_date'] ? (string)$prev['due_date'] : '';
                $nextDue = $dueDate ? (string)$dueDate : '';
                if ($prevDue !== $nextDue) {
                    $logCardActivity($cardId, 'change_due_date', 'Fecha límite modificada', $userId);
                }
                $prevAssigned = intval($prev['assigned_to'] ?? 0);
                $nextAssigned = intval($assignedTo ?? 0);
                if ($prevAssigned !== $nextAssigned) {
                    $logCardActivity($cardId, 'change_assignee', 'Asignación de card modificada', $userId);
                }
            }
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'delete_card') {
            $cardId = intval($payload['card_id'] ?? 0);
            if ($cardId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'card_id requerido']);
                exit;
            }

            $ownerSql = "SELECT b.owner_user_id
                         FROM workspace_board_cards c
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE c.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $cardId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Card no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para eliminar esta card']);
                exit;
            }
            $logCardActivity($cardId, 'delete_card', 'Card eliminada', $userId);

            $stmt = $conn->prepare("DELETE FROM workspace_board_cards WHERE id = ?");
            $stmt->bind_param('i', $cardId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'add_checklist_item') {
            $cardId = intval($payload['card_id'] ?? 0);
            $content = trim((string)($payload['content'] ?? ''));
            if ($cardId <= 0 || $content === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'card_id y content son obligatorios']);
                exit;
            }
            $ownerSql = "SELECT b.owner_user_id
                         FROM workspace_board_cards c
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE c.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $cardId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Card no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                exit;
            }
            $sortStmt = $conn->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM workspace_card_checklist_items WHERE card_id = ?");
            $sortStmt->bind_param('i', $cardId);
            $sortStmt->execute();
            $sortData = $sortStmt->get_result()->fetch_assoc();
            $nextSort = intval($sortData['next_sort'] ?? 1);
            $stmt = $conn->prepare("INSERT INTO workspace_card_checklist_items (card_id, content, sort_order, created_by) VALUES (?, ?, ?, ?)");
            $stmt->bind_param('isii', $cardId, $content, $nextSort, $userId);
            $stmt->execute();
            $logCardActivity($cardId, 'add_checklist_item', 'Checklist agregada', $userId);
            echo json_encode(['success' => true, 'item_id' => (int)$stmt->insert_id]);
            exit;
        }

        if ($action === 'toggle_checklist_item') {
            $itemId = intval($payload['item_id'] ?? 0);
            $isDone = intval($payload['is_done'] ?? 0) ? 1 : 0;
            if ($itemId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'item_id requerido']);
                exit;
            }
            $ownerSql = "SELECT i.card_id, b.owner_user_id
                         FROM workspace_card_checklist_items i
                         INNER JOIN workspace_board_cards c ON c.id = i.card_id
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE i.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $itemId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Checklist no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE workspace_card_checklist_items SET is_done = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('ii', $isDone, $itemId);
            $stmt->execute();
            $logCardActivity(intval($owner['card_id']), 'toggle_checklist_item', $isDone ? 'Checklist completada' : 'Checklist reabierta', $userId);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'delete_checklist_item') {
            $itemId = intval($payload['item_id'] ?? 0);
            if ($itemId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'item_id requerido']);
                exit;
            }
            $ownerSql = "SELECT i.card_id, b.owner_user_id
                         FROM workspace_card_checklist_items i
                         INNER JOIN workspace_board_cards c ON c.id = i.card_id
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE i.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $itemId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Checklist no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                exit;
            }
            $stmt = $conn->prepare("DELETE FROM workspace_card_checklist_items WHERE id = ?");
            $stmt->bind_param('i', $itemId);
            $stmt->execute();
            $logCardActivity(intval($owner['card_id']), 'delete_checklist_item', 'Checklist eliminada', $userId);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'add_comment') {
            $cardId = intval($payload['card_id'] ?? 0);
            $content = trim((string)($payload['content'] ?? ''));
            if ($cardId <= 0 || $content === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'card_id y content son obligatorios']);
                exit;
            }
            $ownerSql = "SELECT b.owner_user_id
                         FROM workspace_board_cards c
                         INNER JOIN workspace_boards b ON b.id = c.board_id
                         WHERE c.id = ? LIMIT 1";
            $ownerStmt = $conn->prepare($ownerSql);
            $ownerStmt->bind_param('i', $cardId);
            $ownerStmt->execute();
            $owner = $ownerStmt->get_result()->fetch_assoc();
            if (!$owner) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Card no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($owner['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                exit;
            }
            $stmt = $conn->prepare("INSERT INTO workspace_card_comments (card_id, content, created_by) VALUES (?, ?, ?)");
            $stmt->bind_param('isi', $cardId, $content, $userId);
            $stmt->execute();
            $logCardActivity($cardId, 'add_comment', 'Nuevo comentario', $userId);
            echo json_encode(['success' => true, 'comment_id' => (int)$stmt->insert_id]);
            exit;
        }

        if ($action === 'move_card') {
            $cardId = intval($payload['card_id'] ?? 0);
            $toColumnId = intval($payload['to_column_id'] ?? 0);
            $toSortOrder = intval($payload['to_sort_order'] ?? 1);

            if ($cardId <= 0 || $toColumnId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'card_id y to_column_id son obligatorios']);
                exit;
            }

            $boardCheckSql = "SELECT b.owner_user_id
                              FROM workspace_board_cards c
                              INNER JOIN workspace_boards b ON b.id = c.board_id
                              WHERE c.id = ? LIMIT 1";
            $boardCheck = $conn->prepare($boardCheckSql);
            $boardCheck->bind_param('i', $cardId);
            $boardCheck->execute();
            $ownerData = $boardCheck->get_result()->fetch_assoc();
            if (!$ownerData) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Card no encontrada']);
                exit;
            }
            if (!$isAdmin && intval($ownerData['owner_user_id']) !== intval($userId)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'No autorizado para mover esta card']);
                exit;
            }

            $update = $conn->prepare("UPDATE workspace_board_cards SET column_id = ?, sort_order = ?, updated_at = NOW() WHERE id = ?");
            $update->bind_param('iii', $toColumnId, $toSortOrder, $cardId);
            $update->execute();
            $logCardActivity($cardId, 'move_card', 'Card movida de columna', $userId);

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

