<?php

/**
 * Push notifications helper (FCM legacy HTTP).
 * Safe no-op if FIREBASE_SERVER_KEY is missing.
 */

function ensurePushTokensTable(mysqli $conn): void
{
    $conn->query("
        CREATE TABLE IF NOT EXISTS push_notification_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(512) NOT NULL,
            platform VARCHAR(32) NOT NULL DEFAULT 'web',
            user_agent VARCHAR(255) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_push_token (token),
            INDEX idx_push_user_active (user_id, is_active),
            INDEX idx_push_last_seen (last_seen_at)
        )
    ");
}

function registerPushToken(mysqli $conn, int $userId, string $token, string $platform = 'web', string $userAgent = ''): void
{
    ensurePushTokensTable($conn);

    $platform = substr(trim($platform), 0, 32);
    $userAgent = substr(trim($userAgent), 0, 255);

    $stmt = $conn->prepare("
        INSERT INTO push_notification_tokens (user_id, token, platform, user_agent, is_active, last_seen_at)
        VALUES (?, ?, ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            platform = VALUES(platform),
            user_agent = VALUES(user_agent),
            is_active = 1,
            last_seen_at = NOW()
    ");
    $stmt->bind_param("isss", $userId, $token, $platform, $userAgent);
    $stmt->execute();
}

function deactivatePushToken(mysqli $conn, int $userId, ?string $token = null): void
{
    ensurePushTokensTable($conn);

    if ($token !== null && $token !== '') {
        $stmt = $conn->prepare("UPDATE push_notification_tokens SET is_active = 0, updated_at = NOW() WHERE user_id = ? AND token = ?");
        $stmt->bind_param("is", $userId, $token);
        $stmt->execute();
        return;
    }

    $stmt = $conn->prepare("UPDATE push_notification_tokens SET is_active = 0, updated_at = NOW() WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
}

function getPushTokensByUsers(mysqli $conn, array $userIds, int $excludeUserId = 0): array
{
    ensurePushTokensTable($conn);
    $cleanIds = array_values(array_unique(array_filter(array_map('intval', $userIds), static fn($id) => $id > 0)));

    if (empty($cleanIds)) {
        return [];
    }

    if ($excludeUserId > 0) {
        $cleanIds = array_values(array_filter($cleanIds, static fn($id) => $id !== $excludeUserId));
        if (empty($cleanIds)) {
            return [];
        }
    }

    $idsSql = implode(',', $cleanIds);
    $query = "
        SELECT id, user_id, token
        FROM push_notification_tokens
        WHERE is_active = 1
          AND user_id IN ($idsSql)
          AND last_seen_at >= (NOW() - INTERVAL 90 DAY)
    ";
    $result = $conn->query($query);
    if (!$result) {
        return [];
    }
    return $result->fetch_all(MYSQLI_ASSOC) ?: [];
}

function sendPushToUsers(mysqli $conn, array $userIds, string $title, string $body, array $data = [], int $excludeUserId = 0): array
{
    $tokensRows = getPushTokensByUsers($conn, $userIds, $excludeUserId);
    if (empty($tokensRows)) {
        return ['attempted' => 0, 'sent' => 0, 'failed' => 0];
    }

    $serverKey = trim((string)getenv('FIREBASE_SERVER_KEY'));
    if ($serverKey === '') {
        return ['attempted' => count($tokensRows), 'sent' => 0, 'failed' => count($tokensRows)];
    }

    $tokens = [];
    $tokenIdMap = [];
    foreach ($tokensRows as $row) {
        $token = (string)($row['token'] ?? '');
        if ($token === '') continue;
        $tokens[] = $token;
        $tokenIdMap[$token] = intval($row['id'] ?? 0);
    }

    if (empty($tokens)) {
        return ['attempted' => 0, 'sent' => 0, 'failed' => 0];
    }

    $safeData = [];
    foreach ($data as $key => $value) {
        $safeData[(string)$key] = is_scalar($value) ? (string)$value : json_encode($value);
    }
    if (!isset($safeData['click_action'])) {
        $safeData['click_action'] = '/admin/dashboard';
    }

    $attempted = count($tokens);
    $sent = 0;
    $failed = 0;
    $invalidTokenIds = [];

    foreach (array_chunk($tokens, 500) as $chunk) {
        $payload = [
            'registration_ids' => $chunk,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'icon' => '/logo.png',
                'click_action' => $safeData['click_action'],
            ],
            'data' => $safeData,
            'priority' => 'high',
            'content_available' => true,
        ];

        $ch = curl_init('https://fcm.googleapis.com/fcm/send');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: key=' . $serverKey,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));

        $responseBody = curl_exec($ch);
        $httpCode = intval(curl_getinfo($ch, CURLINFO_HTTP_CODE));
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300 || !$responseBody) {
            $failed += count($chunk);
            continue;
        }

        $response = json_decode($responseBody, true);
        $results = is_array($response['results'] ?? null) ? $response['results'] : [];
        if (empty($results)) {
            $failed += count($chunk);
            continue;
        }

        foreach ($results as $index => $resultItem) {
            $token = $chunk[$index] ?? '';
            if (isset($resultItem['message_id'])) {
                $sent += 1;
                continue;
            }

            $failed += 1;
            $error = (string)($resultItem['error'] ?? '');
            if (in_array($error, ['NotRegistered', 'InvalidRegistration', 'MismatchSenderId'], true)) {
                $tokenRowId = intval($tokenIdMap[$token] ?? 0);
                if ($tokenRowId > 0) {
                    $invalidTokenIds[] = $tokenRowId;
                }
            }
        }
    }

    if (!empty($invalidTokenIds)) {
        $ids = implode(',', array_unique(array_map('intval', $invalidTokenIds)));
        $conn->query("UPDATE push_notification_tokens SET is_active = 0 WHERE id IN ($ids)");
    }

    return ['attempted' => $attempted, 'sent' => $sent, 'failed' => $failed];
}

