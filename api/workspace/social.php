<?php
require_once '../config/database.php';

header('Content-Type: application/json');
date_default_timezone_set('America/Hermosillo');

try {
    $userId = requireAuth();
    $conn = getConnection();

    $extractMentions = function ($text) {
        $mentions = [];
        if (!is_string($text) || trim($text) === '') return $mentions;
        if (preg_match_all('/@([a-zA-Z0-9_.-]{3,40})/', $text, $matches)) {
            $mentions = array_values(array_unique(array_map('strtolower', $matches[1])));
        }
        return $mentions;
    };

    $userStmt = $conn->prepare("SELECT id, role, full_name, username FROM users WHERE id = ? LIMIT 1");
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $currentUser = $userStmt->get_result()->fetch_assoc();
    $isAdmin = isset($currentUser['role']) && strtolower((string)$currentUser['role']) === 'administrador';

    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_social_posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_type ENUM('post','announcement') NOT NULL DEFAULT 'post',
            title VARCHAR(180) NULL,
            content TEXT NOT NULL,
            attachment_url VARCHAR(255) NULL,
            attachment_name VARCHAR(255) NULL,
            attachment_size INT NULL,
            attachment_mime VARCHAR(120) NULL,
            pinned TINYINT(1) NOT NULL DEFAULT 0,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_workspace_social_type (post_type),
            INDEX idx_workspace_social_pinned (pinned),
            INDEX idx_workspace_social_created (created_at)
        )
    ");
    $hasAttachmentUrl = $conn->query("SHOW COLUMNS FROM workspace_social_posts LIKE 'attachment_url'");
    if (!$hasAttachmentUrl || $hasAttachmentUrl->num_rows === 0) {
        @ $conn->query("ALTER TABLE workspace_social_posts ADD COLUMN attachment_url VARCHAR(255) NULL AFTER content");
    }
    $hasAttachmentName = $conn->query("SHOW COLUMNS FROM workspace_social_posts LIKE 'attachment_name'");
    if (!$hasAttachmentName || $hasAttachmentName->num_rows === 0) {
        @ $conn->query("ALTER TABLE workspace_social_posts ADD COLUMN attachment_name VARCHAR(255) NULL AFTER attachment_url");
    }
    $hasAttachmentSize = $conn->query("SHOW COLUMNS FROM workspace_social_posts LIKE 'attachment_size'");
    if (!$hasAttachmentSize || $hasAttachmentSize->num_rows === 0) {
        @ $conn->query("ALTER TABLE workspace_social_posts ADD COLUMN attachment_size INT NULL AFTER attachment_name");
    }
    $hasAttachmentMime = $conn->query("SHOW COLUMNS FROM workspace_social_posts LIKE 'attachment_mime'");
    if (!$hasAttachmentMime || $hasAttachmentMime->num_rows === 0) {
        @ $conn->query("ALTER TABLE workspace_social_posts ADD COLUMN attachment_mime VARCHAR(120) NULL AFTER attachment_size");
    }

    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_social_comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            content TEXT NOT NULL,
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_workspace_social_comment_post (post_id),
            INDEX idx_workspace_social_comment_created (created_at)
        )
    ");
    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_social_reactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            user_id INT NOT NULL,
            reaction_type ENUM('like','insightful','celebrate') NOT NULL DEFAULT 'like',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_post_user_reaction (post_id, user_id, reaction_type),
            INDEX idx_workspace_social_react_post (post_id),
            INDEX idx_workspace_social_react_user (user_id)
        )
    ");
    $conn->query("
        CREATE TABLE IF NOT EXISTS workspace_social_mentions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            comment_id INT NULL,
            mentioned_user_id INT NOT NULL,
            mentioned_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            seen_at TIMESTAMP NULL DEFAULT NULL,
            UNIQUE KEY uniq_workspace_post_comment_mention (post_id, comment_id, mentioned_user_id),
            INDEX idx_workspace_social_mention_post (post_id),
            INDEX idx_workspace_social_mention_user (mentioned_user_id),
            INDEX idx_workspace_social_mention_seen (seen_at)
        )
    ");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $posts = [];
        $postSql = "SELECT p.id, p.post_type, p.title, p.content, p.attachment_url, p.attachment_name, p.attachment_size, p.attachment_mime, p.pinned, p.created_by, p.created_at, p.updated_at, u.full_name, u.username
                    FROM workspace_social_posts p
                    LEFT JOIN users u ON u.id = p.created_by
                    ORDER BY p.pinned DESC, p.created_at DESC, p.id DESC";
        $postRes = $conn->query($postSql);
        while ($row = $postRes->fetch_assoc()) {
            $row['comments'] = [];
            $row['reaction_counts'] = ['like' => 0, 'insightful' => 0, 'celebrate' => 0];
            $row['user_reactions'] = ['like' => false, 'insightful' => false, 'celebrate' => false];
            $posts[$row['id']] = $row;
        }

        if (count($posts) > 0) {
            $commentSql = "SELECT c.id, c.post_id, c.content, c.created_by, c.created_at, u.full_name, u.username
                           FROM workspace_social_comments c
                           LEFT JOIN users u ON u.id = c.created_by
                           ORDER BY c.created_at ASC, c.id ASC";
            $commentRes = $conn->query($commentSql);
            while ($comment = $commentRes->fetch_assoc()) {
                $postId = (int)$comment['post_id'];
                if (isset($posts[$postId])) {
                    $posts[$postId]['comments'][] = $comment;
                }
            }

            $reactionSql = "SELECT post_id, reaction_type, COUNT(*) AS total_reactions
                            FROM workspace_social_reactions
                            GROUP BY post_id, reaction_type";
            $reactionRes = $conn->query($reactionSql);
            while ($reaction = $reactionRes->fetch_assoc()) {
                $postId = (int)$reaction['post_id'];
                if (!isset($posts[$postId])) continue;
                $type = (string)$reaction['reaction_type'];
                $posts[$postId]['reaction_counts'][$type] = (int)$reaction['total_reactions'];
            }

            $userReactionSql = "SELECT post_id, reaction_type
                                FROM workspace_social_reactions
                                WHERE user_id = " . intval($userId);
            $userReactionRes = $conn->query($userReactionSql);
            while ($userReaction = $userReactionRes->fetch_assoc()) {
                $postId = (int)$userReaction['post_id'];
                if (!isset($posts[$postId])) continue;
                $type = (string)$userReaction['reaction_type'];
                $posts[$postId]['user_reactions'][$type] = true;
            }
        }

        $mentionCountStmt = $conn->prepare("SELECT COUNT(*) AS total FROM workspace_social_mentions WHERE mentioned_user_id = ? AND seen_at IS NULL");
        $mentionCountStmt->bind_param('i', $userId);
        $mentionCountStmt->execute();
        $mentionRow = $mentionCountStmt->get_result()->fetch_assoc();
        $unreadMentions = (int)($mentionRow['total'] ?? 0);

        $mentions = [];
        $mentionListStmt = $conn->prepare("
            SELECT m.id, m.post_id, m.comment_id, m.created_at, m.seen_at,
                   p.title AS post_title, p.content AS post_content,
                   u.username AS mentioned_by_username, u.full_name AS mentioned_by_name
            FROM workspace_social_mentions m
            INNER JOIN workspace_social_posts p ON p.id = m.post_id
            LEFT JOIN users u ON u.id = m.mentioned_by
            WHERE m.mentioned_user_id = ?
            ORDER BY (m.seen_at IS NULL) DESC, m.created_at DESC, m.id DESC
            LIMIT 20
        ");
        $mentionListStmt->bind_param('i', $userId);
        $mentionListStmt->execute();
        $mentionRes = $mentionListStmt->get_result();
        while ($mention = $mentionRes->fetch_assoc()) {
            $rawContent = trim((string)($mention['post_content'] ?? ''));
            $mention['post_preview'] = mb_substr($rawContent, 0, 120) . (mb_strlen($rawContent) > 120 ? '…' : '');
            $mentions[] = $mention;
        }

        echo json_encode([
            'success' => true,
            'posts' => array_values($posts),
            'unread_mentions' => $unreadMentions,
            'mentions' => $mentions,
        ]);
        exit;
    }

    if ($method === 'POST') {
        if (isset($_POST['action']) && trim((string)$_POST['action']) === 'upload_attachment') {
            if (!isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Archivo requerido']);
                exit;
            }
            $file = $_FILES['file'];
            $maxSize = 8 * 1024 * 1024; // 8MB
            if ((int)$file['size'] <= 0 || (int)$file['size'] > $maxSize) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Archivo inválido o supera 8MB']);
                exit;
            }
            $allowedMime = [
                'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                'application/pdf',
                'text/plain',
            ];
            $mime = mime_content_type($file['tmp_name']);
            if (!in_array($mime, $allowedMime, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Tipo de archivo no permitido']);
                exit;
            }
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/workspace-social/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $originalName = (string)($file['name'] ?? 'attachment');
            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
            $ext = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));
            $uniqueName = uniqid('social_', true) . ($ext ? ('.' . $ext) : '');
            $filePath = $uploadDir . $uniqueName;
            $fileUrl = '/uploads/workspace-social/' . $uniqueName;
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'No se pudo guardar el archivo']);
                exit;
            }
            echo json_encode([
                'success' => true,
                'attachment' => [
                    'url' => $fileUrl,
                    'name' => $safeName,
                    'size' => (int)$file['size'],
                    'mime' => $mime,
                ],
            ]);
            exit;
        }

        $payload = json_decode(file_get_contents('php://input'), true);
        $action = trim((string)($payload['action'] ?? ''));

        if ($action === 'create_post') {
            $postType = trim((string)($payload['post_type'] ?? 'post'));
            $title = trim((string)($payload['title'] ?? ''));
            $content = trim((string)($payload['content'] ?? ''));
            $attachmentUrl = trim((string)($payload['attachment_url'] ?? ''));
            $attachmentName = trim((string)($payload['attachment_name'] ?? ''));
            $attachmentMime = trim((string)($payload['attachment_mime'] ?? ''));
            $attachmentSize = intval($payload['attachment_size'] ?? 0);
            if (!in_array($postType, ['post', 'announcement'], true)) $postType = 'post';
            if ($postType === 'announcement' && !$isAdmin) $postType = 'post';
            if ($content === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El contenido del post es obligatorio']);
                exit;
            }

            if ($attachmentUrl !== '' && strpos($attachmentUrl, '/uploads/workspace-social/') !== 0) {
                $attachmentUrl = '';
                $attachmentName = '';
                $attachmentMime = '';
                $attachmentSize = 0;
            }
            if ($attachmentUrl === '') {
                $attachmentName = '';
                $attachmentMime = '';
                $attachmentSize = 0;
            }
            $stmt = $conn->prepare("INSERT INTO workspace_social_posts (post_type, title, content, attachment_url, attachment_name, attachment_size, attachment_mime, pinned, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)");
            $stmt->bind_param('sssssisi', $postType, $title, $content, $attachmentUrl, $attachmentName, $attachmentSize, $attachmentMime, $userId);
            $stmt->execute();
            $newPostId = (int)$stmt->insert_id;

            $mentions = $extractMentions($content . ' ' . $title);
            if (count($mentions) > 0) {
                $userRes = $conn->query("SELECT id, username FROM users WHERE username IS NOT NULL AND TRIM(username) <> ''");
                while ($candidate = $userRes->fetch_assoc()) {
                    $mentionedUserId = (int)$candidate['id'];
                    if ($mentionedUserId === (int)$userId) continue;
                    $candidateUsername = strtolower(trim((string)$candidate['username']));
                    if ($candidateUsername === '' || !in_array($candidateUsername, $mentions, true)) continue;
                    $insertMention = $conn->prepare("INSERT IGNORE INTO workspace_social_mentions (post_id, comment_id, mentioned_user_id, mentioned_by) VALUES (?, NULL, ?, ?)");
                    $insertMention->bind_param('iii', $newPostId, $mentionedUserId, $userId);
                    $insertMention->execute();
                }
            }

            echo json_encode(['success' => true, 'post_id' => $newPostId]);
            exit;
        }

        if ($action === 'create_comment') {
            $postId = intval($payload['post_id'] ?? 0);
            $content = trim((string)($payload['content'] ?? ''));
            if ($postId <= 0 || $content === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'post_id y contenido son obligatorios']);
                exit;
            }
            $postCheck = $conn->prepare("SELECT id FROM workspace_social_posts WHERE id = ? LIMIT 1");
            $postCheck->bind_param('i', $postId);
            $postCheck->execute();
            $post = $postCheck->get_result()->fetch_assoc();
            if (!$post) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Post no encontrado']);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO workspace_social_comments (post_id, content, created_by) VALUES (?, ?, ?)");
            $stmt->bind_param('isi', $postId, $content, $userId);
            $stmt->execute();
            $newCommentId = (int)$stmt->insert_id;

            $mentions = $extractMentions($content);
            if (count($mentions) > 0) {
                $userRes = $conn->query("SELECT id, username FROM users WHERE username IS NOT NULL AND TRIM(username) <> ''");
                while ($candidate = $userRes->fetch_assoc()) {
                    $mentionedUserId = (int)$candidate['id'];
                    if ($mentionedUserId === (int)$userId) continue;
                    $candidateUsername = strtolower(trim((string)$candidate['username']));
                    if ($candidateUsername === '' || !in_array($candidateUsername, $mentions, true)) continue;
                    $insertMention = $conn->prepare("INSERT IGNORE INTO workspace_social_mentions (post_id, comment_id, mentioned_user_id, mentioned_by) VALUES (?, ?, ?, ?)");
                    $insertMention->bind_param('iiii', $postId, $newCommentId, $mentionedUserId, $userId);
                    $insertMention->execute();
                }
            }

            echo json_encode(['success' => true, 'comment_id' => $newCommentId]);
            exit;
        }

        if ($action === 'toggle_pin') {
            if (!$isAdmin) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Solo administradores pueden fijar anuncios']);
                exit;
            }
            $postId = intval($payload['post_id'] ?? 0);
            $pinned = intval($payload['pinned'] ?? 0) ? 1 : 0;
            if ($postId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'post_id requerido']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE workspace_social_posts SET pinned = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param('ii', $pinned, $postId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'toggle_reaction') {
            $postId = intval($payload['post_id'] ?? 0);
            $reactionType = trim((string)($payload['reaction_type'] ?? ''));
            if ($postId <= 0 || !in_array($reactionType, ['like', 'insightful', 'celebrate'], true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'post_id y reaction_type válidos son obligatorios']);
                exit;
            }
            $postCheck = $conn->prepare("SELECT id FROM workspace_social_posts WHERE id = ? LIMIT 1");
            $postCheck->bind_param('i', $postId);
            $postCheck->execute();
            $post = $postCheck->get_result()->fetch_assoc();
            if (!$post) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Post no encontrado']);
                exit;
            }

            $existing = $conn->prepare("SELECT id FROM workspace_social_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ? LIMIT 1");
            $existing->bind_param('iis', $postId, $userId, $reactionType);
            $existing->execute();
            $hasReaction = $existing->get_result()->fetch_assoc();

            if ($hasReaction) {
                $del = $conn->prepare("DELETE FROM workspace_social_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?");
                $del->bind_param('iis', $postId, $userId, $reactionType);
                $del->execute();
                echo json_encode(['success' => true, 'reacted' => false]);
                exit;
            }

            $ins = $conn->prepare("INSERT INTO workspace_social_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)");
            $ins->bind_param('iis', $postId, $userId, $reactionType);
            $ins->execute();
            echo json_encode(['success' => true, 'reacted' => true]);
            exit;
        }

        if ($action === 'mark_mentions_seen') {
            $stmt = $conn->prepare("UPDATE workspace_social_mentions SET seen_at = NOW() WHERE mentioned_user_id = ? AND seen_at IS NULL");
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'mark_mention_seen') {
            $mentionId = intval($payload['mention_id'] ?? 0);
            if ($mentionId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'mention_id requerido']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE workspace_social_mentions SET seen_at = NOW() WHERE id = ? AND mentioned_user_id = ? AND seen_at IS NULL");
            $stmt->bind_param('ii', $mentionId, $userId);
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

