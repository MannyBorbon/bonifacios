<?php
require_once '../config/database.php';
// NO requireAuth() — this is a PUBLIC endpoint

$conn = getConnection();

// Auto-create table
$conn->query("CREATE TABLE IF NOT EXISTS site_visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(20) DEFAULT 'desktop',
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_width INT,
    screen_height INT,
    language VARCHAR(10),
    country VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    page_url VARCHAR(500),
    page_title VARCHAR(255),
    referrer VARCHAR(500),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    is_new_visitor BOOLEAN DEFAULT TRUE,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_visitor_id (visitor_id),
    INDEX idx_visited_at (visited_at),
    INDEX idx_page_url (page_url(191))
)");

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'No data']);
    exit();
}

$visitorId   = $conn->real_escape_string($data['visitorId'] ?? '');
$pageUrl     = $conn->real_escape_string($data['pageUrl'] ?? '');
$pageTitle   = $conn->real_escape_string($data['pageTitle'] ?? '');
$referrer    = $conn->real_escape_string($data['referrer'] ?? '');
$deviceType  = $conn->real_escape_string($data['deviceType'] ?? 'desktop');
$browser     = $conn->real_escape_string($data['browser'] ?? '');
$os          = $conn->real_escape_string($data['os'] ?? '');
$screenW     = intval($data['screenWidth'] ?? 0);
$screenH     = intval($data['screenHeight'] ?? 0);
$language    = $conn->real_escape_string($data['language'] ?? '');
$utmSource   = $conn->real_escape_string($data['utmSource'] ?? '');
$utmMedium   = $conn->real_escape_string($data['utmMedium'] ?? '');
$utmCampaign = $conn->real_escape_string($data['utmCampaign'] ?? '');

// Get IP
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
if (strpos($ip, ',') !== false) $ip = trim(explode(',', $ip)[0]);

// Check if this visitor_id has visited before
$checkStmt = $conn->prepare("SELECT COUNT(*) as cnt FROM site_visitors WHERE visitor_id = ?");
$checkStmt->bind_param("s", $visitorId);
$checkStmt->execute();
$isNew = $checkStmt->get_result()->fetch_assoc()['cnt'] == 0;

// Geolocation via free API (cached per IP for performance)
$country = '';
$city = '';
$region = '';
if ($ip && $ip !== '127.0.0.1' && $ip !== '::1') {
    // Check if we already have geo data for this IP recently
    $geoStmt = $conn->prepare("SELECT country, city, region FROM site_visitors WHERE ip_address = ? AND country != '' ORDER BY id DESC LIMIT 1");
    $geoStmt->bind_param("s", $ip);
    $geoStmt->execute();
    $geoRow = $geoStmt->get_result()->fetch_assoc();
    if ($geoRow) {
        $country = $geoRow['country'];
        $city = $geoRow['city'];
        $region = $geoRow['region'];
    } else {
        // Fetch from free geo API
        $geoJson = @file_get_contents("http://ip-api.com/json/{$ip}?fields=country,city,regionName");
        if ($geoJson) {
            $geo = json_decode($geoJson, true);
            $country = $geo['country'] ?? '';
            $city = $geo['city'] ?? '';
            $region = $geo['regionName'] ?? '';
        }
    }
}

$sql = "INSERT INTO site_visitors 
    (visitor_id, ip_address, user_agent, device_type, browser, os, screen_width, screen_height, language, country, city, region, page_url, page_title, referrer, utm_source, utm_medium, utm_campaign, is_new_visitor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isNewInt = $isNew ? 1 : 0;

$stmt = $conn->prepare($sql);
$stmt->bind_param("ssssssiissssssssssi",
    $visitorId, $ip, $ua, $deviceType, $browser, $os,
    $screenW, $screenH, $language, $country, $city, $region,
    $pageUrl, $pageTitle, $referrer, $utmSource, $utmMedium, $utmCampaign, $isNewInt
);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to track visit']);
}

$conn->close();
?>
