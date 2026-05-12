<?php
require_once '../config/database.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn   = getConnection();

    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'unread';

        if ($action === 'unread') {
            // Get unread notifications for current user
            $stmt = $conn->prepare("
                SELECT id, title, message, type, related_id, related_type, is_read, created_at
                FROM notifications
                WHERE user_id = ? AND is_read = 0
                ORDER BY created_at DESC
                LIMIT 50
            ");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['success' => true, 'notifications' => $rows]);

        } elseif ($action === 'all') {
            $limit = intval($_GET['limit'] ?? 50);
            $stmt = $conn->prepare("
                SELECT id, title, message, type, related_id, related_type, is_read, created_at
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ");
            $stmt->bind_param("ii", $userId, $limit);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['success' => true, 'notifications' => $rows]);

        } elseif ($action === 'meeting_reminders') {
            // Get upcoming meeting reminders (unread, type=event_reminder, related_type=meeting)
            $stmt = $conn->prepare("
                SELECT n.id, n.title, n.message, n.related_id, n.created_at,
                       m.title AS meeting_title, m.scheduled_at, m.status AS meeting_status
                FROM notifications n
                LEFT JOIN meetings m ON m.id = n.related_id
                WHERE n.user_id = ?
                  AND n.is_read = 0
                  AND n.type = 'event_reminder'
                  AND n.related_type = 'meeting'
                ORDER BY n.created_at DESC
                LIMIT 20
            ");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['success' => true, 'reminders' => $rows]);
        }

    } elseif ($method === 'POST') {
        $data   = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'mark_read') {
            $notifId = intval($data['id'] ?? 0);
            if ($notifId > 0) {
                $stmt = $conn->prepare("UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?");
                $stmt->bind_param("ii", $notifId, $userId);
                $stmt->execute();
            }
            echo json_encode(['success' => true]);

        } elseif ($action === 'mark_all_read') {
            $stmt = $conn->prepare("UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            echo json_encode(['success' => true, 'updated' => $stmt->affected_rows]);

        } elseif ($action === 'dismiss_meeting_reminders') {
            // Mark all meeting reminders as read
            $stmt = $conn->prepare("UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0 AND type = 'event_reminder' AND related_type = 'meeting'");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            echo json_encode(['success' => true, 'updated' => $stmt->affected_rows]);
        }
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'trace' => basename($e->getFile()) . ':' . $e->getLine()]);
}
$conn->close();
?>
