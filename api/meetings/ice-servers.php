<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/turn.php';

$userId = requireAuth();

$url = 'https://' . METERED_DOMAIN . '/api/v1/turn/credentials?apiKey=' . METERED_API_KEY;

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response && $httpCode === 200) {
    $servers = json_decode($response, true);
    if (is_array($servers)) {
        echo json_encode(['iceServers' => $servers]);
        exit();
    }
}

echo json_encode(['iceServers' => [['urls' => 'stun:stun.l.google.com:19302']]]);
