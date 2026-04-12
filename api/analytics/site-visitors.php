<?php
require_once '../config/database.php';
$userId = requireAuth();

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

$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = isset($_GET['limit']) ? min(100, max(10, intval($_GET['limit']))) : 50;
$offset = ($page - 1) * $limit;
$date = isset($_GET['date']) ? $conn->real_escape_string($_GET['date']) : null;
$country = isset($_GET['country']) ? $conn->real_escape_string($_GET['country']) : null;
$device = isset($_GET['device']) ? $conn->real_escape_string($_GET['device']) : null;

$where = "1=1";
if ($date) $where .= " AND DATE(visited_at) = '{$date}'";
if ($country) $where .= " AND country = '{$country}'";
if ($device) $where .= " AND device_type = '{$device}'";

// Total count
$totalRow = $conn->query("SELECT COUNT(*) as cnt FROM site_visitors WHERE {$where}")->fetch_assoc();
$total = (int)$totalRow['cnt'];

// Visitors list
$sql = "SELECT id, visitor_id, ip_address, device_type, browser, os, screen_width, screen_height, 
               language, country, city, region, page_url, page_title, referrer, 
               utm_source, utm_medium, utm_campaign, is_new_visitor, visited_at
        FROM site_visitors 
        WHERE {$where}
        ORDER BY visited_at DESC 
        LIMIT {$limit} OFFSET {$offset}";

$result = $conn->query($sql);
$visitors = [];
while ($row = $result->fetch_assoc()) {
    $visitors[] = $row;
}

echo json_encode([
    'success' => true,
    'visitors' => $visitors,
    'total' => $total,
    'page' => $page,
    'pages' => ceil($total / $limit)
]);

$conn->close();
?>
