<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$days = isset($_GET['days']) ? intval($_GET['days']) : 30;

// Create table if not exists
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

// Total visitors
$total = $conn->query("SELECT COUNT(*) as cnt FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)")->fetch_assoc()['cnt'];

// Unique visitors
$unique = $conn->query("SELECT COUNT(DISTINCT visitor_id) as cnt FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)")->fetch_assoc()['cnt'];

// New visitors
$newV = $conn->query("SELECT COUNT(*) as cnt FROM site_visitors WHERE is_new_visitor = 1 AND visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)")->fetch_assoc()['cnt'];

// Today's visitors
$today = $conn->query("SELECT COUNT(*) as cnt FROM site_visitors WHERE DATE(visited_at) = CURDATE()")->fetch_assoc()['cnt'];
$todayUnique = $conn->query("SELECT COUNT(DISTINCT visitor_id) as cnt FROM site_visitors WHERE DATE(visited_at) = CURDATE()")->fetch_assoc()['cnt'];

// Currently active (last 5 min)
$active = $conn->query("SELECT COUNT(DISTINCT visitor_id) as cnt FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)")->fetch_assoc()['cnt'];

// Top pages
$topPages = [];
$pRes = $conn->query("SELECT page_url, COUNT(*) as views FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY) GROUP BY page_url ORDER BY views DESC LIMIT 10");
while ($r = $pRes->fetch_assoc()) $topPages[] = $r;

// Top countries
$topCountries = [];
$cRes = $conn->query("SELECT country, COUNT(*) as visits FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY) AND country != '' GROUP BY country ORDER BY visits DESC LIMIT 10");
while ($r = $cRes->fetch_assoc()) $topCountries[] = $r;

// Top cities
$topCities = [];
$ciRes = $conn->query("SELECT city, region, country, COUNT(*) as visits FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY) AND city != '' GROUP BY city, region, country ORDER BY visits DESC LIMIT 10");
while ($r = $ciRes->fetch_assoc()) $topCities[] = $r;

// Device breakdown
$devices = [];
$dRes = $conn->query("SELECT device_type, COUNT(*) as cnt FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY) GROUP BY device_type ORDER BY cnt DESC");
while ($r = $dRes->fetch_assoc()) $devices[] = $r;

// Browser breakdown
$browsers = [];
$bRes = $conn->query("SELECT browser, COUNT(*) as cnt FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY) GROUP BY browser ORDER BY cnt DESC LIMIT 8");
while ($r = $bRes->fetch_assoc()) $browsers[] = $r;

// OS breakdown
$osList = [];
$oRes = $conn->query("SELECT os, COUNT(*) as cnt FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY) GROUP BY os ORDER BY cnt DESC LIMIT 8");
while ($r = $oRes->fetch_assoc()) $osList[] = $r;

// Daily visits chart (last N days)
$dailyChart = [];
$chRes = $conn->query("
    SELECT DATE(visited_at) as day, 
           COUNT(*) as page_views,
           COUNT(DISTINCT visitor_id) as unique_visitors
    FROM site_visitors 
    WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
    GROUP BY DATE(visited_at) 
    ORDER BY day ASC
");
while ($r = $chRes->fetch_assoc()) $dailyChart[] = $r;

// Referrers
$referrers = [];
$rRes = $conn->query("SELECT referrer, COUNT(*) as cnt FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY) AND referrer != '' AND referrer NOT LIKE '%bonifaciossancarlos%' GROUP BY referrer ORDER BY cnt DESC LIMIT 10");
while ($r = $rRes->fetch_assoc()) $referrers[] = $r;

echo json_encode([
    'success' => true,
    'stats' => [
        'total_views' => (int)$total,
        'unique_visitors' => (int)$unique,
        'new_visitors' => (int)$newV,
        'today_views' => (int)$today,
        'today_unique' => (int)$todayUnique,
        'active_now' => (int)$active
    ],
    'top_pages' => $topPages,
    'top_countries' => $topCountries,
    'top_cities' => $topCities,
    'devices' => $devices,
    'browsers' => $browsers,
    'os_list' => $osList,
    'daily_chart' => $dailyChart,
    'referrers' => $referrers
]);

$conn->close();
?>
