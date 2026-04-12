<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

require_once '../config/database.php';

$userId = requireAuth();
$conn = getConnection();

// GET = read status, POST = update status
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Anyone authenticated can read, but we return the target user's status
    // Get Manuel's user id
    $stmt = $conn->prepare("SELECT id, username, full_name FROM users WHERE LOWER(username) = 'manuel' AND is_active = TRUE");
    $stmt->execute();
    $result = $stmt->get_result();
    $manuel = $result->fetch_assoc();

    if (!$manuel) {
        echo json_encode(['success' => true, 'onsite' => false, 'updated_at' => null]);
        $conn->close();
        exit();
    }

    // Check if onsite_status table exists, create if not
    $conn->query("CREATE TABLE IF NOT EXISTS onsite_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        is_onsite TINYINT(1) DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )");

    $stmt2 = $conn->prepare("SELECT is_onsite, updated_at FROM onsite_status WHERE user_id = ?");
    $stmt2->bind_param("i", $manuel['id']);
    $stmt2->execute();
    $statusResult = $stmt2->get_result();
    $status = $statusResult->fetch_assoc();

    echo json_encode([
        'success' => true,
        'onsite' => $status ? (bool)$status['is_onsite'] : false,
        'updated_at' => $status ? $status['updated_at'] : null,
        'user_id' => $manuel['id'],
        'full_name' => $manuel['full_name']
    ]);

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Only Manuel can update his own status
    $stmt = $conn->prepare("SELECT username FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentUser = $result->fetch_assoc();

    if (!$currentUser || strtolower($currentUser['username']) !== 'manuel') {
        http_response_code(403);
        echo json_encode(['error' => 'Solo Manuel puede actualizar su estado de presencia']);
        $conn->close();
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $isOnsite = isset($data['onsite']) ? ($data['onsite'] ? 1 : 0) : 0;

    // Create table if not exists
    $conn->query("CREATE TABLE IF NOT EXISTS onsite_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        is_onsite TINYINT(1) DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )");

    // Get previous status to detect change
    $stmtPrev = $conn->prepare("SELECT is_onsite FROM onsite_status WHERE user_id = ?");
    $stmtPrev->bind_param("i", $userId);
    $stmtPrev->execute();
    $prevResult = $stmtPrev->get_result();
    $prevStatus = $prevResult->fetch_assoc();
    $wasOnsite = $prevStatus ? (bool)$prevStatus['is_onsite'] : false;

    // Upsert
    $stmt2 = $conn->prepare("INSERT INTO onsite_status (user_id, is_onsite, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE is_onsite = VALUES(is_onsite), updated_at = NOW()");
    $stmt2->bind_param("ii", $userId, $isOnsite);
    $stmt2->execute();

    // Send email to Misael if status changed
    if ($wasOnsite !== (bool)$isOnsite) {
        // Get Misael's email
        $stmtMisael = $conn->prepare("SELECT email FROM users WHERE LOWER(username) = 'misael' AND is_active = TRUE LIMIT 1");
        $stmtMisael->execute();
        $misaelResult = $stmtMisael->get_result();
        $misael = $misaelResult->fetch_assoc();

        if ($misael && !empty($misael['email'])) {
            $subject = "Cambio de estado - Manuel " . ($isOnsite ? "ha llegado" : "se ha ido");
            $message = "Manuel acaba de actualizar su estado de presencia.\n\n";
            $message .= "Estado actual: " . ($isOnsite ? "En el restaurante" : "Fuera del restaurante") . "\n";
            $message .= "Fecha y hora: " . date('d/m/Y H:i', strtotime('now')) . " (hora de Sonora)\n\n";
            $message .= "Puedes ver su estado en el panel administrativo.";
            
            $headers = "From: no-reply@bonifaciossancarlos.com\r\n";
            $headers .= "Reply-To: no-reply@bonifaciossancarlos.com\r\n";
            $headers .= "X-Mailer: PHP/" . phpversion();
            
            @mail($misael['email'], $subject, $message, $headers);
        }
    }

    echo json_encode([
        'success' => true,
        'onsite' => (bool)$isOnsite,
        'updated_at' => date('Y-m-d H:i:s')
    ]);
}

$conn->close();
?>
