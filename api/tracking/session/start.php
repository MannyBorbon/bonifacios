<?php
require_once '../../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

// ── Resume mode: re-attach PHP session to an existing tracking session ──────
$resumeId    = isset($data['resumeSessionId']) ? intval($data['resumeSessionId']) : 0;
$resumeToken = $data['resumeToken'] ?? '';

if ($resumeId && $resumeToken) {
    $chk = $conn->prepare("SELECT id FROM user_sessions WHERE id = ? AND user_id = ? AND session_token = ? AND is_active = TRUE");
    $chk->bind_param("iis", $resumeId, $userId, $resumeToken);
    $chk->execute();
    if ($chk->get_result()->num_rows > 0) {
        $_SESSION['tracking_session_id']    = $resumeId;
        $_SESSION['tracking_session_token'] = $resumeToken;
        echo json_encode(['success' => true, 'resumed' => true, 'sessionId' => $resumeId, 'sessionToken' => $resumeToken]);
        $conn->close();
        exit();
    }
    // If session not found/expired, fall through and create a new one
    // (clear stale data on client side via response flag)
}

$sessionToken = bin2hex(random_bytes(32));
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

// Parse user agent for device info
$deviceType = 'desktop';
if (preg_match('/mobile/i', $userAgent)) {
    $deviceType = 'mobile';
} elseif (preg_match('/tablet/i', $userAgent)) {
    $deviceType = 'tablet';
}

// Detect browser
$browser = 'Unknown';
if (preg_match('/Firefox/i', $userAgent)) {
    $browser = 'Firefox';
} elseif (preg_match('/Chrome/i', $userAgent)) {
    $browser = 'Chrome';
} elseif (preg_match('/Safari/i', $userAgent)) {
    $browser = 'Safari';
} elseif (preg_match('/Edge/i', $userAgent)) {
    $browser = 'Edge';
}

// Detect OS
$os = 'Unknown';
if (preg_match('/Windows/i', $userAgent)) {
    $os = 'Windows';
} elseif (preg_match('/Mac/i', $userAgent)) {
    $os = 'macOS';
} elseif (preg_match('/Linux/i', $userAgent)) {
    $os = 'Linux';
} elseif (preg_match('/Android/i', $userAgent)) {
    $os = 'Android';
} elseif (preg_match('/iOS/i', $userAgent)) {
    $os = 'iOS';
}

// Get geolocation from IP
$country = null;
$city = null;

if ($ipAddress && $ipAddress !== '127.0.0.1' && $ipAddress !== '::1') {
    try {
        $geoUrl = "http://ip-api.com/json/{$ipAddress}?fields=status,country,city";
        $ctx = stream_context_create(['http' => ['timeout' => 3]]);
        $geoData = @file_get_contents($geoUrl, false, $ctx);
        
        if ($geoData) {
            $geo = json_decode($geoData, true);
            if ($geo && $geo['status'] === 'success') {
                $country = $geo['country'] ?? null;
                $city = $geo['city'] ?? null;
            }
        }
    } catch (Exception $e) {
        // Silently fail if geolocation doesn't work
        error_log("Geolocation error: " . $e->getMessage());
    }
}

// Close any previously open sessions for this user before starting a new one
$closeOld = $conn->prepare("UPDATE user_sessions SET is_active = FALSE, ended_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()) WHERE user_id = ? AND is_active = TRUE AND ended_at IS NULL");
$closeOld->bind_param("i", $userId);
$closeOld->execute();

$sql = "INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, device_type, browser, os, country, city, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("issssssss", $userId, $sessionToken, $ipAddress, $userAgent, $deviceType, $browser, $os, $country, $city);

if ($stmt->execute()) {
    $sessionId = $conn->insert_id;
    $_SESSION['tracking_session_id'] = $sessionId;
    $_SESSION['tracking_session_token'] = $sessionToken;
    
    echo json_encode([
        'success' => true,
        'sessionId' => $sessionId,
        'sessionToken' => $sessionToken
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to start session']);
}

$conn->close();
?>
