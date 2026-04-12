<?php
require_once '../config/database.php';

// Auth: start session, check, then release lock immediately
session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    exit;
}
session_write_close(); // release session lock so other requests aren't blocked

$employee_id = intval($_GET['employee_id'] ?? 0);
if (!$employee_id) { http_response_code(400); exit; }

// ── SSE headers ──────────────────────────────────────────────────────────────
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');   // tell Nginx not to buffer
header('Connection: keep-alive');

// Disable all PHP/server output buffering
@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', false);
while (ob_get_level() > 0) @ob_end_flush();
@ob_implicit_flush(true);

set_time_limit(90); // 90 s then EventSource auto-reconnects

$conn       = getConnection();
$lastContent = null;
$startTime  = time();

// Initial heartbeat so the browser knows the stream opened
echo ": connected\n\n";
flush();

while (!connection_aborted() && (time() - $startTime) < 85) {
    $stmt = $conn->prepare(
        "SELECT content FROM employee_notes WHERE employee_id = ? ORDER BY updated_at DESC LIMIT 1"
    );
    $stmt->bind_param("i", $employee_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $content = $row ? ($row['content'] ?? '') : '';

    if ($content !== $lastContent) {
        $lastContent = $content;
        echo "data: " . json_encode(['content' => $content]) . "\n\n";
        flush();
    }

    usleep(350000); // check every 350 ms
}

$conn->close();
// Empty event tells EventSource to reconnect immediately
echo "data: {\"reconnect\":true}\n\n";
flush();
?>
