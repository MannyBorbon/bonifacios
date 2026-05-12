<?php
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();
$conn = getConnection();

$conn->query("
    CREATE TABLE IF NOT EXISTS meeting_webrtc_signals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        from_user_id INT NOT NULL,
        to_user_id INT NOT NULL,
        signal_type ENUM('offer','answer','ice') NOT NULL,
        payload LONGTEXT NOT NULL,
        is_consumed TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_webrtc_to (meeting_id, to_user_id, is_consumed),
        INDEX idx_webrtc_cleanup (created_at)
    )
");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $meetingId = intval($_GET['meeting_id'] ?? 0);
    if (!$meetingId) {
        http_response_code(400);
        echo json_encode(['error' => 'meeting_id required']);
        exit();
    }

    $stmt = $conn->prepare("
        SELECT id, from_user_id, signal_type, payload
        FROM meeting_webrtc_signals
        WHERE meeting_id = ? AND to_user_id = ? AND is_consumed = 0
        ORDER BY id ASC
    ");
    $stmt->bind_param('ii', $meetingId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $signals = [];
    $ids = [];
    while ($row = $result->fetch_assoc()) {
        $signals[] = $row;
        $ids[] = (int)$row['id'];
    }

    if (!empty($ids)) {
        $idList = implode(',', $ids);
        $conn->query("UPDATE meeting_webrtc_signals SET is_consumed = 1 WHERE id IN ($idList)");
    }

    echo json_encode(['signals' => $signals]);

} elseif ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $body['action'] ?? 'signal';

    if ($action === 'cleanup') {
        $meetingId = intval($body['meeting_id'] ?? 0);
        if ($meetingId) {
            $conn->query("DELETE FROM meeting_webrtc_signals WHERE meeting_id = $meetingId AND created_at < NOW() - INTERVAL 10 MINUTE");
        }
        echo json_encode(['ok' => true]);
    } else {
        $meetingId  = intval($body['meeting_id'] ?? 0);
        $toUserId   = intval($body['to_user_id'] ?? 0);
        $signalType = $body['signal_type'] ?? '';
        $payload    = $body['payload'] ?? '';

        if (!$meetingId || !$toUserId || !in_array($signalType, ['offer','answer','ice']) || !$payload) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid parameters']);
            exit();
        }

        $stmt = $conn->prepare("
            INSERT INTO meeting_webrtc_signals (meeting_id, from_user_id, to_user_id, signal_type, payload)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('iiiss', $meetingId, $userId, $toUserId, $signalType, $payload);
        $stmt->execute();
        echo json_encode(['ok' => true, 'id' => $conn->insert_id]);
    }
}

$conn->close();
