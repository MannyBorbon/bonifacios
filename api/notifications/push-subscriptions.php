<?php
require_once '../config/database.php';
require_once './push-lib.php';

header('Content-Type: application/json');

$userId = requireAuth();
$conn = getConnection();

try {
    ensurePushTokensTable($conn);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $stmt = $conn->prepare("
            SELECT token, platform, last_seen_at
            FROM push_notification_tokens
            WHERE user_id = ?
              AND is_active = 1
            ORDER BY updated_at DESC
            LIMIT 1
        ");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        echo json_encode([
            'success' => true,
            'enabled' => $row ? true : false,
            'subscription' => $row ?: null,
        ]);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $payload = json_decode(file_get_contents('php://input'), true);
    $action = trim((string)($payload['action'] ?? 'register'));
    $token = trim((string)($payload['token'] ?? ''));
    $platform = trim((string)($payload['platform'] ?? 'web'));
    $userAgent = trim((string)($payload['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? '')));

    if (!in_array($action, ['register', 'unregister'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Acción inválida']);
        exit;
    }

    if ($token === '' || strlen($token) < 20 || strlen($token) > 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'Token inválido']);
        exit;
    }

    if ($action === 'register') {
        registerPushToken($conn, intval($userId), $token, $platform !== '' ? $platform : 'web', $userAgent);
        echo json_encode(['success' => true, 'enabled' => true]);
        exit;
    }

    deactivatePushToken($conn, intval($userId), $token);
    echo json_encode(['success' => true, 'enabled' => false]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

