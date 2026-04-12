<?php
require_once '../config/database.php';

try {
    requireAuth(); // uses same session/token logic as all other endpoints
    session_write_close(); // release session lock so parallel requests are not blocked

    $employee_id = intval($_GET['employee_id'] ?? 0);
    $last_hash   = trim($_GET['last_hash'] ?? '');
    if (!$employee_id) { http_response_code(400); echo json_encode(['error' => 'employee_id required']); exit; }

    $conn    = getConnection();
    $start   = time();
    $maxWait = 25; // seconds — client reconnects after this

    while (time() - $start < $maxWait) {
        $stmt = $conn->prepare(
            "SELECT content FROM employee_notes WHERE employee_id = ? ORDER BY updated_at DESC LIMIT 1"
        );
        $stmt->bind_param("i", $employee_id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $content = $row ? ($row['content'] ?? '') : '';
        $hash    = md5($content);

        if ($hash !== $last_hash) {
            $conn->close();
            echo json_encode(['content' => $content, 'hash' => $hash]);
            exit;
        }

        usleep(50000); // 50 ms between checks
    }

    $conn->close();
    echo json_encode(['timeout' => true]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
