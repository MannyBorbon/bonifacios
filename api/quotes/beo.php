<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    requireAuth();
    $conn = getConnection();

    if ($method === 'GET') {
        $quoteId = isset($_GET['quote_id']) ? intval($_GET['quote_id']) : 0;
        if (!$quoteId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'quote_id required']);
            $conn->close();
            exit;
        }
        $stmt = $conn->prepare('SELECT * FROM quote_beo WHERE quote_id = ?');
        $stmt->bind_param('i', $quoteId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if ($row && $row['beo_data']) {
            $row['beo_data'] = json_decode($row['beo_data'], true);
        }
        echo json_encode(['success' => true, 'beo' => $row]);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            $data = [];
        }
        $quoteId = intval($data['quote_id'] ?? 0);
        if (!$quoteId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'quote_id required']);
            $conn->close();
            exit;
        }
        $folio = $data['folio'] ?? "BEO-$quoteId";
        $beoData = json_encode($data['beo_data'] ?? []);

        $check = $conn->prepare('SELECT id FROM quote_beo WHERE quote_id = ?');
        $check->bind_param('i', $quoteId);
        $check->execute();
        $exists = $check->get_result()->num_rows > 0;

        if ($exists) {
            $stmt = $conn->prepare('UPDATE quote_beo SET folio = ?, beo_data = ?, updated_at = NOW() WHERE quote_id = ?');
            $stmt->bind_param('ssi', $folio, $beoData, $quoteId);
        } else {
            $stmt = $conn->prepare('INSERT INTO quote_beo (quote_id, folio, beo_data) VALUES (?, ?, ?)');
            $stmt->bind_param('iss', $quoteId, $folio, $beoData);
        }
        $stmt->execute();
        echo json_encode(['success' => true, 'folio' => $folio]);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        $conn->close();
        exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
